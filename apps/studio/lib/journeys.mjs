// Journey maps: each player journey as an ordered set of steps, today vs proposed, with friction,
// peer patterns and the KPI it moves. Stored in the repo (knowledge/journeys/journeys.json) so every
// design agent reads the same maps and they travel with git.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const clip = (s, n) => String(s ?? '').trim().slice(0, n)
const sid = () => crypto.randomUUID().slice(0, 8)
const slugify = (s) => clip(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'journey'
const CHANGES = ['same', 'changed', 'new', 'removed']
const KINDS = ['screen', 'system', 'message']

// One step of a journey. `source: 'human'` marks steps a person wrote, so the agent keeps them.
export function cleanStep(s = {}, by = null) {
  const img = clip(s.screen, 300)
  return {
    id: /^[a-z0-9-]{4,20}$/.test(String(s.id || '')) ? s.id : sid(),
    title: clip(s.title, 80) || 'Step',
    detail: clip(s.detail, 600),
    kind: KINDS.includes(s.kind) ? s.kind : 'screen',
    route: clip(s.route, 200),
    // screenshots are repo paths captured by the agent (never remote URLs)
    screen: /^(specs|knowledge)\/[\w./-]+\.(png|jpe?g|webp)$/i.test(img) && !img.includes('..') ? img : '',
    friction: clip(s.friction, 400),
    change: CHANGES.includes(s.change) ? s.change : 'same',
    why: clip(s.why, 400),
    source: s.source === 'human' || by ? 'human' : 'agent',
    ...(by ? { by } : s.by ? { by: clip(s.by, 40) } : {}),
  }
}

export function createJourneys(repoRoot) {
  const DIR = path.join(repoRoot, 'knowledge', 'journeys')
  const FILE = path.join(DIR, 'journeys.json')
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(FILE, 'utf8'))
    } catch {
      return []
    }
  }
  const write = (list) => {
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n')
  }
  const now = () => new Date().toISOString()

  return {
    file: 'knowledge/journeys/journeys.json',
    list: read,
    get: (id) => read().find((j) => j.id === id) || null,
    // A person adds a journey: a name, a goal and (optionally) the steps they have in mind.
    create({ name, goal, description, steps }, by) {
      const list = read()
      let id = slugify(name)
      for (let n = 2; list.some((j) => j.id === id); n++) id = `${slugify(name)}-${n}`
      const lines = Array.isArray(steps) ? steps : String(steps || '').split(/\n|,|→|->/).map((x) => x.trim()).filter(Boolean)
      const j = {
        id,
        name: clip(name, 80) || 'New journey',
        goal: clip(goal, 300),
        description: clip(description, 1500),
        surface: '',
        kpis: [],
        status: 'draft',
        current: [],
        proposed: lines.slice(0, 30).map((t) => cleanStep({ title: t, change: 'new' }, by)),
        peers: [],
        opportunities: [],
        impact: '',
        project: null,
        createdBy: by,
        createdAt: now(),
        updatedAt: now(),
      }
      write([...list, j])
      return j
    },
    // A person edits a journey in the editor (name, goal, or either lane of steps).
    patch(id, body, by) {
      const list = read()
      const j = list.find((x) => x.id === id)
      if (!j) throw new Error('No such journey')
      if ('name' in body) j.name = clip(body.name, 80) || j.name
      if ('goal' in body) j.goal = clip(body.goal, 300)
      if ('description' in body) j.description = clip(body.description, 1500)
      for (const lane of ['current', 'proposed']) {
        if (!Array.isArray(body[lane])) continue
        const before = new Map((j[lane] || []).map((s) => [s.id, s]))
        j[lane] = body[lane].slice(0, 40).map((s) => {
          const old = before.get(s.id)
          // untouched agent steps stay the agent's; anything a person changed or added becomes theirs
          const same = old && ['title', 'detail', 'friction', 'change', 'why', 'kind'].every((k) => (old[k] || '') === (clip(s[k], 600) || (k === 'change' ? 'same' : k === 'kind' ? 'screen' : '')))
          return same ? old : cleanStep({ ...old, ...s }, by)
        })
      }
      if ('project' in body) j.project = body.project || null
      j.updatedAt = now()
      j.updatedBy = by
      write(list)
      return j
    },
    remove(id) {
      write(read().filter((j) => j.id !== id))
    },
    // The agent submits what it mapped. People's steps and the linked project are kept.
    submit(items, runSlug) {
      const list = read()
      const out = []
      for (const it of items || []) {
        const id = /^[a-z0-9-]{2,70}$/.test(String(it.id || '')) ? it.id : slugify(it.name)
        let j = list.find((x) => x.id === id)
        if (!j) {
          j = { id, createdBy: 'Design Agent', createdAt: now(), project: null, proposed: [], current: [] }
          list.push(j)
        }
        Object.assign(j, {
          name: clip(it.name, 80) || j.name || id,
          goal: clip(it.goal, 300) || j.goal || '',
          surface: clip(it.surface, 80),
          kpis: (it.kpis || []).slice(0, 4).map((k) => clip(k, 120)).filter(Boolean),
          summary: clip(it.summary, 800),
          impact: clip(it.impact, 600),
          current: (it.current || []).slice(0, 40).map((s) => cleanStep(s)),
          proposed: (it.proposed || []).slice(0, 40).map((s) => cleanStep(s)),
          peers: (it.peers || []).slice(0, 8).map((p) => ({ peer: clip(p.peer, 60), pattern: clip(p.pattern, 400), source: clip(p.source, 300) })),
          opportunities: (it.opportunities || []).slice(0, 8).map((o) => ({ title: clip(o.title, 100), why: clip(o.why, 400), kpi: clip(o.kpi, 80), effort: clip(o.effort, 20) })),
          status: (it.proposed || []).length ? 'proposed' : 'mapped',
          mappedAt: now(),
          mappedBy: runSlug,
          updatedAt: now(),
          updatedBy: 'Design Agent',
        })
        out.push(j)
      }
      write(list)
      return out
    },
    // First use: the journeys the Head of Design described, as proposals still to be checked against the live site.
    seed(by) {
      if (fs.existsSync(FILE)) return
      const mk = (id, name, goal, kpis, description, steps) => ({
        id, name, goal, description, surface: '', kpis, status: 'draft', current: [],
        proposed: steps.map(([title, detail, kind = 'screen']) => cleanStep({ title, detail, kind, change: 'new' }, by)),
        peers: [], opportunities: [], impact: '', project: null, createdBy: by, createdAt: now(), updatedAt: now(), seeded: true,
      })
      write([
        mk('onboarding-to-first-deposit', 'Onboarding to first deposit', 'A new player joins, funds and is ready to play without getting lost.', ['#4 Median time from first deposit to first casino stake'],
          'Proposed by the Head of Design. Not yet checked against the live site: use Map with agent.', [
            ['Join', 'Email, then password.'],
            ['OTP', 'Verify with the code.'],
            ['Welcome', 'Welcome moment after verifying.'],
            ['Wallet open by default', 'The wallet is already open so the next step is to fund.'],
            ['If the wallet is closed: Intercom', 'Closing the wallet without depositing triggers an Intercom message offering help.', 'message'],
            ['Deposit: polling progress', 'While the deposit is pending, show its progress as it is polled.', 'system'],
            ['Alert: deposit cleared', 'Tell the player the moment the deposit clears.', 'message'],
          ]),
        mk('play-casino-game-rakeback', 'Play a casino game: rakeback on close', 'Closing a game shows the player what they earned, so rewards feel connected to play.', ['#5 30-day return rate', '#2 Casino play days per active player'],
          'Proposed by the Head of Design. Not yet checked against the live site: use Map with agent.', [
            ['Play a casino game', 'The player opens and plays a game.'],
            ['Close the game', 'The player closes the game.'],
            ['Coins fly to VIP', 'On close, coins travel to the VIP entry to represent the rakeback earned in that session.', 'system'],
          ]),
      ])
    },
  }
}
