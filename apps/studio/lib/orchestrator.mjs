// One agent run per job at a time. Human actions queue a prompt; the orchestrator
// resumes the same Claude session so the agent keeps its context between gates.
import * as P from './prompts.mjs'

export function createOrchestrator({ store, runner, taste }) {
  const sig = (slug, kind, text, by, extra = {}) => taste?.signal({ kind, project: slug, title: store.get(slug)?.title, stage: store.get(slug)?.stage, text, by, ...extra })
  const queues = new Map() // slug -> [prompt]
  const active = new Map() // slug -> AbortController

  async function pump(slug) {
    if (active.has(slug)) return
    const q = queues.get(slug) || []
    const prompt = q.shift()
    if (!prompt) return
    const ac = new AbortController()
    active.set(slug, ac)
    store.update(slug, { running: true, status: 'working', lastPrompt: prompt })
    try {
      // Every run starts with what the team liked and disliked, and the lessons learned so far.
      await runner(slug, prompt + (taste ? taste.context(store.get(slug)) : ''), ac.signal)
      const job = store.get(slug)
      // The agent ended its turn without hitting a gate: hand the conversation back to a human.
      if (job.status === 'working') store.update(slug, { status: job.prevStatus || 'idle', prevStatus: null })
    } catch (err) {
      if (ac.signal.aborted) {
        store.update(slug, { status: 'idle' })
        store.event(slug, 'system', 'Run stopped.')
      } else {
        store.update(slug, { status: 'error' })
        store.event(slug, 'system', `Agent error: ${err.message}`)
        console.error(err)
      }
    } finally {
      active.delete(slug)
      store.update(slug, { running: false })
      if ((queues.get(slug) || []).length) pump(slug)
    }
  }

  function enqueue(slug, prompt) {
    if (!queues.has(slug)) queues.set(slug, [])
    queues.get(slug).push(prompt)
    pump(slug)
  }

  return {
    start(slug) {
      enqueue(slug, P.startPrompt(store.get(slug)))
    },
    retry(slug) {
      const job = store.get(slug)
      store.event(slug, 'system', 'Retrying the last step.')
      enqueue(slug, job.lastPrompt || P.startPrompt(job))
    },
    answer(slug, answers, by) {
      const job = store.update(slug, (j) => ({
        questions: j.questions.map((q) => (answers[q.id] != null && answers[q.id] !== '' ? { ...q, answer: answers[q.id], answeredBy: by, answeredAt: new Date().toISOString() } : q)),
      }))
      const answered = job.questions.filter((q) => answers[q.id])
      store.event(slug, 'human', answered.map((q) => `**${q.text}**\n${q.answer}`).join('\n\n'), { by, kind: 'answers' })
      if (!job.questions.every((q) => q.answer)) return
      // After sign-off, answers are for questions the dev team raised: update the handover, not the proposal.
      if (job.signedOffAt) {
        store.update(slug, { prevStatus: 'ready_for_dev' })
        return enqueue(slug, P.devAnswersPrompt(job, answered))
      }
      enqueue(slug, P.answersPrompt(job, answered))
    },
    direction(slug, decision, note, by, shots = []) {
      const job = store.get(slug)
      store.event(slug, 'human', decision === 'approve' ? `Approved direction.${note ? ` ${note}` : ''}` : note, { by, kind: decision === 'approve' ? 'approve' : 'changes', shots })
      sig(slug, decision === 'approve' ? 'approve' : 'change', note || (decision === 'approve' ? 'Approved direction' : ''), by, { target: 'proposal', shots })
      if (decision !== 'approve') {
        const round = (job.round || 0) + 1
        store.appendFeedback(slug, round, `[Direction] ${note}`, shots)
        store.update(slug, { round })
      }
      enqueue(slug, P.directionPrompt(store.get(slug), decision, note, shots))
    },
    message(slug, text, shots, by) {
      let job = store.get(slug)
      // During direction review, anything Chris types is a change request for the proposal.
      if (job.status === 'direction') return this.direction(slug, 'changes', text, by, shots)
      if (job.status === 'refine' || job.status === 'awaiting_signoff') {
        const round = (job.round || 0) + 1
        store.appendFeedback(slug, round, text, shots)
        job = store.update(slug, { round, status: 'refine' })
        sig(slug, 'change', text, by, { target: 'prototype', shots })
      }
      store.event(slug, 'human', text, { by, shots })
      enqueue(slug, P.messagePrompt(job, text, shots))
    },
    figma(slug, by) {
      const job = store.get(slug)
      store.update(slug, { prevStatus: job.status })
      store.event(slug, 'human', 'Build the screens in Figma.', { by })
      enqueue(slug, P.figmaPrompt(job))
    },
    requestSignoff(slug, by, note = '') {
      store.update(slug, { status: 'awaiting_signoff', stage: 'signoff' })
      store.event(slug, 'human', `Requested sign-off.${note ? ` ${note}` : ''}`, { by, kind: 'request-signoff' })
    },
    signoff(slug, by) {
      store.update(slug, { status: 'packaging', stage: 'handoff', signedOffBy: by, signedOffAt: new Date().toISOString() })
      store.event(slug, 'human', 'Final sign-off.', { by, kind: 'signoff' })
      sig(slug, 'signoff', 'Final sign-off', by, { target: 'prototype' })
      enqueue(slug, P.signoffPrompt(store.get(slug)))
    },
    backToRefine(slug, by) {
      store.update(slug, { status: 'refine', stage: 'refine' })
      store.event(slug, 'human', 'Back to refine.', { by })
    },
    // 👍 / 👎 on a proposal or prototype. A thumbs-down with a note during review is feedback the agent acts on;
    // everything else is remembered and reaches the agent at the start of its next run.
    react(slug, target, value, note, by) {
      const job = store.get(slug)
      sig(slug, value === 'like' ? 'like' : 'dislike', note, by, { target })
      store.event(slug, 'human', `${value === 'like' ? '👍' : '👎'} ${target === 'proposal' ? 'Proposal' : 'Prototype'}${note ? `: ${note}` : ''}`, { by, kind: 'reaction' })
      if (value !== 'like' && note && !active.has(slug)) {
        if (job.status === 'direction' && target === 'proposal') return this.direction(slug, 'changes', note, by, [])
        if (['refine', 'awaiting_signoff'].includes(job.status) && target === 'prototype') return this.message(slug, note, [], by)
      }
    },
    // Questions from a dev team's agent (e.g. SpecKit clarify in the dev repo) about a handed-over project.
    devQuestions(slug, questions, from) {
      const qs = questions.map((q, i) => ({ id: `dq${Date.now().toString(36)}${i}`, text: String(q.text || q).slice(0, 2000), context: String(q.context || '').slice(0, 4000), from: from || 'dev', status: 'open', answer: null, askedAt: new Date().toISOString() }))
      store.update(slug, (j) => ({ devQuestions: [...(j.devQuestions || []), ...qs], prevStatus: j.status === 'working' ? j.prevStatus : j.status }))
      store.event(slug, 'human', `${qs.length} question${qs.length === 1 ? '' : 's'} from ${from || 'dev'}:\n${qs.map((q) => `• ${q.text}`).join('\n')}`, { by: from || 'dev', kind: 'dev-questions' })
      enqueue(slug, P.devQuestionsPrompt(store.get(slug), qs))
      return qs
    },
    // Maintenance work (Lumen check, taste tidy) runs as its own project with a custom prompt.
    run(slug, prompt) {
      enqueue(slug, prompt)
    },
    stop(slug) {
      queues.set(slug, [])
      active.get(slug)?.abort()
    },
    isRunning: (slug) => active.has(slug),
  }
}
