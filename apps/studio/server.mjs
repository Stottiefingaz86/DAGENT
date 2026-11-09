// Design Studio — dashboard + design agent worker.
//   npm start        → http://localhost:4100
// Runs the Claude design agent. Needs ANTHROPIC_API_KEY (paste it on first launch, or put it in apps/studio/.env).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Store, STAGES, STATUSES } from './lib/store.mjs'
import { createOrchestrator } from './lib/orchestrator.mjs'
import { createClaudeRunner } from './lib/claude-runner.mjs'
import { watchInbox } from './lib/inbox.mjs'
import { createLane } from './lib/lane.mjs'
import { createAuth } from './lib/auth.mjs'
import { createTaste } from './lib/taste.mjs'
import { createComments } from './lib/comments.mjs'
import { renderAnnotated } from './lib/capture.mjs'
import { createNotify } from './lib/notify.mjs'
import { createTeam } from './lib/team.mjs'
import crypto from 'node:crypto'
import * as P from './lib/prompts.mjs'
import { execFile } from 'node:child_process'

const here = path.dirname(fileURLToPath(import.meta.url))
// If the studio's code changes while it runs, the page shows "Restart the studio" (new code only loads on restart).
const BOOTED = Date.now()
// A small log next to the studio (git-ignored) so problems can be diagnosed without the Terminal window.
const studioLog = (line) => {
  try {
    fs.appendFileSync(path.join(here, 'studio.log'), `${new Date().toISOString()} ${line}\n`)
  } catch {}
}
studioLog('studio started')
const codeChanged = () => {
  try {
    return [path.join(here, 'server.mjs'), ...fs.readdirSync(path.join(here, 'lib')).map((f) => path.join(here, 'lib', f))].some((f) => fs.statSync(f).mtimeMs > BOOTED)
  } catch {
    return false
  }
}

// --- env (.env next to this file; no dependency) ---
for (const f of [path.join(here, '.env'), path.join(here, '.env.local')]) {
  if (!fs.existsSync(f)) continue
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const REPO_ROOT = path.resolve(process.env.STUDIO_REPO_ROOT || path.join(here, '..', '..'))
const PORT = Number(process.env.STUDIO_PORT || 4100)
// Only this computer can open the studio unless STUDIO_HOST=0.0.0.0 is set (then everyone still needs a login).
const HOST = process.env.STUDIO_HOST || '127.0.0.1'
const SECURE_COOKIE = process.env.STUDIO_SECURE_COOKIE === '1'
const connected = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim())
const INTAKE_TOKEN = process.env.STUDIO_INTAKE_TOKEN || ''
const LINKS = {
  demo: process.env.STUDIO_DEMO_SITE_URL || 'https://design-request-app-one.vercel.app/',
  lumen: process.env.STUDIO_LUMEN_URL || 'https://design-request-app-one.vercel.app/lumen',
  figma: process.env.STUDIO_FIGMA_URL || 'https://www.figma.com/design/vCPe93hNKDWWcpu49Vo0kU',
  prototypeOrigin: process.env.STUDIO_PROTOTYPE_ORIGIN || 'http://127.0.0.1:3001',
  designAgentFile: 'https://www.figma.com/design/' + (process.env.STUDIO_FIGMA_FILE || 'MYeELetKW9xye1shSpm8Fn'),
  research: process.env.STUDIO_RESEARCH_URL || 'https://www.figma.com/files/1304356510223900444/folder/653184570',
  repo: process.env.STUDIO_REPO_URL || 'https://github.com/Stottiefingaz86/DAGENT',
}

const store = new Store(REPO_ROOT)
// Chat notifications (Slack / Mattermost / Teams / webhook). STUDIO_PUBLIC_URL = the address people open (for links in messages).
const notify = createNotify({ dir: here, publicUrl: () => (process.env.STUDIO_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '') })
store.on('change', (msg) => {
  try {
    if (msg.type === 'notify') notify.send(msg.status === 'error' ? 'error' : 'needs_you', { slug: msg.slug, title: msg.title, text: msg.gate })
    if (msg.type === 'event' && msg.event?.text) {
      const t = msg.event.text
      const job = store.get(msg.slug)
      if (/^Dev handoff package ready/.test(t)) notify.send('handover', { slug: msg.slug, title: job?.title, text: 'Handover ready for dev.' })
      if (/^Dev question needs design/.test(t)) notify.send('dev_question', { slug: msg.slug, title: job?.title, text: t.replace(/^Dev question needs design:\s*/, 'Dev asked: ') })
    }
  } catch {}
})
const auth = createAuth(here)
const taste = createTaste(REPO_ROOT)
const comments = createComments(store)
// Live presence: who is looking at which screenshot, and where their cursor is (memory only, never stored).
const PALETTE = ['#ff2d95', '#38bdf8', '#a78bfa', '#4ade80', '#fbbf24', '#fb7185', '#2dd4bf', '#f97316']
// Each person keeps one colour: by the order they were added (so a small team never shares a colour).
const colorFor = (id) => {
  const i = auth.list().findIndex((u) => u.id === id)
  return PALETTE[(i >= 0 ? i : parseInt(crypto.createHash('md5').update(String(id)).digest('hex').slice(0, 6), 16)) % PALETTE.length]
}
const broadcast = (msg) => store.emit('change', msg)
// Team: roles, invites, assignment, the in-app inbox, @mentions, who's online.
const team = createTeam(here, { auth, broadcast })
auth.setPolicy(() => team.settings())
// Who gets told about a project: the people on it (or the Admins when nobody is assigned yet).
const peopleOn = (job) => {
  const ids = [...new Set([...(job.assignees || []), job.createdById].filter(Boolean))]
  return ids.length ? ids : auth.raw().filter((u) => u.role === 'owner').map((u) => u.id)
}
const admins = () => auth.raw().filter((u) => u.role === 'owner').map((u) => u.id)
const signerIds = (job) => team.signers(job).map((u) => u.id)
// @mentions in any feedback: notify the people named (they also get added to the project so they can open it).
function mentionNotify(slug, text, user, where) {
  const job = store.get(slug)
  if (!job) return []
  const hit = team.mentioned(text).filter((u) => u.id !== user.id)
  const fresh = hit.filter((u) => !team.canSee(u, job)).map((u) => u.id)
  if (fresh.length) store.update(slug, { assignees: [...new Set([...(job.assignees || []), ...fresh])] })
  team.notify(hit.map((u) => u.id), { type: 'mention', slug, title: job.title, text: `${user.name} mentioned you ${where}: “${String(text).slice(0, 200)}”`, by: user.name, byId: user.id })
  return hit.map((u) => u.id)
}
store.on('change', (msg) => {
  try {
    if (msg.type === 'notify') {
      const job = store.get(msg.slug)
      if (!job) return
      if (msg.status === 'direction') team.notify(signerIds(job), { type: 'direction', slug: msg.slug, title: job.title, text: 'Direction is ready for your approval.' })
      else if (msg.status !== 'awaiting_signoff') team.notify(peopleOn(job), { type: 'gate', slug: msg.slug, title: job.title, text: msg.gate })
    }
    if (msg.type === 'event' && msg.event?.text) {
      const job = store.get(msg.slug)
      const t = msg.event.text
      if (/^Dev handoff package ready/.test(t)) team.notify([...peopleOn(job), ...admins()], { type: 'handover', slug: msg.slug, title: job?.title, text: 'Handover is ready for dev.' })
      if (/^Dev question needs design/.test(t)) team.notify([...peopleOn(job), ...admins()], { type: 'dev_question', slug: msg.slug, title: job?.title, text: t.replace(/^Dev question needs design:\s*/, 'Dev asked: ') })
    }
  } catch {}
})
// The studio runs the prototype lane itself (apps/live-site on :3001).
const lane = createLane({ repoRoot: REPO_ROOT, origin: LINKS.prototypeOrigin, onChange: (st) => store.emit('change', { type: 'lane', lane: st }) })
const claude = createClaudeRunner({ store, repoRoot: REPO_ROOT, model: process.env.STUDIO_MODEL, siteOrigin: LINKS.prototypeOrigin, lane, taste })
// No key → no run. Never a stand-in agent.
async function runner(slug, prompt, signal) {
  if (!connected()) throw new Error('The design agent isn’t connected. Add your Anthropic API key on the studio home screen, then Retry.')
  // Belt and braces: even a queued run stops here if setup is incomplete.
  const nr = notReady()
  if (nr) throw new Error(nr.error)
  return claude(slug, prompt, signal)
}
const orch = createOrchestrator({ store, runner, taste })

