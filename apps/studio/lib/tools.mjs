// The studio tools the design agent calls. Each one changes the job the dashboard shows.
// Used by the Claude runner.
import { STAGES } from './store.mjs'

export const STAGE_IDS = STAGES.map((s) => s.id)

export function makeTools(store, slug) {
  return {
    set_title({ title }) {
      const t = String(title || '').trim().slice(0, 80)
      if (t) store.update(slug, { title: t })
      return 'Title set.'
    },
    set_stage({ stage, note }) {
      store.update(slug, { stage })
      store.event(slug, 'system', `Stage → ${STAGES.find((s) => s.id === stage)?.label || stage}${note ? ` · ${note}` : ''}`)
      return 'Stage updated.'
    },
    log({ message }) {
      store.event(slug, 'agent-log', message)
      return 'Logged.'
    },
    ask_questions({ questions }) {
      const qs = questions.map((q, i) => ({
        id: q.id || `q${Date.now().toString(36)}${i}`,
        title: q.title || q.text,
        text: q.title || q.text,
        context: q.context || '',
        why: q.why || '',
        options: q.options || [],
        images: q.images || [],
        answer: null,
      }))
      store.update(slug, (job) => ({ questions: [...job.questions, ...qs], status: 'questions', stage: job.stage === 'intake' ? 'clarify' : job.stage }))
      store.event(slug, 'system', `${qs.length} question${qs.length === 1 ? '' : 's'} for the team.`, { questions: qs.map((q) => q.id) })
      return 'Questions posted to the dashboard. End your turn now; you will be resumed with the answers.'
    },
    submit_proposal(board) {
      const proposal = { ...board, at: new Date().toISOString() }
      store.update(slug, (job) => ({ status: 'direction', stage: 'proposal', proposalSummary: board.summary, proposal, proposals: [...(job.proposals || []), proposal] }))
      store.event(slug, 'system', 'Proposal ready for direction review.', { summary: board.summary, proposal: true })
      return 'Proposal submitted to the chat. End your turn now; you will be resumed with Chris’s direction.'
    },
    submit_prototype(build) {
      const version = { ...build, at: new Date().toISOString() }
      store.update(slug, (job) => ({ status: 'refine', stage: 'refine', previewUrl: build.previewUrl || job.previewUrl, prototypeSummary: build.summary, prototypes: [...(job.prototypes || []), version] }))
      store.event(slug, 'system', 'Prototype ready to review.', { previewUrl: build.previewUrl, summary: build.summary, prototype: true })
      return 'Prototype submitted; it runs live in the chat. End your turn now; you will be resumed with feedback.'
    },
    submit_figma({ url, frames = [], gaps = [] }) {
      store.update(slug, (job) => ({ figma: { url, frames, gaps, at: new Date().toISOString() }, status: job.prevStatus || job.status, prevStatus: null }))
      store.event(slug, 'system', 'Figma screens ready.', { figma: true, url })
      return 'Figma recorded. End your turn.'
    },
    record_learning({ file, rule }) {
      store.update(slug, (job) => ({ learnings: [...(job.learnings || []), { file, rule, at: new Date().toISOString() }] }))
      store.event(slug, 'system', `Learned → ${file}: ${rule}`)
      return 'Learning recorded.'
    },
    submit_handoff({ file, summary }) {
      store.update(slug, { status: 'ready_for_dev', stage: 'handoff', deliveryFile: file || 'dev-delivery.md' })
      store.event(slug, 'system', 'Dev handoff package ready.', { summary })
      return 'Handoff submitted. Your work on this job is done.'
    },
  }
}
