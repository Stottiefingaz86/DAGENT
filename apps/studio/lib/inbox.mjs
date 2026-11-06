// BRDs from other repos land in <design repo>/inbox/ (a PR, a GitHub Action, or a copy).
// The studio picks up any .md / .txt / .pdf there, opens a job, and moves the file to inbox/processed/.
// Optional front matter in .md files:  ---\ntitle: VIP cashback\nsurface: Rewards\nsource: product-repo\n---
import fs from 'node:fs'
import path from 'node:path'

function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return { meta: {}, body: text }
  const meta = Object.fromEntries(
    m[1]
      .split('\n')
      .map((l) => l.split(/:(.*)/s).map((x) => x && x.trim()))
      .filter(([k, v]) => k && v),
  )
  return { meta, body: text.slice(m[0].length) }
}

export function watchInbox({ store, repoRoot, onJob }) {
  const inbox = path.join(repoRoot, 'inbox')
  const done = path.join(inbox, 'processed')
  fs.mkdirSync(done, { recursive: true })
  const readme = path.join(inbox, 'README.md')
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      '# BRD inbox\n\nDrop a BRD here (.md, .txt or .pdf) — or have another repo commit one here — and the Design Studio opens a job for it.\n\nOptional front matter for .md files:\n\n```\n---\ntitle: VIP cashback\nsurface: Rewards\nsource: product-repo\n---\n```\n',
    )
  }
  const seen = new Set()
  function scan() {
    for (const name of fs.readdirSync(inbox)) {
      const full = path.join(inbox, name)
      if (name === 'README.md' || name.startsWith('.') || seen.has(name)) continue
      if (!/\.(md|txt|pdf)$/i.test(name) || !fs.statSync(full).isFile()) continue
      // wait until the file stops growing (copies in progress)
      const size = fs.statSync(full).size
      setTimeout(() => {
        if (!fs.existsSync(full) || fs.statSync(full).size !== size || seen.has(name)) return
        seen.add(name)
        try {
          const isPdf = /\.pdf$/i.test(name)
          let meta = {}
          let body = ''
          if (!isPdf) ({ meta, body } = parseFrontMatter(fs.readFileSync(full, 'utf8')))
          const heading = /^#\s+(.+)$/m.exec(body)?.[1]
          const title = meta.title || heading || name.replace(/\.(md|txt|pdf)$/i, '').replace(/[-_]+/g, ' ')
          const job = store.create({
            title,
            surface: meta.surface || 'Other',
            brief: isPdf ? `Original BRD is the PDF: specs/<slug>/brd.pdf (from inbox/${name}).` : body,
            source: meta.source ? `inbox · ${meta.source}` : 'inbox',
          })
          if (isPdf) {
            fs.copyFileSync(full, path.join(store.dir(job.slug), 'brd.pdf'))
            fs.writeFileSync(path.join(store.dir(job.slug), 'brd.md'), `# ${title}\n\nOriginal BRD: specs/${job.slug}/brd.pdf (from inbox/${name}).\n`)
          }
          fs.renameSync(full, path.join(done, `${new Date().toISOString().slice(0, 10)}-${name}`))
          onJob(job.slug)
        } catch (e) {
          console.error('inbox:', e)
        }
      }, 1500)
    }
  }
  scan()
  return setInterval(scan, 3000)
}