// API keys live in apps/studio/.env.keys (git-ignored by the repo's .env.* rule).
// Several keys can be stored (e.g. Personal, Business); one is active.
const KEYS_FILE = path.join(here, '.env.keys')
const readKeys = () => {
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'))
  } catch {
    return { active: null, keys: [] }
  }
}
const writeKeys = (k) => fs.writeFileSync(KEYS_FILE, JSON.stringify(k, null, 2), { mode: 0o600 })
function applyActiveKey() {
  const k = readKeys()
  const a = k.keys.find((x) => x.id === k.active)
  if (a) process.env.ANTHROPIC_API_KEY = a.key
  else if (k.keys.length === 0 && process.env.ANTHROPIC_API_KEY) {
    // first launch with a key already in .env: adopt it as "Default"
    writeKeys({ active: 'default', keys: [{ id: 'default', label: 'Default', key: process.env.ANTHROPIC_API_KEY.trim(), addedAt: new Date().toISOString() }] })
  } else if (!a) delete process.env.ANTHROPIC_API_KEY
}
applyActiveKey()
const KEY_RE = /^sk-ant-[A-Za-z0-9_\-]{20,}$/
const publicKeys = () => {
  const k = readKeys()
  return { active: k.active, keys: k.keys.map(({ key, ...rest }) => ({ ...rest, hint: `${key.slice(0, 10)}…${key.slice(-4)}` })) }
}
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)

// Jobs left mid-run by a restart go back to the humans.
for (const j of store.list()) {
  if (j.running || j.status === 'working') {
    store.update(j.slug, { running: false, status: 'error' })
    store.event(j.slug, 'system', 'The studio restarted while the agent was working. Retry to continue.')
  }
}


// --- Lumen watch: re-check the design system on start and every 6 hours ---
let lumen = { checkedAt: null, changed: false, latest: '', latestDate: '' }
function readLumenLog() {
  try {
    const log = fs.readFileSync(path.join(REPO_ROOT, 'knowledge', 'lumen', 'CHANGELOG.md'), 'utf8')
    const entry = (log.split(/\n(?=## )/)[1] || '').trim()
    return { latest: entry.slice(0, 1200), latestDate: /^## (\d{4}-\d{2}-\d{2})/.exec(entry)?.[1] || '', baseline: /· baseline/.test(entry.split('\n')[0]) }
  } catch {
    return { latest: '', latestDate: '', baseline: true }
  }
}
function lumenWatch() {
  execFile(process.execPath, [path.join(REPO_ROOT, 'scripts', 'lumen-watch.mjs'), '--json'], { cwd: REPO_ROOT, timeout: 120000 }, (err, out) => {
    let summary = null
    try {
      summary = JSON.parse(String(out).trim().split('\n').pop())
    } catch {}
    lumen = { checkedAt: new Date().toISOString(), changed: !!summary?.changed, error: err && !summary ? String(err.message).slice(0, 200) : null, ...readLumenLog() }
    if (summary?.changed) {
      console.log('  Lumen changed — recorded in knowledge/lumen/CHANGELOG.md')
      store.emit('change', { type: 'lumen', lumen })
    }
  })
}
lumenWatch()
setInterval(lumenWatch, 6 * 3600e3).unref()

// Research: the competitor/market research Figma folder (knowledge/product-strategy/RESEARCH_SOURCES.md).
// scripts/research-watch.mjs lists it with FIGMA_TOKEN and records new/updated files in knowledge/research/CHANGELOG.md.
let research = { checkedAt: null, changed: false, error: null, files: 0 }
// The Figma research token is pasted in Settings and kept on this computer only (git-ignored, owner-read only).
const FIGMA_TOKEN_FILE = path.join(here, '.studio-figma-token')
try {
  if (!process.env.FIGMA_TOKEN && fs.existsSync(FIGMA_TOKEN_FILE)) process.env.FIGMA_TOKEN = fs.readFileSync(FIGMA_TOKEN_FILE, 'utf8').trim()
} catch {}
function researchWatch(done) {
  execFile(process.execPath, [path.join(REPO_ROOT, 'scripts', 'research-watch.mjs'), '--json'], { cwd: REPO_ROOT, timeout: 120000, env: process.env }, (err, out) => {
    let summary = null
    try {
      summary = JSON.parse(String(out).trim().split('\n').pop())
    } catch {}
    research = { checkedAt: new Date().toISOString(), changed: !!summary?.changed, files: summary?.files || 0, updated: summary?.updated || [], error: summary?.error || (err && !summary ? String(err.message).slice(0, 200) : null) }
    if (summary?.changed) store.emit('change', { type: 'research', research })
    if (typeof afterCheck === 'function' && tools) afterCheck()
    store.emit('change', { type: 'research', research })
    if (typeof done === 'function') done()
  })
}
researchWatch()
setInterval(researchWatch, 6 * 3600e3).unref()

// ---- Setup gate (Chris, Nov 2026): nothing runs until the full setup is in place. ----
// Required by default: Anthropic key, Figma + Mobbin connected to the agent, the Figma research token, and Chrome.
// STUDIO_SETUP_REQUIRED (comma list) can change the list on a machine where the team agreed to; leave it unset normally.
const REQUIRED = (process.env.STUDIO_SETUP_REQUIRED || 'apiKey,figma,mobbin,research,chrome').split(',').map((x) => x.trim()).filter(Boolean)
let tools = { figma: { connected: null, detail: '' }, mobbin: { connected: null, detail: '' }, checkedAt: null }
let figmaStatus = tools.figma // kept for the handover card
const chromeFound = () =>
  !!(process.env.STUDIO_CHROME_PATH ? fs.existsSync(process.env.STUDIO_CHROME_PATH) : ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].some((p) => fs.existsSync(p)))
function claudeCli() {
  const sdkDir = path.join(here, 'node_modules', '@anthropic-ai')
  try {
    const d = fs.readdirSync(sdkDir).find((n) => n.startsWith('claude-agent-sdk-') && fs.existsSync(path.join(sdkDir, n, 'claude')))
    return d ? path.join(sdkDir, d, 'claude') : ''
  } catch {
    return ''
  }
}
function toolsCheck() {
  return new Promise((resolve) => {
    const cli = claudeCli()
    if (!cli) {
      tools = { figma: { connected: false, detail: 'Claude Code program not found (run Setup).' }, mobbin: { connected: false, detail: 'Claude Code program not found (run Setup).' }, checkedAt: new Date().toISOString() }
      figmaStatus = tools.figma
      return resolve(tools)
    }
    execFile(cli, ['mcp', 'list'], { cwd: REPO_ROOT, timeout: 90000, env: process.env }, (err, out) => {
      const lines = String(out || '').split('\n')
      const one = (name) => {
        const line = lines.find((l) => new RegExp(`^\\s*${name}\\b`, 'i').test(l)) || ''
        return { connected: /✓|connected/i.test(line) && !/✗|failed|needs auth|not connected/i.test(line), detail: line.trim() || `${name} not added — run Connect Tools.command.` }
      }
      tools = { figma: one('figma'), mobbin: one('mobbin'), checkedAt: new Date().toISOString() }
      figmaStatus = tools.figma
      resolve(tools)
    })
  })
}
function setupState() {
  const items = {
    apiKey: { ok: connected(), label: 'Anthropic API key', how: 'Settings → API keys' },
    figma: { ok: tools.figma.connected === true, label: 'Figma connected to the agent', how: 'Run Connect Tools.command (Figma → Authenticate), then Check again', detail: tools.figma.detail },
    mobbin: { ok: tools.mobbin.connected === true, label: 'Mobbin connected to the agent', how: 'Run Connect Tools.command (Mobbin → Authenticate; needs a paid Mobbin plan), then Check again', detail: tools.mobbin.detail },
    research: { ok: !!process.env.FIGMA_TOKEN && !research.error && !!research.checkedAt, label: 'Figma research folder', how: 'Settings → Figma research folder (read-only token)', detail: research.error || '' },
    chrome: { ok: chromeFound(), label: 'Google Chrome (screenshots)', how: 'Install Google Chrome on this machine, or set STUDIO_CHROME_PATH' },
  }
  const missing = REQUIRED.filter((k) => items[k] && !items[k].ok)
  return { ready: missing.length === 0, missing, required: REQUIRED, items, checkedAt: tools.checkedAt }
}
const pendingStarts = new Set() // BRDs that arrived before setup was finished
let wasReady = false
let firstCheck = true // don't announce the state the studio boots in
function afterCheck() {
  const st = setupState()
  if (st.ready !== wasReady && tools.checkedAt && !firstCheck) notify.send('setup', { text: st.ready ? 'Setup complete: the design agent is on.' : `Setup broke: ${st.missing.map((k) => st.items[k].label).join(', ')}. The agent is off until it's fixed.` })
  if (st.ready && !wasReady) {
    console.log('  Setup complete — the design agent is enabled.')
    lane.ensure()
    for (const slug of pendingStarts) {
      store.event(slug, 'system', 'Setup finished — starting.')
      orch.start(slug)
    }
    pendingStarts.clear()
  }
  wasReady = st.ready
  if (tools.checkedAt) firstCheck = false
  store.emit('change', { type: 'setup', setup: st })
}
// Re-check by itself: every 15 seconds while setup is incomplete (so items turn green on their own once you finish
// a sign-in), every 30 minutes once everything works (so an expired sign-in switches the agent off again).
let checking = false
let lastCheck = 0
async function autoCheck() {
  if (checking) return
  const ready = setupState().ready
  if (ready && Date.now() - lastCheck < 30 * 60e3) return
  checking = true
  try {
    await toolsCheck()
    // A failing research check is retried every 2 minutes (not every 15 seconds, to stay under Figma's rate limit).
    if (!ready && process.env.FIGMA_TOKEN && research.error && Date.now() - (Date.parse(research.checkedAt) || 0) > 120e3) researchWatch()
    afterCheck()
  } finally {
    lastCheck = Date.now()
    checking = false
  }
}
autoCheck()
setInterval(autoCheck, 15e3).unref()
const notReady = () => {
  const st = setupState()
  return st.ready ? null : { error: `Setup isn’t finished: ${st.missing.map((k) => st.items[k].label).join(', ')}. Nothing runs until it is.`, setup: st }
}

watchInbox({
  store,
  repoRoot: REPO_ROOT,
  onJob: (slug) => {
    if (notReady()) {
      pendingStarts.add(slug)
      store.event(slug, 'system', 'Waiting for setup to finish before the agent starts.')
    } else orch.start(slug)
  },
})

// ---- Taste tidy, on the fly (Chris, Nov 2026: "should be doing this on the fly") ----
// After every 6 newly learned rules (or 10 new feedback-log entries), the agent tidies the taste notes by itself:
// merges duplicates, resolves conflicts, promotes feedback into the per-surface Do/Don't tables.
const TIDY_FILE = path.join(here, '.studio-tidy.json')
const tidyState = () => {
  try {
    return JSON.parse(fs.readFileSync(TIDY_FILE, 'utf8'))
  } catch {
    return { at: null, rules: 0, entries: 0 }
  }
}
const logEntries = () => {
  try {
    return (fs.readFileSync(path.join(REPO_ROOT, 'knowledge', 'chris-taste', 'FEEDBACK_LOG.md'), 'utf8').match(/^### /gm) || []).length
  } catch {
    return 0
  }
}
function autoTidy() {
  try {
    const st = tidyState()
    const rules = taste.rules().filter((r) => r.status !== 'undone').length
    const entries = logEntries()
    if (st.at === null) return fs.writeFileSync(TIDY_FILE, JSON.stringify({ at: new Date().toISOString(), rules, entries })) // first run: baseline
    if (rules - st.rules < 6 && entries - st.entries < 10) return
    if (notReady() || store.list().some((j) => j.source === 'maintenance' && /Tidy taste/.test(j.title) && orch.isRunning(j.slug))) return
    const job = store.create({ title: `Tidy taste notes (auto) · ${new Date().toISOString().slice(0, 10)}`, surface: 'Maintenance', brief: 'Automatic tidy after new feedback', source: 'maintenance', requester: 'Studio' })
    orch.run(job.slug, P.tidyTastePrompt(store.get(job.slug)))
    fs.writeFileSync(TIDY_FILE, JSON.stringify({ at: new Date().toISOString(), rules, entries }))
    studioLog(`auto tidy started (${rules - st.rules} new rules, ${entries - st.entries} new log entries)`)
  } catch (e) {
    studioLog(`auto tidy skipped: ${e.message}`)
  }
}
setInterval(autoTidy, 5 * 60e3).unref()
setTimeout(autoTidy, 60e3).unref()

// --- live updates (Server-Sent Events) ---
const clients = new Set()
store.on('change', (msg) => {
  const data = `data: ${JSON.stringify(msg)}\n\n`
  for (const res of clients) res.write(data)
})
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n')
}, 20000)

// --- helpers ---
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(type === 'application/json' ? JSON.stringify(body) : body)
}
const readJson = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 60 * 1024 * 1024) reject(new Error('Upload too large (60 MB max)'))
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch (e) {
        reject(e)
      }
    })
  })
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' }
function serveFile(res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found' })
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  fs.createReadStream(file).pipe(res)
}
// Only these repo folders are readable from the browser.
const PUBLIC_ROOTS = ['specs', 'tokens', 'apps/live-site/public', 'inbox', 'knowledge', '.claude/skills', '.specify']
function saveUploads(slug, files = [], sub = 'attachments') {
  const saved = []
  for (const f of files) {
    if (!f?.data) continue
    const safe = String(f.name || 'file').replace(/[^\w.\-]+/g, '_').slice(0, 80)
    const isBrdPdf = sub === 'attachments' && /\.pdf$/i.test(safe) && !fs.existsSync(path.join(store.dir(slug), 'brd.pdf'))
    const rel = isBrdPdf ? 'brd.pdf' : `${sub}/${Date.now().toString(36)}-${safe}`
    saved.push(store.saveFile(slug, rel, Buffer.from(f.data, 'base64')))
  }
  return saved
}
// What the agent reads: skills, taste notes, strategy, research.
function listKnowledge() {
  const groups = [
    ['Playbook', '.claude/skills/design-agent', /SKILL\.md$/],
    ['Build & taste rules', '.claude/skills/lumen-build', /\.md$/],
    ['SpecKit', '.claude/skills', /speckit-[\w-]+\/SKILL\.md$/],
    ['Figma', '.claude/skills', /figma-[\w-]+\/SKILL\.md$/],
    ['Research', '.claude/skills/mobbin', /SKILL\.md$/],
    ['Chris taste', 'knowledge/chris-taste', /\.md$/],
    ['Lumen', 'knowledge/lumen', /\.md$/],
    ['Strategy & research', 'knowledge/product-strategy', /\.(md|pdf)$/],
    ['Rules', '.specify/memory', /\.md$/],
  ]
  const walk = (dir, depth = 0) => {
    if (!fs.existsSync(dir) || depth > 3) return []
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name), depth + 1) : [path.join(dir, d.name)]))
  }
  return groups.map(([name, rel, re]) => ({
    name,
    items: walk(path.join(REPO_ROOT, rel))
      .map((f) => path.relative(REPO_ROOT, f))
      .filter((f) => re.test(f))
      .map((f) => {
        let title = path.basename(f)
        if (f.endsWith('.md')) {
          const txt = fs.readFileSync(path.join(REPO_ROOT, f), 'utf8')
          title = /^name:\s*"?([^"\n]+)/m.exec(txt)?.[1] || /^#\s+(.+)$/m.exec(txt)?.[1] || title
        }
        return { path: f, title }
      }),
  }))
}
// Who is asking comes from their login session, never from the browser.
const role = (req) => (req.user?.role === 'owner' ? 'owner' : 'requester')
const who = (req) => req.user?.name || 'Unknown'
const ip = (req) => req.socket.remoteAddress || ''
// A request from another website (CSRF) has a foreign Origin; refuse it.
const sameOrigin = (req) => !req.headers.origin || req.headers.origin === `http://${req.headers.host}` || req.headers.origin === `https://${req.headers.host}`

