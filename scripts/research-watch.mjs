#!/usr/bin/env node
// Research watch: lists the research Figma folder (competitor + market research, updated all the time)
// and records what is new or changed, so agents open those files first.
//   FIGMA_TOKEN=… node scripts/research-watch.mjs        (or put FIGMA_TOKEN in apps/studio/.env)
// Writes knowledge/research/figma-index.json and prepends to knowledge/research/CHANGELOG.md.
// Folder ids come from knowledge/product-strategy/RESEARCH_SOURCES.md ("figma-project: <id>").
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const json = process.argv.includes('--json')
const out = (o) => (json ? console.log(JSON.stringify(o)) : console.log(o.error ? `research-watch: ${o.error}` : `research-watch: ${o.files} files, ${o.updated.length} new/updated`))

function token() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim()
  try {
    const saved = path.join(root, 'apps/studio/.studio-figma-token') // pasted in Studio → Settings
    if (fs.existsSync(saved)) return fs.readFileSync(saved, 'utf8').trim()
    const env = fs.readFileSync(path.join(root, 'apps/studio/.env'), 'utf8')
    return /^FIGMA_TOKEN=(.+)$/m.exec(env)?.[1]?.trim().replace(/^['"]|['"]$/g, '') || ''
  } catch {
    return ''
  }
}
const sources = fs.readFileSync(path.join(root, 'knowledge/product-strategy/RESEARCH_SOURCES.md'), 'utf8')
const projects = [...sources.matchAll(/figma-project:\s*(\d+)/g)].map((m) => m[1])
const t = token()
if (!t) {
  out({ changed: false, files: 0, updated: [], error: 'FIGMA_TOKEN not set — research folder not checked (see docs/CONNECTORS.md).' })
  process.exit(0)
}

const dir = path.join(root, 'knowledge/research')
fs.mkdirSync(dir, { recursive: true })
const indexFile = path.join(dir, 'figma-index.json')
const before = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { files: {} }
const files = {}
// Figma moved projects → folders in 2026: /v2/folders (scope folders:read) first; the old /v1/projects (projects:read) as fallback.
const get = async (url) => {
  const r = await fetch(url, { headers: { 'X-Figma-Token': t } })
  return { ok: r.ok, status: r.status, body: await r.text().catch(() => '') }
}
const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v != null)
const list = (j, ...keys) => (Array.isArray(j) ? j : keys.map((k) => j?.[k]).find(Array.isArray) || [])
function explain(status, body) {
  if (status === 403 || status === 401)
    return /scope/i.test(body)
      ? 'the token is missing a scope: make a new one with Folders = Read only and File content = Read only'
      : 'Figma refused the token: copy it in full, or make a new one (Folders = Read only, File content = Read only)'
  if (status === 404) return 'the research folder was not found for this Figma account: make the token while signed in as an account that can open the folder'
  if (status === 429) return 'Figma is rate-limiting; it will retry later'
  return `Figma answered ${status}`
}
async function folderFiles(id, depth = 0) {
  const r = await get(`https://api.figma.com/v2/folders/${id}/files`)
  if (!r.ok) return { error: { status: r.status, body: r.body } }
  const j = JSON.parse(r.body || '{}')
  for (const f of list(j, 'files', 'data')) {
    const key = pick(f, 'key', 'file_key', 'id')
    if (key) files[key] = { name: pick(f, 'name', 'title') || key, key, url: `https://www.figma.com/design/${key}`, lastModified: String(pick(f, 'last_modified', 'lastModified', 'updated_at') || ''), project: id }
  }
  if (depth < 3) {
    const sub = await get(`https://api.figma.com/v2/folders/${id}/folders`)
    if (sub.ok) for (const f of list(JSON.parse(sub.body || '{}'), 'folders', 'data')) { const fid = pick(f, 'id', 'folder_id'); if (fid) await folderFiles(fid, depth + 1) }
  }
  return {}
}
try {
  for (const id of projects) {
    const v2 = await folderFiles(id)
    if (!v2.error) continue
    const v1 = await get(`https://api.figma.com/v1/projects/${id}/files`)
    if (!v1.ok) throw new Error(`Research folder: ${explain(v2.error.status, v2.error.body + v1.body)}.`)
    for (const f of JSON.parse(v1.body).files || []) files[f.key] = { name: f.name, key: f.key, url: `https://www.figma.com/design/${f.key}`, lastModified: f.last_modified, project: id }
  }
} catch (e) {
  out({ changed: false, files: 0, updated: [], error: /fetch failed|ENOTFOUND|EAI_AGAIN/.test(String(e.message)) ? 'Can’t reach Figma from this computer (network or firewall).' : String(e.message) })
  process.exit(0)
}
const updated = Object.values(files).filter((f) => !before.files[f.key] || (f.lastModified && before.files[f.key].lastModified !== f.lastModified))
const removed = Object.values(before.files).filter((f) => !files[f.key])
fs.writeFileSync(indexFile, JSON.stringify({ checkedAt: new Date().toISOString(), projects, files }, null, 2))
if (updated.length || removed.length) {
  const log = path.join(dir, 'CHANGELOG.md')
  const prev = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').replace(/^# .*\n+/, '') : ''
  const first = !Object.keys(before.files).length
  const entry = [
    `## ${new Date().toISOString().slice(0, 10)}${first ? ' · baseline' : ''}`,
    ...updated.map((f) => `- ${before.files[f.key] ? 'Updated' : 'New'}: [${f.name}](${f.url}) — ${String(f.lastModified || '').slice(0, 10)}`),
    ...removed.map((f) => `- Removed: ${f.name}`),
    '',
  ].join('\n')
  fs.writeFileSync(log, `# Research changelog\n\nNewest first. Agents: open the New/Updated files (read only) before Mobbin.\n\n${entry}\n${prev.replace(/^Newest first.*\n+/, '')}`)
}
out({ changed: updated.length + removed.length > 0, files: Object.keys(files).length, updated: updated.map((f) => f.name) })
