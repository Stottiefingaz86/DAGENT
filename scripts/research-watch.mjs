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
try {
  for (const id of projects) {
    const r = await fetch(`https://api.figma.com/v1/projects/${id}/files`, { headers: { 'X-Figma-Token': t } })
    if (!r.ok) throw new Error(`Figma API ${r.status} for project ${id}`)
    const data = await r.json()
    for (const f of data.files || []) files[f.key] = { name: f.name, key: f.key, url: `https://www.figma.com/design/${f.key}`, lastModified: f.last_modified, project: id }
  }
} catch (e) {
  out({ changed: false, files: 0, updated: [], error: String(e.message) })
  process.exit(0)
}
const updated = Object.values(files).filter((f) => !before.files[f.key] || before.files[f.key].lastModified !== f.lastModified)
const removed = Object.values(before.files).filter((f) => !files[f.key])
fs.writeFileSync(indexFile, JSON.stringify({ checkedAt: new Date().toISOString(), projects, files }, null, 2))
if (updated.length || removed.length) {
  const log = path.join(dir, 'CHANGELOG.md')
  const prev = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').replace(/^# .*\n+/, '') : ''
  const first = !Object.keys(before.files).length
  const entry = [
    `## ${new Date().toISOString().slice(0, 10)}${first ? ' · baseline' : ''}`,
    ...updated.map((f) => `- ${before.files[f.key] ? 'Updated' : 'New'}: [${f.name}](${f.url}) — ${f.lastModified.slice(0, 10)}`),
    ...removed.map((f) => `- Removed: ${f.name}`),
    '',
  ].join('\n')
  fs.writeFileSync(log, `# Research changelog\n\nNewest first. Agents: open the New/Updated files (read only) before Mobbin.\n\n${entry}\n${prev.replace(/^Newest first.*\n+/, '')}`)
}
out({ changed: updated.length + removed.length > 0, files: Object.keys(files).length, updated: updated.map((f) => f.name) })
