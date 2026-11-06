// Job store. Every initiative lives in the design repo under specs/<slug>/:
//   job.json      — status, stage, questions, gates (the dashboard's source of truth)
//   events.jsonl  — the full back-and-forth (agent lines, human messages, tool activity)
//   brd.md / brd.pdf, spec.md, proposal.html, feedback.md, dev-delivery.md — written by the agent
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'

export const STAGES = [
  { id: 'intake', label: 'Intake' },
  { id: 'spec', label: 'Spec' },
  { id: 'clarify', label: 'Clarify' },
  { id: 'research', label: 'Research' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'refine', label: 'Refine' },
  { id: 'signoff', label: 'Sign-off' },
  { id: 'handoff', label: 'Handoff' },
]

// What each status means for a human. `gate` = someone has to act.
export const STATUSES = {
  queued: { label: 'Queued', gate: null },
  working: { label: 'Agent working', gate: null },
  questions: { label: 'Questions for you', gate: 'Answer the agent’s questions' },
  direction: { label: 'Direction review', gate: 'Approve the direction or ask for changes' },
  refine: { label: 'Refine', gate: 'Review the prototype and leave feedback' },
  awaiting_signoff: { label: 'Awaiting Chris', gate: 'Final sign-off (Owner)' },
  packaging: { label: 'Packaging', gate: null },
  ready_for_dev: { label: 'Ready for dev', gate: null },
  idle: { label: 'Waiting for you', gate: 'Reply to the agent' },
  error: { label: 'Error', gate: 'Check the run log' },
}

export class Store extends EventEmitter {
  constructor(repoRoot) {
    super()
    this.repoRoot = repoRoot
    this.specsDir = path.join(repoRoot, 'specs')
    fs.mkdirSync(this.specsDir, { recursive: true })
  }

  dir(slug) {
    return path.join(this.specsDir, slug)
  }

  list() {
    return fs
      .readdirSync(this.specsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(this.specsDir, d.name, 'job.json')))
      .map((d) => this.get(d.name))
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }

  get(slug) {
    try {
      const job = JSON.parse(fs.readFileSync(path.join(this.dir(slug), 'job.json'), 'utf8'))
      job.files = this.files(slug)
      return job
    } catch {
      return null
    }
  }

  files(slug) {
    const d = this.dir(slug)
    const has = (f) => fs.existsSync(path.join(d, f))
    const out = {}
    for (const [k, f] of Object.entries({
      brd: 'brd.md',
      brdPdf: 'brd.pdf',
      spec: 'spec.md',
      proposal: 'proposal.html',
      feedback: 'feedback.md',
      delivery: 'dev-delivery.md',
      plan: 'plan.md',
    })) {
      if (has(f)) out[k] = f
    }
    const shots = path.join(d, 'feedback')
    out.screenshots = fs.existsSync(shots) ? fs.readdirSync(shots).filter((f) => !f.startsWith('.')) : []
    return out
  }

  uniqueSlug(title) {
    const base =
      (title || 'brd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'brd'
    let slug = base
    let n = 2
    while (fs.existsSync(this.dir(slug))) slug = `${base}-${n++}`
    return slug
  }

  create({ title, surface, brief, source = 'upload', requester = 'Chris' }) {
    const slug = this.uniqueSlug(title)
    fs.mkdirSync(this.dir(slug), { recursive: true })
    const now = new Date().toISOString()
    const job = {
      slug,
      title: title || slug,
      surface: surface || 'Other',
      source,
      requester,
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      stage: 'intake',
      running: false,
      sessionId: null,
      questions: [],
      previewUrl: null,
      proposalSummary: null,
      learnings: [],
      round: 0,
      costUsd: 0,
    }
    fs.writeFileSync(path.join(this.dir(slug), 'brd.md'), `# ${job.title}\n\n${brief || ''}\n`)
    this.save(job)
    this.event(slug, 'system', `BRD received from ${source}.`)
    return job
  }

  save(job) {
    job.updatedAt = new Date().toISOString()
    const { files, ...rest } = job
    fs.writeFileSync(path.join(this.dir(job.slug), 'job.json'), JSON.stringify(rest, null, 2))
    this.emit('change', { type: 'job', slug: job.slug })
    return job
  }

  update(slug, patch) {
    const job = this.get(slug)
    if (!job) throw new Error(`No job ${slug}`)
    const prev = job.status
    Object.assign(job, typeof patch === 'function' ? patch(job) || {} : patch)
    this.save(job)
    if (job.status !== prev && STATUSES[job.status]?.gate) {
      this.emit('change', { type: 'notify', slug, status: job.status, title: job.title, gate: STATUSES[job.status].gate })
    }
    return job
  }

  // who: agent | human | system | tool
  event(slug, who, text, data = undefined) {
    const e = { t: new Date().toISOString(), who, text, ...(data ? { data } : {}) }
    fs.appendFileSync(path.join(this.dir(slug), 'events.jsonl'), JSON.stringify(e) + '\n')
    this.emit('change', { type: 'event', slug, event: e })
    return e
  }

  events(slug) {
    try {
      return fs
        .readFileSync(path.join(this.dir(slug), 'events.jsonl'), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    } catch {
      return []
    }
  }

  saveFile(slug, rel, buf) {
    const p = path.join(this.dir(slug), rel)
    if (!p.startsWith(this.dir(slug))) throw new Error('bad path')
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, buf)
    return path.relative(this.repoRoot, p)
  }

  appendFeedback(slug, round, text, shots) {
    const p = path.join(this.dir(slug), 'feedback.md')
    const head = fs.existsSync(p) ? '' : `# Feedback log\n\nEvery round from Chris, verbatim. Durable rules go to chris-taste.\n`
    const lines = [
      head,
      `\n## Round ${round} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      '',
      `> ${text.replace(/\n/g, '\n> ')}`,
      ...(shots.length ? ['', ...shots.map((s) => `- Screenshot: \`${s}\``)] : []),
      '',
    ]
    fs.appendFileSync(p, lines.join('\n'))
  }
}