// Delete a project: stop its agent, then move its folder to .studio-trash/ (git-ignored) so it can be recovered.
async function deleteJob(slug) {
  orch.stop(slug)
  for (let i = 0; i < 50 && orch.isRunning(slug); i++) await new Promise((r) => setTimeout(r, 100))
  const trash = path.join(REPO_ROOT, '.studio-trash', `${new Date().toISOString().replace(/[:.]/g, '-')}-${slug}`)
  fs.mkdirSync(path.dirname(trash), { recursive: true })
  fs.renameSync(store.dir(slug), trash)
  store.emit('change', { type: 'deleted', slug })
  return path.relative(REPO_ROOT, trash)
}

// --- Activity: one timeline built from each project's events + comments, and the audit log ---
function buildActivity() {
  const jobs = store.list().filter((j) => !['maintenance', 'recommendation'].includes(j.source))
  const name = (id) => auth.raw().find((u) => u.id === id)?.name
  const items = []
  const brds = []
  const classify = (e) => {
    const k = e.data?.kind
    const t = e.text || ''
    if (k === 'answers') return ['answers', 'Answered the agent’s questions']
    if (k === 'approve') return ['approval', 'Approved direction']
    if (k === 'changes') return ['feedback', 'Asked for changes']
    if (k === 'reaction') return ['feedback', t.startsWith('👍') ? 'Liked' : 'Disliked']
    if (k === 'signoff') return ['approval', 'Final sign-off']
    if (k === 'dev-questions') return ['dev', 'Dev questions']
    if (t === 'Requested sign-off.') return ['approval', 'Requested sign-off']
    if (t === 'Back to refine.') return ['approval', 'Sent back to refine']
    if (t === 'Build the screens in Figma.') return ['work', 'Asked for Figma screens']
    if (t.startsWith('Team:')) return ['team', 'Assigned people']
    if (t.startsWith('Pinned comments on the screenshots')) return ['comment', 'Sent comments to the agent']
    return ['feedback', 'Feedback']
  }
  for (const j of jobs) {
    const ev = store.events(j.slug)
    const human = ev.filter((e) => e.who === 'human' && e.data?.by)
    const from = j.createdById ? name(j.createdById) || j.requester : j.requester && j.requester !== 'Chris' ? j.requester : String(j.source || '').replace(/^api · /, '')
    items.push({ at: j.createdAt, by: from || 'Inbox', type: 'brd', label: 'BRD received', text: `${j.title}${j.surface && j.surface !== 'Other' ? ` · ${j.surface}` : ''} · via ${j.source}`, slug: j.slug, title: j.title, stage: 'intake' })
    for (const e of human) {
      const [type, label] = classify(e)
      items.push({ at: e.t, by: e.data.by, type, label, text: type === 'comment' ? e.text.replace(/^Pinned comments[^\n]*\n\n/, '') : e.text.replace(/^Team:\s*/, ''), slug: j.slug, title: j.title, stage: e.data.stage, round: e.data.round, shots: e.data.shots?.length || 0 })
    }
    const cs = comments.list(j.slug)
    for (const c of cs) {
      items.push({ at: c.at, by: c.by, type: 'comment', label: `Commented #${c.n}`, text: c.text, slug: j.slug, title: j.title, image: c.image })
      for (const r of c.replies) items.push({ at: r.at, by: r.by, type: 'comment', label: `Replied on #${c.n}`, text: r.text, slug: j.slug, title: j.title, image: c.image })
    }
    const fb = human.filter((e) => !['team', 'answers'].includes(classify(e)[0]))
    const last = [...fb, ...cs.map((c) => ({ t: c.at, text: c.text, data: { by: c.by } }))].sort((a, b) => (a.t < b.t ? 1 : -1))[0]
    brds.push({
      slug: j.slug, title: j.title, surface: j.surface, source: j.source, from: from || 'Inbox', receivedAt: j.createdAt, status: j.status, stage: j.stage, round: j.round || 0,
      designers: (j.assignees || []).map(name).filter(Boolean),
      feedbackCount: fb.length + cs.length, lastFeedback: last ? { at: last.t, by: last.data.by, text: String(last.text).slice(0, 200) } : null,
      signedOffBy: j.signedOffBy || null, signedOffAt: j.signedOffAt || null, updatedAt: j.updatedAt,
    })
  }
  for (const a of team.auditList()) items.push({ at: a.at, by: a.by, type: a.type === 'signin' || a.type === 'signout' || a.type === 'signin_failed' || a.type === 'joined' ? 'access' : 'admin', label: { signin: 'Signed in', signout: 'Signed out', signin_failed: 'Failed sign-in', joined: 'Joined the studio', access: 'Team change', security: 'Security change' }[a.type] || a.type, text: a.text, ip: a.ip })
  items.sort((a, b) => (a.at < b.at ? 1 : -1))
  brds.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
  return { items: items.slice(0, 3000), brds, people: [...new Set(items.map((i) => i.by))].sort() }
}

