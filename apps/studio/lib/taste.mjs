// The taste ledger: how the design agent learns what's good and what's bad.
//
//   knowledge/taste-ledger.jsonl   every signal, append-only: 👍/👎 reactions, approvals, change requests,
//                                  refine feedback, sign-offs, rules learned/kept/undone
//   knowledge/learned-rules.json   rules the agent proposed from those signals (do / don't), with evidence and
//                                  how many times they've been reinforced
//
// A proposed rule is applied straight away: it's written into the matching knowledge/chris-taste/*.md file
// under "## Learned rules", tagged with a marker, so the next run already follows it. The Owner reviews it on
// the Taste page: Keep (confirmed) or Undo (the line is removed and the agent is told not to re-learn it).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export function createTaste(repoRoot) {
  const K = path.join(repoRoot, 'knowledge')
  const TASTE = path.join(K, 'chris-taste')
  const LEDGER = path.join(K, 'taste-ledger.jsonl')
  const RULES = path.join(K, 'learned-rules.json')
  fs.mkdirSync(TASTE, { recursive: true })

  const readRules = () => {
    try {
      return JSON.parse(fs.readFileSync(RULES, 'utf8'))
    } catch {
      return []
    }
  }
  const writeRules = (r) => fs.writeFileSync(RULES, JSON.stringify(r, null, 2) + '\n')
  const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n)

  function signal(sig) {
    const row = { id: crypto.randomUUID().slice(0, 8), at: new Date().toISOString(), ...sig, text: clip(sig.text, 1200) }
    fs.appendFileSync(LEDGER, JSON.stringify(row) + '\n')
    return row
  }
  function signals({ project, limit = 200 } = {}) {
    let rows = []
    try {
      rows = fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    } catch {}
    if (project) rows = rows.filter((r) => r.project === project)
    return rows.slice(-limit).reverse()
  }

  // Taste files only: a learned rule can never land anywhere else.
  function tasteFile(file) {
    const base = path.basename(String(file || 'GENERAL.md')).replace(/[^\w.-]/g, '').replace(/\.md$/i, '') || 'GENERAL'
    return path.join(TASTE, `${base.toUpperCase()}.md`)
  }
  const marker = (id) => `<!-- rule:${id} -->`
  const line = (r) => `- **${r.polarity === 'do' ? 'Do' : 'Don’t'}:** ${r.rule}${r.why ? ` — ${r.why}` : ''} _(learned ${r.at.slice(0, 10)} from ${r.evidence[0]?.project || 'feedback'}${r.seen > 1 ? ` · seen ${r.seen}×` : ''}${r.status === 'kept' ? ' · confirmed' : ''})_ ${marker(r.id)}`

  function writeLine(r) {
    const f = tasteFile(r.file)
    let s = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : `# ${path.basename(f, '.md').replace(/_/g, ' ')}\n\n**Source:** Chris, learned by the design agent.\n`
    if (s.includes(marker(r.id))) s = s.split('\n').map((l) => (l.includes(marker(r.id)) ? line(r) : l)).join('\n')
    else {
      if (!/^## Learned rules/m.test(s)) s = s.trimEnd() + '\n\n## Learned rules\n\n_Added by the design agent from feedback; the Owner keeps or undoes each one on the Studio Taste page._\n'
      s = s.trimEnd() + '\n' + line(r) + '\n'
    }
    fs.writeFileSync(f, s)
    return path.relative(repoRoot, f)
  }
  function removeLine(r) {
    const f = tasteFile(r.file)
    if (!fs.existsSync(f)) return
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').split('\n').filter((l) => !l.includes(marker(r.id))).join('\n'))
  }

  return {
    signal,
    signals,
    rules: () => readRules(),
    propose({ file, polarity, rule, why, quote, project, reinforces }) {
      const rules = readRules()
      const ev = { project, quote: clip(quote, 300), at: new Date().toISOString() }
      const norm = (s) => clip(s, 400).toLowerCase().replace(/[^a-z0-9 ]/g, '')
      let r = rules.find((x) => x.status !== 'undone' && (x.id === reinforces || norm(x.rule) === norm(rule)))
      const blocked = rules.find((x) => x.status === 'undone' && norm(x.rule) === norm(rule))
      if (blocked) return { ok: false, message: `Chris undid this rule before (${blocked.id}); don't re-learn it.` }
      if (r) {
        r.seen += 1
        r.evidence = [ev, ...r.evidence].slice(0, 8)
      } else {
        r = { id: crypto.randomUUID().slice(0, 8), file: path.basename(tasteFile(file)), polarity: polarity === 'do' ? 'do' : 'dont', rule: clip(rule, 300), why: clip(why, 240), evidence: [ev], seen: 1, status: 'new', at: new Date().toISOString() }
        rules.push(r)
      }
      const rel = writeLine(r)
      writeRules(rules)
      signal({ kind: 'rule', project, text: `${r.polarity === 'do' ? 'Do' : 'Don’t'}: ${r.rule}`, ruleId: r.id, file: rel, seen: r.seen })
      return { ok: true, rule: r, file: rel, reinforced: r.seen > 1 }
    },
    review(id, action, by) {
      const rules = readRules()
      const r = rules.find((x) => x.id === id)
      if (!r) throw new Error('No such rule')
      if (action === 'keep') {
        r.status = 'kept'
        writeLine(r)
      } else if (action === 'undo') {
        r.status = 'undone'
        removeLine(r)
      } else throw new Error('Unknown action')
      r.reviewedBy = by
      r.reviewedAt = new Date().toISOString()
      writeRules(rules)
      signal({ kind: action === 'keep' ? 'rule-kept' : 'rule-undone', text: r.rule, ruleId: id, by })
      return r
    },
    // What the agent is told at the start of each run: this project's reactions + the strongest recent lessons.
    context(job) {
      const mine = signals({ project: job.slug, limit: 30 }).filter((s) => ['like', 'dislike', 'change', 'approve'].includes(s.kind))
      const rules = readRules().filter((r) => r.status !== 'undone')
      const undone = readRules().filter((r) => r.status === 'undone').slice(-10)
      const fresh = rules.filter((r) => r.status === 'new').slice(-10)
      const strong = [...rules].sort((a, b) => b.seen - a.seen).slice(0, 10)
      const fmt = (r) => `- ${r.polarity === 'do' ? 'DO' : 'DON’T'} (${r.file}${r.seen > 1 ? `, ${r.seen}×` : ''}${r.status === 'kept' ? ', confirmed' : ''}): ${r.rule}`
      const parts = []
      if (mine.length) parts.push(`Reactions on THIS project (newest first):\n${mine.map((s) => `- ${s.kind === 'like' || s.kind === 'approve' ? '👍' : '👎'} ${s.target ? `[${s.target}] ` : ''}${s.text || '(no note)'} — ${s.by || 'team'}`).join('\n')}`)
      if (strong.length) parts.push(`Most reinforced learned rules:\n${strong.map(fmt).join('\n')}`)
      if (fresh.length) parts.push(`Newly learned rules (not yet confirmed by Chris, still follow them):\n${fresh.map(fmt).join('\n')}`)
      if (undone.length) parts.push(`Rules Chris UNDID — never apply or re-learn these:\n${undone.map((r) => `- ${r.rule}`).join('\n')}`)
      return parts.length ? `\n\n--- Taste ledger (what's good / what's bad) ---\n${parts.join('\n\n')}` : ''
    },
  }
}
