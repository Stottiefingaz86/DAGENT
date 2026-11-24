// The studio tools the design agent calls. Each one changes the job the dashboard shows.
// Used by the Claude runner.
import { STAGES } from './store.mjs'
import { createJourneys } from './journeys.mjs'

export const STAGE_IDS = STAGES.map((s) => s.id)

export function makeTools(store, slug, taste) {
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
    propose_rule({ file, polarity, rule, why, quote, reinforces }) {
      if (!taste) return 'Taste ledger unavailable.'
      const r = taste.propose({ file, polarity, rule, why, quote, project: slug, reinforces })
      if (!r.ok) return r.message
      store.update(slug, (job) => ({ learnings: [...(job.learnings || []), { file: r.file, rule: `${r.rule.polarity === 'do' ? 'Do' : 'Don’t'}: ${r.rule.rule}`, id: r.rule.id, at: new Date().toISOString() }] }))
      store.event(slug, 'system', `${r.reinforced ? 'Reinforced' : 'Learned'} → ${r.file}: ${r.rule.polarity === 'do' ? 'Do' : 'Don’t'} ${r.rule.rule}${r.reinforced ? ` (seen ${r.rule.seen}×)` : ''}`, { learned: r.rule.id })
      return `${r.reinforced ? 'Reinforced' : 'Learned'} rule ${r.rule.id} in ${r.file}. It applies from now on; Chris can keep or undo it on the Taste page.`
    },
    record_learning({ file, rule }) {
      store.update(slug, (job) => ({ learnings: [...(job.learnings || []), { file, rule, at: new Date().toISOString() }] }))
      store.event(slug, 'system', `Learned → ${file}: ${rule}`)
      return 'Learning recorded.'
    },
    // A dev agent's question about the handover. needsDesign = not covered; Chris decides.
    answer_dev_question({ id, answer, source, needsDesign }) {
      let found = false
      store.update(slug, (job) => ({
        devQuestions: (job.devQuestions || []).map((q) => (q.id === id ? ((found = true), { ...q, answer, source: source || '', status: needsDesign ? 'needs_design' : 'answered', answeredAt: new Date().toISOString() }) : q)),
      }))
      if (!found) return `No dev question with id ${id}.`
      store.event(slug, 'system', `${needsDesign ? 'Dev question needs design' : 'Answered dev question'}: ${answer}`, { devQuestion: id })
      store.emit('change', { type: 'dev-answer', slug, id })
      return needsDesign ? 'Marked as needing design. Raise it with ask_questions.' : 'Answer recorded; the dev agent can fetch it now.'
    },
    submit_recommendations({ ideas = [], summary }) {
      // A revised run keeps what people already did with each idea (dismissed, feedback, turned into a project).
      store.update(slug, (job) => {
        const prev = Object.fromEntries((job.ideas || []).map((i) => [i.id, i]))
        return {
          status: 'done',
          stage: 'handoff',
          ideas: ideas.map((i, n) => {
            const id = i.id || `idea-${n + 1}`
            const old = prev[id] || {}
            return { ...i, id, dismissed: old.dismissed, feedback: old.feedback, project: old.project, at: new Date().toISOString() }
          }),
        }
      })
      store.event(slug, 'system', `${ideas.length} recommendation${ideas.length === 1 ? '' : 's'} ready.`, { summary, ideas: true })
      return 'Recommendations recorded. End your turn.'
    },
    submit_journeys({ journeys = [], summary }) {
      const saved = createJourneys(store.repoRoot).submit(journeys, slug)
      store.update(slug, { status: 'done', stage: 'handoff', journeyIds: saved.map((j) => j.id) })
      store.event(slug, 'system', `${saved.length} journey map${saved.length === 1 ? '' : 's'} ready.`, { summary, journeys: saved.map((j) => ({ id: j.id, name: j.name })) })
      return 'Journey maps saved. End your turn.'
    },
    submit_handoff({ file, summary }) {
      store.update(slug, { status: 'ready_for_dev', stage: 'handoff', deliveryFile: file || 'handover/README.md' })
      store.event(slug, 'system', 'Dev handoff package ready.', { summary })
      return 'Handoff submitted. Your work on this job is done.'
    },
  }
}