// --- routes ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  if (req.method === 'POST' && p !== '/api/presence') studioLog(`POST ${p}`)
  try {
    req.user = auth.userFor(req)
    if (req.user) team.touch(req.user)
    if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) return send(res, 403, { error: 'Cross-site request refused.' })

    // ---- login ----
    if (p === '/api/auth/me') return send(res, 200, { setup: auth.needsSetup(), user: auth.publicUser(req.user), local: isLocal(req) })
    if (p === '/api/auth/setup' && req.method === 'POST') {
      if (!isLocal(req)) return send(res, 403, { error: 'Set up the studio on the computer that runs it.' })
      return send(res, 200, { user: auth.setup(res, await readJson(req), SECURE_COOKIE) })
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      const body = await readJson(req)
      try {
        const u = auth.login(req, res, body, ip(req), SECURE_COOKIE)
        team.audit(u, 'signin', 'With username and password', { ip: ip(req) })
        return send(res, 200, { user: u })
      } catch (e) {
        team.audit({ name: String(body.username || 'unknown').slice(0, 60) }, 'signin_failed', e.code === 429 ? 'Sign-in locked after too many attempts' : 'Failed sign-in (wrong username or password)', { ip: ip(req) })
        return send(res, e.code || 400, { error: e.message })
      }
    }
    // ---- Invite links: an Admin creates one in Team; the person opens it and makes their own account ----
    if (p === '/api/auth/invite') {
      if (req.method === 'GET') {
        const inv = team.findInvite(url.searchParams.get('t'))
        return inv ? send(res, 200, { ok: true, role: inv.role, name: inv.name, by: inv.by }) : send(res, 404, { error: 'This invite link has expired or was already used. Ask an Admin for a new one.' })
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'GET or POST' })
      const b = await readJson(req)
      try {
        if (!team.findInvite(b.token)) throw new Error('This invite link has expired or was already used. Ask an Admin for a new one.')
        const inv = team.findInvite(b.token)
        if (!team.domainOk(b.username)) throw new Error(`Use your work email (${team.settings().allowedDomains.map((d) => '@' + d).join(' or ')}).`)
        const u = auth.join(res, { name: b.name || inv.name, username: b.username, password: b.password }, inv.role, SECURE_COOKIE)
        team.useInvite(b.token)
        team.audit(u, 'joined', `Joined from an invite by ${inv.by} as ${{ owner: 'Admin', lead: 'Lead', viewer: 'Viewer' }[u.role] || 'Designer'}`, { ip: ip(req) })
        for (const slug of inv.projects) {
          const job = store.get(slug)
          if (job) store.update(slug, { assignees: [...new Set([...(job.assignees || []), u.id])] })
        }
        team.notify(admins(), { type: 'joined', text: `${u.name} joined the studio as ${{ owner: 'Admin', lead: 'Lead', viewer: 'Viewer' }[u.role] || 'Designer'}.`, by: u.name, byId: u.id })
        broadcast({ type: 'team' })
        return send(res, 200, { user: u })
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
    }
    if (p === '/api/auth/logout' && req.method === 'POST') {
      if (req.user) team.audit(req.user, 'signout', '', { ip: ip(req) })
      auth.logout(req, res)
      return send(res, 200, { ok: true })
    }
    // ---- Talk to the agent from chat: Mattermost outgoing webhook / Slack slash command / any JSON POST ----
    // Message format: "<project> <your message>"  ·  "list" shows what needs you.  Token: the one on Settings → Notifications.
    if (p === '/api/notify/inbound' && req.method === 'POST') {
      const raw = await new Promise((ok) => {
        let b = ''
        req.on('data', (c) => (b += c).length > 1e5 && req.destroy())
        req.on('end', () => ok(b))
      })
      let body = {}
      try {
        body = /json/.test(req.headers['content-type'] || '') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw))
      } catch {}
      const token = body.token || url.searchParams.get('token') || (req.headers.authorization || '').replace(/^Bearer /, '')
      if (!notify.tokenOk(token)) return send(res, 401, { text: 'Wrong token. Copy it from Studio → Settings → Notifications.' })
      const reply = (text) => send(res, 200, { text, response_type: 'ephemeral' })
      let text = String(body.text || '').trim()
      if (body.trigger_word) text = text.slice(String(body.trigger_word).length).trim()
      const who = String(body.user_name || body.user || 'chat').slice(0, 40)
      const jobs = store.list().filter((j) => !['maintenance', 'recommendation'].includes(j.source))
      if (!text || /^(list|help)$/i.test(text)) {
        const open = jobs.filter((j) => STATUSES[j.status]?.gate)
        return reply(`${open.length ? open.map((j) => `• ${j.slug} — ${j.title}: ${STATUSES[j.status].gate}`).join('\n') : 'Nothing needs you right now.'}\nReply with: <project> <message>`)
      }
      const [ref, ...rest] = text.split(/\s+/)
      const msgText = rest.join(' ').trim()
      const r = ref.toLowerCase()
      const job = jobs.find((j) => j.slug === r) || jobs.find((j) => j.slug.startsWith(r)) || jobs.find((j) => j.title.toLowerCase().includes(r))
      if (!job) return reply(`I couldn't find a project called "${ref}". Send "list" to see them.`)
      if (!msgText) return reply(`${job.title}: ${STATUSES[job.status]?.label || job.status}. Add a message after the project name to send feedback.`)
      const nr = notReady()
      if (nr) return reply(nr.error)
      orch.message(job.slug, `${msgText}\n\n(from ${who} in chat)`, [], who)
      return reply(`Sent to ${job.title}. The agent picks it up now.`)
    }
    // ---- Dev agents (other repos): handover download + design questions. Intake token, or a signed-in person, or this computer. ----
    const dv = /^\/api\/jobs\/([a-z0-9-]+)\/(dev-questions|handover|handover\.tar\.gz)$/.exec(p)
    if (dv) {
      const okDev = (req.user && (!store.get(dv[1]) || team.canSee(req.user, store.get(dv[1])))) || (INTAKE_TOKEN ? req.headers.authorization === `Bearer ${INTAKE_TOKEN}` : isLocal(req))
      if (!okDev) return send(res, 401, { error: 'Bad or missing token (set STUDIO_INTAKE_TOKEN and send it as Bearer).' })
      const [, slug, what] = dv
      const job = store.get(slug)
      if (!job) return send(res, 404, { error: 'No such project' })
      const hdir = path.join(store.dir(slug), 'handover')
      if (what === 'dev-questions') {
        if (req.method === 'GET') return send(res, 200, (job.devQuestions || []).map(({ id, text, status, answer, source, askedAt, answeredAt }) => ({ id, text, status, answer, source, askedAt, answeredAt })))
        if (req.method !== 'POST') return send(res, 405, { error: 'GET or POST' })
        if (!connected()) return send(res, 503, { error: 'The design agent is not connected right now.' })
        { const nr = notReady(); if (nr) return send(res, 423, nr) }
        const b = await readJson(req)
        const qs = (Array.isArray(b.questions) ? b.questions : [b.question || b.text]).filter(Boolean).slice(0, 20)
        if (!qs.length) return send(res, 400, { error: 'Send { "from": "dev-repo", "questions": [{ "text": "…", "context": "…" }] }' })
        const made = orch.devQuestions(slug, qs, String(b.from || req.user?.name || 'dev').slice(0, 60))
        return send(res, 202, { ids: made.map((q) => q.id), poll: `/api/jobs/${slug}/dev-questions` })
      }
      if (!fs.existsSync(hdir)) return send(res, 404, { error: 'No handover yet — it is written after Final sign-off.' })
      if (what === 'handover') {
        let manifest = null
        try { manifest = JSON.parse(fs.readFileSync(path.join(hdir, 'manifest.json'), 'utf8')) } catch {}
        const files = fs.readdirSync(hdir, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(hdir, f)).isFile())
        return send(res, 200, { slug, title: job.title, status: job.status, prototype: job.previewUrl || null, figma: job.figma || null, manifest, files: files.map((f) => `specs/${slug}/handover/${f}`), download: `/api/jobs/${slug}/handover.tar.gz` })
      }
      // The whole package: spec + handover (+ the prototype's source files listed in the manifest).
      res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${slug}-handover.tar.gz"` })
      const parts = ['handover', 'spec.md', 'brd.md', 'feedback.md'].filter((f) => fs.existsSync(path.join(store.dir(slug), f)))
      const proto = path.join(REPO_ROOT, 'apps', 'live-site', 'app', 'prototype', slug)
      const tar = (await import('node:child_process')).spawn('tar', ['-czf', '-', '-C', store.dir(slug), ...parts, ...(fs.existsSync(proto) ? ['-C', path.join(REPO_ROOT, 'apps', 'live-site', 'app', 'prototype'), slug] : [])])
      tar.stdout.pipe(res)
      tar.on('error', () => res.end())
      return
    }
    // Everything else needs a login (BRDs from other repos use the intake token instead).
    const isApi = p.startsWith('/api/') && p !== '/api/intake' && p !== '/api/notify/inbound'
    const publicAsset = p === '/files/apps/live-site/public/shell/design-agent/logo-mark.png' // sign-in screen logo
    if ((isApi || (p.startsWith('/files/') && !publicAsset)) && !req.user) return send(res, 401, { error: 'Sign in to the studio.', signin: true })

    // ---- Notifications settings (Owner) ----
    if (p === '/api/notify') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can change notifications.' })
      if (req.method === 'POST') {
        const b = await readJson(req)
        try {
          if (b.action === 'add') notify.add(b)
          else if (b.action === 'remove') notify.remove(String(b.id))
          else if (b.action === 'events') notify.setEvents(String(b.id), b.events || [])
          else if (b.action === 'rotate') notify.rotateToken()
          else if (b.action === 'test') {
            const r = await notify.test(String(b.id))
            if (!r.ok) return send(res, 400, { error: `The channel answered ${r.status}. Check the webhook URL.`, ...notify.public() })
          }
        } catch (e) {
          return send(res, 400, { error: e.message })
        }
      }
      return send(res, 200, { ...notify.public(), inboundUrl: `${(process.env.STUDIO_PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '')}/api/notify/inbound` })
    }
    // ---- Setup helpers: do the step for the Owner where the machine allows it ----
    if (p === '/api/setup/run' && req.method === 'POST') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can run setup steps.' })
      const b = await readJson(req)
      if (b.item === 'tools') {
        // Opens Connect Tools.command in Terminal on the Mac that runs the studio (only when you're on that Mac).
        if (process.platform !== 'darwin' || !isLocal(req)) return send(res, 400, { error: 'Open a terminal on the machine that runs the studio and run "Connect Tools.command" (see docs/SETUP.md).' })
        execFile('open', ['-a', 'Terminal', path.join(REPO_ROOT, 'Connect Tools.command')], () => {})
        return send(res, 200, { ok: true, message: 'Terminal opened with Connect Tools. Follow the steps there, then click Check again.' })
      }
      return send(res, 400, { error: 'Unknown setup step' })
    }
    // ---- Setup status (everyone) and re-check (Owner) ----
    if (p === '/api/setup') {
      if (req.method === 'POST') {
        if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can run the check.' })
        await toolsCheck()
        researchWatch()
        await new Promise((r) => setTimeout(r, 4000))
        afterCheck()
      }
      return send(res, 200, setupState())
    }
    // ---- people (Settings · Owner only) ----
    if (p.startsWith('/api/users')) {
      if (req.method === 'GET') return send(res, 200, auth.list())
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can manage people.' })
      const body = await readJson(req)
      try {
        if (p === '/api/users') auth.addUser(body)
        else if (p === '/api/users/remove') auth.removeUser(body.id, req.user.id)
        else if (p === '/api/users/password') auth.setPassword(body.id, body.password)
        else if (p === '/api/users/role') auth.setRole(body.id, body.role, req.user.id)
        else if (p === '/api/users/signoff') {
          auth.setSignoff(body.id, body.on, body.until)
          const u = auth.raw().find((x) => x.id === body.id)
          team.notify([body.id], { type: 'assigned', text: body.on ? `${req.user.name} gave you sign-off rights${u?.signoffUntil ? ` until ${new Date(u.signoffUntil).toLocaleDateString('en-GB')}` : ''}. You can approve directions and give Final sign-off on your projects.` : `${req.user.name} removed your sign-off rights.`, by: req.user.name, byId: req.user.id })
        } else if (p === '/api/users/away') auth.setAway(body.id, body.until)
        else if (p === '/api/users/signout') {
          if (body.id === req.user.id) throw new Error('Use Sign out in your account menu.')
          auth.signOutUser(body.id)
        }
        else return send(res, 404, { error: 'Unknown action' })
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
      {
        const target = auth.raw().find((u) => u.id === body.id)?.name || body.name || 'someone'
        const what = {
          '/api/users': `Added ${body.name || body.username} as ${body.role || 'designer'}`,
          '/api/users/remove': `Removed ${target}`,
          '/api/users/password': `Reset ${target}’s password`,
          '/api/users/role': `Changed ${target}’s role to ${{ owner: 'Admin', lead: 'Lead', viewer: 'Viewer' }[body.role] || 'Designer'}`,
          '/api/users/signoff': body.on ? `Gave ${target} sign-off rights${body.until ? ` until ${body.until}` : ''}` : `Removed ${target}’s sign-off rights`,
          '/api/users/away': `Set ${target} away`,
          '/api/users/signout': `Signed ${target} out of all devices`,
        }[p]
        if (what) team.audit(req.user, 'access', what, { ip: ip(req) })
      }
      broadcast({ type: 'team' })
      return send(res, 200, auth.list())
    }
    // ---- Team: members, who's online, assignments, invites, activity ----
    if (p === '/api/me/name' && req.method === 'POST') {
      try {
        auth.setName(req.user.id, (await readJson(req)).name)
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
      broadcast({ type: 'team' })
      return send(res, 200, { user: auth.publicUser(auth.raw().find((u) => u.id === req.user.id)) })
    }
    if (p === '/api/security/signout-all' && req.method === 'POST') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Admin can do that.' })
      auth.signOutAllExcept(req)
      team.audit(req.user, 'security', 'Signed everyone out', { ip: ip(req) })
      return send(res, 200, { ok: true })
    }
    if (p === '/api/me/away' && req.method === 'POST') {
      auth.setAway(req.user.id, (await readJson(req)).until || null)
      broadcast({ type: 'team' })
      return send(res, 200, { ok: true })
    }
    if (p === '/api/team' && req.method === 'GET') {
      const jobs = store.list().filter((j) => !['maintenance', 'recommendation'].includes(j.source) && team.canSee(req.user, j))
      const members = auth.raw().map((u) => {
        const mine = jobs.filter((j) => team.assigned(u, j))
        const w = team.where(u.id)
        const at = w?.slug && jobs.find((j) => j.slug === w.slug)
        return { ...u, ...(role(req) === 'owner' ? { sessions: auth.sessionCount(u.id) } : {}), online: team.onlineNow(u.id), lastSeen: team.lastSeen(u.id), color: colorFor(u.id), signoffNow: team.signoffActive(u), where: team.onlineNow(u.id) ? (at ? { slug: at.slug, title: at.title } : w?.view ? { view: w.view } : null) : null, projects: mine.map((j) => ({ slug: j.slug, title: j.title, status: j.status })) }
      })
      // Recent activity across the projects you can see (people only, not the agent's steps).
      const activity = jobs
        .flatMap((j) => store.events(j.slug).filter((e) => e.who === 'human' && e.data?.by).slice(-12).map((e) => ({ at: e.t, by: e.data.by, text: e.text.slice(0, 160), slug: j.slug, title: j.title })))
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 30)
      const waiting = jobs.filter((j) => j.status === 'awaiting_signoff' || j.status === 'direction').map((j) => ({ slug: j.slug, title: j.title, status: j.status, since: j.signoffRequestedAt || j.updatedAt, by: j.signoffRequestedBy || null, signers: team.signers(j).map((u) => u.name) }))
      const admin = role(req) === 'owner'
      return send(res, 200, { members, activity, waiting, settings: team.settings(), access: { host: HOST === '127.0.0.1' ? 'local' : 'network', secureCookie: SECURE_COOKIE, publicUrl: process.env.STUDIO_PUBLIC_URL || null }, ...(admin ? { invites: team.invites(), projects: jobs.map((j) => ({ slug: j.slug, title: j.title, assignees: j.assignees || [], status: j.status })) } : {}) })
    }
    if (p === '/api/team/settings' && req.method === 'POST') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Admin can change team settings.' })
      const ch = await readJson(req)
      team.setSettings(ch)
      team.audit(req.user, 'security', `Changed settings: ${Object.entries(ch).map(([k, v]) => `${k} = ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')}`, { ip: ip(req) })
      broadcast({ type: 'team' })
      return send(res, 200, team.settings())
    }
    if (p === '/api/invites') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Admin can invite people.' })
      const b = req.method === 'POST' ? await readJson(req) : {}
      if (b.action === 'revoke') team.revokeInvite(String(b.id)), team.audit(req.user, 'access', 'Revoked an invite link', { ip: ip(req) })
      else if (req.method === 'POST') {
        const made = team.createInvite(b, req.user)
        team.audit(req.user, 'access', `Created an invite link for ${b.name || 'someone'} as ${{ owner: 'Admin', lead: 'Lead', viewer: 'Viewer' }[made.invite.role] || 'Designer'}`, { ip: ip(req) })
        return send(res, 200, made)
      }
      return send(res, 200, team.invites())
    }
    // ---- Activity (Admin): BRDs in, who's working on what, every piece of feedback with timestamps ----
    if (p === '/api/activity') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Admin can see activity.' })
      const A = buildActivity()
      if (url.searchParams.get('format') === 'csv') {
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const rows = [['Date', 'Person', 'Event', 'Details', 'Project', 'Stage', 'Round', 'IP'], ...A.items.map((e) => [e.at, e.by, e.label, e.text, e.title || '', e.stage || '', e.round ?? '', e.ip || ''])]
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="studio-activity-${new Date().toISOString().slice(0, 10)}.csv"` })
        return res.end(rows.map((r) => r.map(q).join(',')).join('\n'))
      }
      return send(res, 200, A)
    }
    // ---- In-app notifications (the bell) ----
    if (p === '/api/inbox') {
      if (req.method === 'POST') {
        const b = await readJson(req)
        team.markRead(req.user.id, b.all ? 'all' : (b.ids || []).map(String))
      }
      const box = team.inboxFor(req.user.id)
      const seen = new Map(store.list().map((j) => [j.slug, j]))
      box.items = box.items.filter((n) => !n.slug || (seen.get(n.slug) && team.canSee(req.user, seen.get(n.slug))))
      box.unread = box.items.filter((n) => !n.read).length
      return send(res, 200, box)
    }
    if (p === '/api/me/password' && req.method === 'POST') {
      try {
        auth.setPassword(req.user.id, (await readJson(req)).password)
        return send(res, 200, { ok: true, signin: true })
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
    }
    if (p === '/api/config') {
      return send(res, 200, { connected: connected(), stages: STAGES, statuses: STATUSES, links: LINKS, lane: lane.status(), lumen, research, figma: figmaStatus, restartNeeded: codeChanged(), setup: { ...setupState(), figmaToken: !!process.env.FIGMA_TOKEN, people: auth.list().length }, me: req.user ? { ...auth.raw().find((u) => u.id === req.user.id), color: colorFor(req.user.id), signoffNow: team.signoffActive(auth.raw().find((u) => u.id === req.user.id)) } : null, online: team.presence(), repoRoot: REPO_ROOT, model: process.env.STUDIO_MODEL || 'default' })
    }
    if (p === '/api/lane') {
      if (req.method === 'POST') lane.ensure()
      return send(res, 200, lane.status())
    }
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write('retry: 2000\n\n')
      clients.add(res)
      team.tab(req.user, 1)
      req.on('close', () => (clients.delete(res), team.tab(req.user, -1)))
      return
    }
    // ---- API keys (Settings) — this computer only, Owner only for changes ----
    if (p.startsWith('/api/keys')) {
      if (!isLocal(req)) return send(res, 403, { error: 'Keys can only be managed on the computer running the studio.' })
      if (req.method === 'GET') return send(res, 200, publicKeys())
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only the Owner can change keys.' })
      const body = await readJson(req)
      const k = readKeys()
      if (p === '/api/keys') {
        const key = String(body.key || '').trim()
        if (!KEY_RE.test(key)) return send(res, 400, { error: 'That doesn’t look like an Anthropic API key (it starts with sk-ant-).' })
        const label = String(body.label || '').trim().slice(0, 40) || (k.keys.length ? `Key ${k.keys.length + 1}` : 'Default')
        const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
        k.keys.push({ id, label, key, addedAt: new Date().toISOString() })
        if (!k.active || body.makeActive !== false) k.active = id
      } else if (p === '/api/keys/activate') {
        if (!k.keys.some((x) => x.id === body.id)) return send(res, 404, { error: 'No such key' })
        k.active = body.id
      } else if (p === '/api/keys/remove') {
        k.keys = k.keys.filter((x) => x.id !== body.id)
        if (k.active === body.id) k.active = k.keys[0]?.id || null
      } else return send(res, 404, { error: 'Unknown action' })
      writeKeys(k)
      applyActiveKey()
      return send(res, 200, { ...publicKeys(), connected: connected() })
    }
    // ---- Taste: what the agent has learned (Owner keeps or undoes) ----
    if (p === '/api/taste' && req.method === 'GET') {
      return send(res, 200, { rules: taste.rules().reverse(), signals: taste.signals({ limit: 80 }) })
    }
    if (p === '/api/taste/review' && req.method === 'POST') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can keep or undo learned rules.' })
      const body = await readJson(req)
      try {
        taste.review(String(body.id || ''), body.action, who(req))
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
      return send(res, 200, { rules: taste.rules().reverse() })
    }
    // ---- Figma research token (Settings · Owner) ----
    if (p === '/api/figma-token') {
      if (req.method === 'GET') return send(res, 200, { set: !!process.env.FIGMA_TOKEN, hint: process.env.FIGMA_TOKEN ? `figd_…${process.env.FIGMA_TOKEN.slice(-4)}` : '', research })
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can change the Figma token.' })
      const b = await readJson(req)
      const t = String(b.token || '').trim().replace(/^['"]|['"]$/g, '').replace(/\s+/g, '')
      if (b.remove) {
        delete process.env.FIGMA_TOKEN
        try { fs.unlinkSync(FIGMA_TOKEN_FILE) } catch {}
        return send(res, 200, { set: false })
      }
      if (!/^figd_[\w-]{20,}$/.test(t)) return send(res, 400, { error: 'That doesn’t look like a Figma personal access token (it starts with figd_).' })
      fs.writeFileSync(FIGMA_TOKEN_FILE, t, { mode: 0o600 })
      process.env.FIGMA_TOKEN = t
      studioLog(`figma token saved (…${t.slice(-4)}), checking research folder`)
      // Answer at once; the folder check result arrives a few seconds later (the page updates by itself).
      research = { ...research, checkedAt: null, error: null }
      researchWatch(() => studioLog(`research check: ${research.error || `${research.files} files`}`))
      return send(res, 200, { set: true, hint: `figd_…${t.slice(-4)}`, research, checking: true })
    }
    // ---- Recommendations: the agent looks for gaps against the strategy (Owner starts a run) ----
    if (p === '/api/recommend' && req.method === 'POST') {
      { const nr = notReady(); if (nr) return send(res, 423, nr) }
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can start a recommendations run.' })
      if (!connected()) return send(res, 400, { error: 'Connect the design agent first (Settings → API keys).' })
      const b = await readJson(req)
      const job = store.create({ title: `Recommendations · ${new Date().toISOString().slice(0, 10)}`, surface: 'Recommendations', brief: String(b.focus || 'Find gaps against the product strategy'), source: 'recommendation', requester: who(req) })
      // Earlier dismissals travel into the new run, so the agent doesn't re-propose them.
      const dismissedIdeas = store.list().filter((j) => j.source === 'recommendation').flatMap((j) => (j.ideas || []).filter((i) => i.dismissed).map((i) => ({ title: i.title, reason: i.dismissed.reason })))
      store.update(job.slug, { dismissedIdeas })
      orch.run(job.slug, P.recommendPrompt(store.get(job.slug), String(b.focus || '').slice(0, 1000)))
      return send(res, 201, store.get(job.slug))
    }
    if (p === '/api/ideas' && req.method === 'GET') {
      const runs = store.list().filter((j) => j.source === 'recommendation')
      return send(res, 200, runs.map((j) => ({ slug: j.slug, title: j.title, status: j.status, running: orch.isRunning(j.slug), brief: j.brief, at: j.updatedAt, ideas: j.ideas || [] })))
    }
    // Dismiss / restore an idea, or give feedback on it (optionally asking the agent to revise it).
    if ((p === '/api/ideas/dismiss' || p === '/api/ideas/feedback') && req.method === 'POST') {
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can do that.' })
      const b = await readJson(req)
      const run = store.get(String(b.slug || ''))
      const idea = run?.ideas?.find((i) => i.id === b.id)
      if (!idea) return send(res, 404, { error: 'No such idea' })
      const text = String(b.text || b.reason || '').trim().slice(0, 2000)
      if (p === '/api/ideas/dismiss') {
        const undo = !!b.undo
        store.update(run.slug, (j) => ({ ideas: j.ideas.map((i) => (i.id === idea.id ? { ...i, dismissed: undo ? null : { by: who(req), at: new Date().toISOString(), reason: text } } : i)) }))
        if (!undo) {
          taste.signal({ kind: 'dislike', project: run.slug, title: idea.title, text: `Dismissed idea “${idea.title}”${text ? `: ${text}` : ''}`, by: who(req), target: 'proposal' })
          store.appendFeedback(run.slug, (run.round || 0) + 1, `[Dismissed idea: ${idea.title}]${text ? ` ${text}` : ''}`, [])
          store.update(run.slug, (j) => ({ round: (j.round || 0) + 1 }))
        }
        return send(res, 200, { ok: true })
      }
      if (!text && !b.value) return send(res, 400, { error: 'Write your feedback first.' })
      if (b.revise) {
        const nr = notReady()
        if (nr) return send(res, 423, nr)
      }
      const fb = { by: who(req), at: new Date().toISOString(), text, value: b.value === 'like' ? 'like' : b.value === 'dislike' ? 'dislike' : null, revise: !!b.revise }
      store.update(run.slug, (j) => ({ round: (j.round || 0) + 1, ideas: j.ideas.map((i) => (i.id === idea.id ? { ...i, feedback: [...(i.feedback || []), fb] } : i)) }))
      store.appendFeedback(run.slug, store.get(run.slug).round, `[Idea: ${idea.title}]${fb.value ? ` ${fb.value === 'like' ? '👍' : '👎'}` : ''} ${text}`, [])
      taste.signal({ kind: fb.value || 'change', project: run.slug, title: idea.title, text: `Idea “${idea.title}”: ${text}`, by: who(req), target: 'proposal' })
      store.event(run.slug, 'human', `Feedback on “${idea.title}”${fb.value ? ` ${fb.value === 'like' ? '👍' : '👎'}` : ''}: ${text}`, { by: who(req) })
      if (b.revise) orch.run(run.slug, P.reviseIdeaPrompt(store.get(run.slug), idea, text))
      return send(res, 200, { ok: true, revising: !!b.revise })
    }
    if (p === '/api/ideas/promote' && req.method === 'POST') {
      { const nr = notReady(); if (nr) return send(res, 423, nr) }
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can turn an idea into a project.' })
      const b = await readJson(req)
      const run = store.get(String(b.slug || ''))
      const idea = run?.ideas?.find((i) => i.id === b.id)
      if (!idea) return send(res, 404, { error: 'No such idea' })
      const ideaFile = path.join(REPO_ROOT, path.normalize(String(idea.file || '')).replace(/^(\.\.(\/|\\|$))+/, ''))
      const text = ideaFile.startsWith(REPO_ROOT + path.sep) && fs.existsSync(ideaFile) ? fs.readFileSync(ideaFile, 'utf8') : `${idea.title}\n\n${idea.summary}`
      const job = store.create({ title: idea.title, surface: 'From recommendation', brief: `Recommendation from ${run.slug} (${idea.file}).\n\n${text}`, source: 'recommendation-idea', requester: who(req) })
      store.update(run.slug, (j) => ({ ideas: j.ideas.map((i) => (i.id === idea.id ? { ...i, project: job.slug } : i)) }))
      orch.start(job.slug)
      return send(res, 201, store.get(job.slug))
    }
    // ---- Maintenance jobs the agent runs (Owner) ----
    if (p.startsWith('/api/maintenance/') && req.method === 'POST') {
      { const nr = notReady(); if (nr) return send(res, 423, nr) }
      if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can start maintenance.' })
      if (!connected()) return send(res, 400, { error: 'Connect the design agent first (Settings → API keys).' })
      const kind = p.split('/').pop()
      const spec = { 'lumen-figma': ['Lumen check in Figma', P.lumenFigmaPrompt], 'tidy-taste': ['Tidy taste notes', P.tidyTastePrompt] }[kind]
      if (!spec) return send(res, 404, { error: 'Unknown maintenance job' })
      const job = store.create({ title: `${spec[0]} · ${new Date().toISOString().slice(0, 10)}`, surface: 'Maintenance', brief: spec[0], source: 'maintenance', requester: who(req) })
      orch.run(job.slug, spec[1](store.get(job.slug)))
      return send(res, 201, store.get(job.slug))
    }
    // ---- Live cursors on screenshots ----
    if (p === '/api/presence' && req.method === 'POST') {
      const b = await readJson(req)
      if (b.where) {
        team.touch(req.user, { slug: b.where.slug ? String(b.where.slug).slice(0, 80) : null, view: String(b.where.view || '').slice(0, 20) })
        return send(res, 200, { ok: true })
      }
      broadcast({ type: 'cursor', slug: String(b.slug || ''), image: String(b.image || ''), x: Number(b.x), y: Number(b.y), leave: !!b.leave, user: { id: req.user.id, name: req.user.name, color: colorFor(req.user.id) } })
      return send(res, 200, { ok: true })
    }
    // ---- Pinned comments on screenshots ----
    const cm = /^\/api\/jobs\/([a-z0-9-]+)\/comments(?:\/(reply|resolve|delete|send))?$/.exec(p)
    if (cm) {
      const [, slug, op] = cm
      const cjob = store.get(slug)
      if (!cjob || !team.canSee(req.user, cjob)) return send(res, 404, { error: 'No such job' })
      if (req.method === 'GET') return send(res, 200, comments.list(slug).map((c) => ({ ...c, color: colorFor(c.byId) })))
      const b = await readJson(req)
      try {
        if (!op) {
          const c = comments.add(slug, b, req.user)
          const named = mentionNotify(slug, c.text, req.user, `on comment #${c.n}`)
          team.notify(peopleOn(cjob).filter((id) => !named.includes(id)), { type: 'comment', slug, title: cjob.title, text: `${req.user.name} commented: “${c.text.slice(0, 160)}”`, by: req.user.name, byId: req.user.id })
        } else if (op === 'reply') {
          const c = comments.reply(slug, String(b.id), b.text, req.user)
          const named = mentionNotify(slug, String(b.text), req.user, `in a reply on comment #${c.n}`)
          const thread = [c.byId, ...c.replies.map((r) => r.byId)].filter((id) => id && !named.includes(id))
          team.notify(thread, { type: 'comment', slug, title: cjob.title, text: `${req.user.name} replied on #${c.n}: “${String(b.text).slice(0, 160)}”`, by: req.user.name, byId: req.user.id })
        }
        else if (op === 'resolve') comments.resolve(slug, String(b.id), b.value, req.user)
        else if (op === 'delete') comments.remove(slug, String(b.id), req.user, role(req) === 'owner')
        else if (op === 'send') {
          if (!team.canWork(req.user, cjob)) return send(res, 403, { error: 'Only people on this project can send comments to the agent. Ask an Admin to add you.' })
          const list = comments.unsent(slug)
          if (!list.length) return send(res, 400, { error: 'No new comments to send.' })
          const byImage = new Map()
          for (const c of list) byImage.set(c.image, [...(byImage.get(c.image) || []), c])
          const shots = []
          const stamp = Date.now().toString(36)
          for (const [image, pins] of byImage) {
            const rel = `specs/${slug}/feedback/pins-${path.basename(image).replace(/\.\w+$/, '')}-${stamp}.png`
            try {
              await renderAnnotated({ src: path.join(REPO_ROOT, image), pins, outFile: path.join(REPO_ROOT, rel) })
              shots.push(rel)
            } catch (e) {
              console.error('annotate failed:', e.message)
              shots.push(image)
            }
          }
          const pct = (v) => `${Math.round(v * 100)}%`
          const text = [
            `Pinned comments on the screenshots (${list.length}). Numbered pins are drawn on the annotated copies — Read them first; x/y are % from the image's left/top edge.`,
            ...[...byImage].map(([image, pins]) => [`On \`${image}\`:`, ...pins.map((c) => [`- #${c.n} at (x ${pct(c.x)}, y ${pct(c.y)}) — ${c.by}: "${c.text}"`, ...c.replies.map((r) => `  ↳ ${r.by}: "${r.text}"`)].join('\n'))].join('\n')),
          ].join('\n\n')
          const job = store.get(slug)
          if (job.status === 'direction') {
            if (!team.canSignoff(req.user, job)) return send(res, 403, { error: 'During direction review only someone who can sign off sends changes. Leave comments; they send them.' })
            orch.direction(slug, 'changes', text, who(req), shots)
          } else orch.message(slug, text, shots, who(req))
          comments.markSent(slug, list.map((c) => c.id))
        }
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
      broadcast({ type: 'comments', slug })
      return send(res, 200, comments.list(slug).map((c) => ({ ...c, color: colorFor(c.byId) })))
    }
    if (p === '/api/jobs' && req.method === 'GET') return send(res, 200, store.list().filter((j) => team.canSee(req.user, j)))
    if (p === '/api/skills') return send(res, 200, listKnowledge())
    if (p === '/api/jobs' && req.method === 'POST') {
      { const nr = notReady(); if (nr) return send(res, 423, nr) }
      const body = await readJson(req)
      if (!body.title?.trim()) return send(res, 400, { error: 'Add a title' })
      if (!body.brief?.trim() && !(body.files || []).length) return send(res, 400, { error: 'Paste the BRD or attach a PDF' })
      if (req.user.role === 'viewer') return send(res, 403, { error: 'Viewers can comment but not start projects. Ask an Admin to make you a Designer.' })
      const job = store.create({ title: body.title.trim(), surface: body.surface, brief: body.brief || '', source: 'dashboard', requester: who(req) })
      store.update(job.slug, { createdById: req.user.id, assignees: [req.user.id] })
      if (role(req) !== 'owner') team.notify(admins(), { type: 'assigned', slug: job.slug, title: job.title, text: `${req.user.name} started a new project.`, by: req.user.name, byId: req.user.id })
      const saved = saveUploads(job.slug, body.files)
      if (saved.length) store.event(job.slug, 'system', `Attached: ${saved.map((s) => path.basename(s)).join(', ')}`)
      orch.start(job.slug)
      return send(res, 201, store.get(job.slug))
    }
    // External repos / CI: POST a BRD as JSON. Set STUDIO_INTAKE_TOKEN to require a bearer token.
    if (p === '/api/intake' && req.method === 'POST') {
      { const nr = notReady(); if (nr) return send(res, 423, nr) }
      // Without a token only this computer may post BRDs; with one, the token must match.
      if (INTAKE_TOKEN ? req.headers.authorization !== `Bearer ${INTAKE_TOKEN}` : !isLocal(req)) return send(res, 401, { error: 'Bad or missing intake token (set STUDIO_INTAKE_TOKEN).' })
      const body = await readJson(req)
      const job = store.create({ title: body.title || 'Untitled BRD', surface: body.surface, brief: body.brief || '', source: `api · ${body.source || 'external'}` })
      saveUploads(job.slug, body.files)
      orch.start(job.slug)
      return send(res, 201, { slug: job.slug, url: `http://localhost:${PORT}/#j/${job.slug}` })
    }
    const m = /^\/api\/jobs\/([a-z0-9-]+)(?:\/([a-z-]+))?$/.exec(p)
    if (m) {
      const [, slug, action] = m
      const job = store.get(slug)
      if (!job || !team.canSee(req.user, job)) return send(res, 404, { error: 'No such job' })
      if (!action && req.method === 'GET') return send(res, 200, { ...job, events: store.events(slug), running: orch.isRunning(slug) })
      if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
      // Setup gate: only deleting a project works before setup is finished.
      if (action !== 'delete') { const nr = notReady(); if (nr) return send(res, 423, nr) }
      const body = await readJson(req)
      // Assign people to the project (Admin).
      if (action === 'assign') {
        if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Admin assigns people.' })
        const valid = new Set(auth.raw().map((u) => u.id))
        const next = [...new Set((body.assignees || []).map(String))].filter((id) => valid.has(id))
        const added = next.filter((id) => !(job.assignees || []).includes(id))
        store.update(slug, { assignees: next })
        store.event(slug, 'human', `Team: ${next.map((id) => auth.raw().find((u) => u.id === id)?.name).filter(Boolean).join(', ') || 'nobody'}.`, { by: who(req) })
        team.notify(added, { type: 'assigned', slug, title: job.title, text: `${req.user.name} added you to this project.`, by: req.user.name, byId: req.user.id })
        broadcast({ type: 'team' })
        return send(res, 200, store.get(slug))
      }
      // Who may do what: Viewers comment only; Designers work on their projects; sign-off needs sign-off rights.
      const SIGN = ['direction', 'signoff', 'back-to-refine']
      if (action !== 'delete' && !SIGN.includes(action) && !team.canWork(req.user, job)) return send(res, 403, { error: req.user.role === 'viewer' ? 'Viewers can comment but not change the project.' : 'You’re not on this project. Ask an Admin to add you.' })
      if (SIGN.includes(action) && !team.canSignoff(req.user, job)) return send(res, 403, { error: 'You don’t have sign-off rights on this project. Request sign-off instead.' })
      for (const t of [body.text, body.note]) if (t && String(t).includes('@')) mentionNotify(slug, String(t), req.user, 'in feedback')
      if (action === 'react') {
        const value = body.value === 'like' ? 'like' : 'dislike'
        orch.react(slug, body.target === 'proposal' ? 'proposal' : 'prototype', value, String(body.note || '').trim().slice(0, 1200), who(req))
        return send(res, 200, store.get(slug))
      }
      if (action === 'delete') {
        if (role(req) !== 'owner') return send(res, 403, { error: 'Only an Owner can delete projects.' })
        return send(res, 200, { deleted: slug, trash: await deleteJob(slug) })
      }
      switch (action) {
        case 'answers':
          orch.answer(slug, body.answers || {}, who(req))
          break
        case 'message': {
          if (!body.text?.trim() && !(body.files || []).length) return send(res, 400, { error: 'Write a message' })
          const shots = saveUploads(slug, body.files, 'feedback')
          orch.message(slug, body.text?.trim() || '(screenshots)', shots, who(req))
          break
        }
        case 'direction':
          if (body.decision !== 'approve' && !body.note?.trim()) return send(res, 400, { error: 'Say what to change' })
          orch.direction(slug, body.decision === 'approve' ? 'approve' : 'changes', body.note?.trim() || '', who(req), saveUploads(slug, body.files, 'feedback'))
          break
        case 'figma':
          orch.figma(slug, who(req))
          break
        case 'request-signoff': {
          orch.requestSignoff(slug, who(req))
          store.update(slug, { signoffRequestedBy: who(req), signoffRequestedAt: new Date().toISOString() })
          const to = signerIds(job)
          team.notify(to, { type: 'signoff', slug, title: job.title, text: `${req.user.name} requested your sign-off on the prototype.${body.note ? ` “${String(body.note).slice(0, 200)}”` : ''}`, by: req.user.name, byId: req.user.id })
          break
        }
        case 'signoff':
          orch.signoff(slug, who(req))
          team.notify(peopleOn(job), { type: 'signoff', slug, title: job.title, text: `${req.user.name} gave Final sign-off. The handover is being packaged.`, by: req.user.name, byId: req.user.id })
          break
        case 'back-to-refine':
          orch.backToRefine(slug, who(req))
          break
        case 'stop':
          orch.stop(slug)
          break
        case 'retry':
          orch.retry(slug)
          break
        default:
          return send(res, 404, { error: 'Unknown action' })
      }
      return send(res, 200, store.get(slug))
    }
    if (p.startsWith('/files/')) {
      const rel = decodeURIComponent(p.slice(7))
      const sp = /^specs\/([a-z0-9-]+)\//.exec(rel)
      if (sp && store.get(sp[1]) && !team.canSee(req.user, store.get(sp[1]))) return send(res, 404, { error: 'Not found' })
      const full = path.resolve(REPO_ROOT, rel)
      const ok = PUBLIC_ROOTS.some((r) => full.startsWith(path.join(REPO_ROOT, r) + path.sep))
      return ok ? serveFile(res, full) : send(res, 403, { error: 'Not shared' })
    }
    // dashboard
    const file = path.join(here, 'public', p === '/' ? 'index.html' : p)
    if (file.startsWith(path.join(here, 'public'))) return serveFile(res, file)
    send(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(err)
    studioLog(`ERROR ${p}: ${err.stack || err.message}`)
    send(res, 500, { error: err.message })
  }
})

