// Which model runs each step of the design flow, how hard it thinks, and a spending cap per step.
// Settings → Models & cost (Admin). Stored in apps/studio/.studio-models.json (git-ignored).
import fs from 'node:fs'
import path from 'node:path'

export const MODELS = [
  { id: 'claude-fable-5-1', label: 'Fable 5.1', note: 'Strongest for design judgement and visual work' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', note: 'Strong all-rounder, best for code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', note: 'Fast and cheaper; good for specs and research' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', note: 'Cheapest; summaries and simple tasks' },
]
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

// Steps of the flow. Each run of the agent is one of these.
export const STEPS = {
  plan: { label: 'Plan', what: 'Intake, spec, questions for the team', model: 'claude-sonnet-5-5', effort: 'medium' },
  design: { label: 'Design', what: 'Research, proposal, prototype, revisions, Figma', model: 'claude-fable-5-1', effort: 'high' },
  build: { label: 'Build & handover', what: 'Handover package, dev answers, Lumen checks', model: 'claude-opus-5-5', effort: 'high' },
  ideas: { label: 'Ideas', what: 'Recommendations and idea revisions', model: 'claude-fable-5-1', effort: 'high' },
  taste: { label: 'Taste upkeep', what: 'Tidying the taste notes', model: 'claude-sonnet-5-5', effort: 'medium' },
}

export function createModels(dir) {
  const FILE = path.join(dir, '.studio-models.json')
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(FILE, 'utf8'))
    } catch {
      return {}
    }
  }
  let cfg = read()
  const save = () => fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 })
  const step = (k) => {
    const d = STEPS[k] || STEPS.design
    const c = cfg.steps?.[k] || {}
    return { key: STEPS[k] ? k : 'design', label: d.label, what: d.what, model: c.model || d.model, effort: c.effort || d.effort, default: { model: d.model, effort: d.effort } }
  }
  return {
    // Spending cap per run, in USD (0 = no cap). Default $10.
    cap: () => (cfg.capUsd == null ? 10 : cfg.capUsd),
    step,
    all: () => ({ steps: Object.keys(STEPS).map(step), capUsd: cfg.capUsd == null ? 10 : cfg.capUsd, models: MODELS, efforts: EFFORTS }),
    set(body) {
      cfg.steps = cfg.steps || {}
      if (body.step && STEPS[body.step]) {
        const cur = cfg.steps[body.step] || {}
        if (body.model && MODELS.some((m) => m.id === body.model)) cur.model = body.model
        if (body.effort && EFFORTS.includes(body.effort)) cur.effort = body.effort
        if (body.reset) delete cfg.steps[body.step]
        else cfg.steps[body.step] = cur
      }
      if ('capUsd' in body) cfg.capUsd = Math.max(0, Math.min(200, Number(body.capUsd) || 0))
      save()
    },
  }
}
