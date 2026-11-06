// BetOnline Design Studio — dashboard + design agent worker.
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

const here = path.dirname(fileURLToPath(import.meta.url))

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
}

const store = new Store(REPO_ROOT)
const auth = createAuth(here)
// The studio runs the prototype lane itself (apps/live-site on :3001).
const lane = createLane({ repoRoot: REPO_ROOT, origin: LINKS.prototypeOrigin, onChange: (st) => store.emit('change', { type: 'lane', lane: st }) })
const claude = createClaudeRunner({ store, repoRoot: REPO_ROOT, model: process.env.STUDIO_MODEL, siteOrigin: LINKS.prototypeOrigin, lane })
// No key → no run. Never a stand-in agent.
async function runner(slug, prompt, signal) {
  if (!connected()) throw new Error('The design agent isn’t connected. Add your Anthropic API key on the studio home screen, then Retry.')
  return claude(slug, prompt, signal)
}
const orch = createOrchestrator({ store, runner })

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

watchInbox({ store, repoRoot: REPO_ROOT, onJob: (slug) => orch.start(slug) })

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
const PUBLIC_ROOTS = ['specs', 'tokens', 'apps/live-site/public', 'inbox', '.cursor/knowledge', '.cursor/skills', '.claude/skills', '.specify']
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
    ['Playbook', '.cursor/skills/design-agent', /SKILL\.md$/],
    ['Build skill', '.cursor/skills/lumen-build', /\.md$/],
    ['SpecKit', '.cursor/skills', /speckit-(specify|clarify|plan|tasks|checklist|analyze)\/SKILL\.md$/],
    ['Chris taste', '.cursor/knowledge/chris-taste', /\.md$/],
    ['Strategy & research', '.cursor/knowledge/product-strategy', /\.(md|pdf)$/],
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
      .filter((f) => re.test(f) && !(name === 'Playbook' && f.includes('figma-plugin')) && !(name === 'Playbook' && f.includes('/project/')))
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

// --- routes ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  try {
    req.user = auth.userFor(req)
    if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) return send(res, 403, { error: 'Cross-site request refused.' })

    // ---- login ----
    if (p === '/api/auth/me') return send(res, 200, { setup: auth.needsSetup(), user: auth.publicUser(req.user), local: isLocal(req) })
    if (p === '/api/auth/setup' && req.method === 'POST') {
      if (!isLocal(req)) return send(res, 403, { error: 'Set up the studio on the computer that runs it.' })
      return send(res, 200, { user: auth.setup(res, await readJson(req), SECURE_COOKIE) })
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      try {
        return send(res, 200, { user: auth.login(req, res, await readJson(req), ip(req), SECURE_COOKIE) })
      } catch (e) {
        return send(res, e.code || 400, { error: e.message })
      }
    }
    if (p === '/api/auth/logout' && req.method === 'POST') {
      auth.logout(req, res)
      return send(res, 200, { ok: true })
    }
    // Everything else needs a login (BRDs from other repos use the intake token instead).
    const isApi = p.startsWith('/api/') && p !== '/api/intake'
    const publicAsset = p === '/files/apps/live-site/public/shell/design-agent/logo-mark.png' // sign-in screen logo
    if ((isApi || (p.startsWith('/files/') && !publicAsset)) && !req.user) return send(res, 401, { error: 'Sign in to the studio.', signin: true })

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
        else return send(res, 404, { error: 'Unknown action' })
      } catch (e) {
        return send(res, 400, { error: e.message })
      }
      return send(res, 200, auth.list())
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
      return send(res, 200, { connected: connected(), stages: STAGES, statuses: STATUSES, links: LINKS, lane: lane.status(), repoRoot: REPO_ROOT, model: process.env.STUDIO_MODEL || 'default' })
    }
    if (p === '/api/lane') {
      if (req.method === 'POST') lane.ensure()
      return send(res, 200, lane.status())
    }
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
      res.write('retry: 2000\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
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
    if (p === '/api/jobs' && req.method === 'GET') return send(res, 200, store.list())
    if (p === '/api/skills') return send(res, 200, listKnowledge())
    if (p === '/api/jobs' && req.method === 'POST') {
      const body = await readJson(req)
      if (!body.title?.trim()) return send(res, 400, { error: 'Add a title' })
      if (!body.brief?.trim() && !(body.files || []).length) return send(res, 400, { error: 'Paste the BRD or attach a PDF' })
      const job = store.create({ title: body.title.trim(), surface: body.surface, brief: body.brief || '', source: 'dashboard', requester: who(req) })
      const saved = saveUploads(job.slug, body.files)
      if (saved.length) store.event(job.slug, 'system', `Attached: ${saved.map((s) => path.basename(s)).join(', ')}`)
      orch.start(job.slug)
      return send(res, 201, store.get(job.slug))
    }
    // External repos / CI: POST a BRD as JSON. Set STUDIO_INTAKE_TOKEN to require a bearer token.
    if (p === '/api/intake' && req.method === 'POST') {
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
      if (!job) return send(res, 404, { error: 'No such job' })
      if (!action && req.method === 'GET') return send(res, 200, { ...job, events: store.events(slug), running: orch.isRunning(slug) })
      if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
      const body = await readJson(req)
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
          if (role(req) !== 'owner') return send(res, 403, { error: 'Only the Owner approves direction' })
          if (body.decision !== 'approve' && !body.note?.trim()) return send(res, 400, { error: 'Say what to change' })
          orch.direction(slug, body.decision === 'approve' ? 'approve' : 'changes', body.note?.trim() || '', who(req), saveUploads(slug, body.files, 'feedback'))
          break
        case 'figma':
          orch.figma(slug, who(req))
          break
        case 'request-signoff':
          orch.requestSignoff(slug, who(req))
          break
        case 'signoff':
          if (role(req) !== 'owner') return send(res, 403, { error: 'Only Chris (Owner) can give Final sign-off' })
          orch.signoff(slug, who(req))
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
    send(res, 500, { error: err.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`\n  BetOnline Design Studio  →  http://localhost:${PORT}`)
  console.log(`  Repo: ${REPO_ROOT}`)
  console.log(`  Access: ${HOST === '127.0.0.1' ? 'this computer only' : `network (${HOST}) — login required`}${auth.needsSetup() ? ' · first open: create the Owner account' : ''}`)
  console.log(`  Agent: ${connected() ? `Claude${process.env.STUDIO_MODEL ? ` · ${process.env.STUDIO_MODEL}` : ''}` : 'not connected yet — open the studio and paste your Anthropic API key'}`)
  if (process.env.STUDIO_LANE_AUTOSTART !== '0') {
    console.log('  Prototype lane: starting on ' + LINKS.prototypeOrigin + ' (log: apps/studio/prototype-lane.log)')
    lane.ensure().then((st) => console.log(`  Prototype lane: ${st.status} — ${st.message}`))
  }
  console.log(`  Inbox: ${path.join(REPO_ROOT, 'inbox')} (drop .md / .pdf BRDs here)\n`)
})