server.on('error', (e) => {
  studioLog(`listen error: ${e.code || e.message}`)
  if (e.code === 'EADDRINUSE') console.error(`\n  Port ${PORT} is already used by another (older) studio. Quit Terminal (Cmd+Q) and start again.\n`)
  process.exit(1)
})
server.listen(PORT, HOST, () => {
  studioLog(`listening on ${HOST}:${PORT}`)
  console.log(`\n  Design Studio  →  http://localhost:${PORT}`)
  console.log(`  Repo: ${REPO_ROOT}`)
  console.log(`  Access: ${HOST === '127.0.0.1' ? 'this computer only' : `network (${HOST}) — login required`}${auth.needsSetup() ? ' · first open: create the Owner account' : ''}`)
  console.log(`  Agent: ${connected() ? `Claude${process.env.STUDIO_MODEL ? ` · ${process.env.STUDIO_MODEL}` : ''}` : 'not connected yet — open the studio and paste your Anthropic API key'}`)
  if (process.env.STUDIO_LANE_AUTOSTART !== '0') {
    console.log('  Prototype lane: starting on ' + LINKS.prototypeOrigin + ' (log: apps/studio/prototype-lane.log)')
    lane.ensure().then((st) => console.log(`  Prototype lane: ${st.status} — ${st.message}`))
  }
  console.log(`  Inbox: ${path.join(REPO_ROOT, 'inbox')} (drop .md / .pdf BRDs here)\n`)
})
