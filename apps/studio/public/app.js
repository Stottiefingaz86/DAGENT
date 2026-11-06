import { md, esc } from './md.js'

// ---------------- state ----------------
const S = {
  config: null,
  jobs: [],
  job: null,
  slug: null,
  view: 'home', // home | job | skills
  panel: null, // null | proposal | prototype | spec | brd | feedback | handoff
  panelWide: false,
  device: 'desktop',
  files: [],
  surface: null,
  qDraft: {},
  qStep: 0,
  qMore: {},
  expanded: new Set(),
  docs: {},
  skills: null,
  search: '',
  openSteps: new Set(), // step groups the user expanded
}
const ls = {
  get(k, d) {
    try {
      const v = localStorage.getItem('studio.' + k)
      return v == null ? d : JSON.parse(v)
    } catch {
      return d
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('studio.' + k, JSON.stringify(v))
    } catch {}
  },
}
// Who you are comes from your studio login (the server decides your role).
const me = () => ({ role: S.user?.role === 'owner' ? 'owner' : 'requester', name: S.user?.name || '', id: S.user?.id })
const $ = (s, el = document) => el.querySelector(s)
const LOGO = '/files/apps/live-site/public/shell/design-agent/logo-mark.png'
const SURFACES = ['Rewards', 'Casino', 'Sports', 'Cashier', 'Account', 'Promotions', 'Poker', 'Marketing']
const ic = {
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  board: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>',
  proto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>',
  ask: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.5M12 17h.01"/></svg>',
  pack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  sign: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  reload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5"/></svg>',
  figma: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h3v6H9a3 3 0 010-6zM12 3h3a3 3 0 010 6h-3zM9 9h3v6H9a3 3 0 010-6zM15 9a3 3 0 110 6 3 3 0 010-6zM9 15h3v3a3 3 0 11-3-3z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  widen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>',
  side: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
  work: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>',
}

// ---------------- api ----------------
async function api(path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && data.signin) {
    authScreen('login')
    throw new Error(data.error || 'Sign in')
  }
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}
const toB64 = (f) =>
  new Promise((ok, no) => {
    const r = new FileReader()
    r.onload = () => ok({ name: f.name, type: f.type, data: String(r.result).split(',')[1] })
    r.onerror = no
    r.readAsDataURL(f)
  })

// ---------------- helpers ----------------
const ago = (iso) => {
  const s = Math.max(1, (Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
const stageIdx = (id) => S.config.stages.findIndex((s) => s.id === id)
const isWorking = (j) => j.running || j.status === 'working' || j.status === 'packaging'
const dot = (j) => (isWorking(j) ? 'working' : j.status === 'ready_for_dev' ? 'done' : j.status === 'error' ? 'error' : needsMe(j) ? 'gate' : '')
function needsMe(j) {
  if (isWorking(j)) return false
  if (j.status === 'direction' || j.status === 'awaiting_signoff') return me().role === 'owner'
  return ['questions', 'refine', 'idle', 'error'].includes(j.status)
}
function toast(title, text, onClick) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = `<b>${esc(title)}</b>${esc(text)}`
  el.onclick = () => (onClick?.(), el.remove())
  $('#toasts').append(el)
  setTimeout(() => el.remove(), 7000)
}
let ac
function chime() {
  try {
    ac = ac || new AudioContext()
    const t = ac.currentTime
    for (const [f, d] of [
      [880, 0],
      [1320, 0.09],
    ]) {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(0.07, t + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35)
      o.connect(g).connect(ac.destination)
      o.start(t + d)
      o.stop(t + d + 0.4)
    }
  } catch {}
}
function deriveTitle(text, files) {
  const h = /^#\s+(.+)$/m.exec(text || '')?.[1]
  const first = (text || '').split('\n').map((l) => l.trim()).find(Boolean)
  const f = files[0]?.name?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
  const t = (h || (first && first.length <= 80 ? first : null) || f || first || 'New BRD').replace(/^#+\s*/, '')
  return t.length > 70 ? t.slice(0, 67).trimEnd() + '…' : t
}

// ---------------- routing ----------------
function parse() {
  const [a, b, c] = location.hash.replace(/^#/, '').split('/')
  if (a === 'j' && b) return { view: 'job', slug: b, panel: c || null }
  if (a === 'skills') return { view: 'skills' }
  if (a === 'settings') return { view: 'settings' }
  return { view: 'home' }
}
async function route() {
  const r = parse()
  const changed = r.slug !== S.slug
  S.view = r.view
  S.slug = r.slug || null
  if (changed) Object.assign(S, { job: null, liveKey: '', liveUrl: null, liveFor: null, qDraft: {}, qStep: 0, qMore: {}, docs: {}, openSteps: new Set(), panel: r.panel })
  else if (r.panel !== undefined) S.panel = r.panel
  if (S.view === 'job') await loadJob()
  if (S.view === 'skills' && !S.skills) S.skills = await api('/api/skills')
  if (S.view === 'settings') {
    S.keys = await api('/api/keys').catch((e) => ({ error: e.message, keys: [] }))
    S.people = await api('/api/users').catch(() => [])
  }
  $('#app').classList.remove('side-shown')
  renderAll(changed)
}
const go = (h) => (location.hash === h ? route() : (location.hash = h))

// ---------------- data ----------------
const loadJobs = async () => (S.jobs = await api('/api/jobs'))
async function loadJob() {
  try {
    S.job = await api(`/api/jobs/${S.slug}`)
  } catch {
    S.job = null
  }
}
async function doc(name) {
  const f = S.job?.files?.[name]
  if (!f) return ''
  const key = `${name}:${S.job.updatedAt}`
  if (S.docs[key] == null) {
    const r = await fetch(`/files/specs/${S.slug}/${f}?t=${Date.now()}`)
    S.docs[key] = r.ok ? await r.text() : ''
  }
  return S.docs[key]
}

// ---------------- sidebar ----------------
function renderSide() {
  const L = S.config.links
  $('#link-demo').href = L.demo
  $('#link-lumen').href = L.lumen
  $('#link-figma').href = L.figma
  const u = me()
  $('#me-name').textContent = u.name
  $('#me-role').textContent = u.role === 'owner' ? 'Owner · signs off' : 'Requester'
  $('#me-avatar').textContent = (u.name[0] || '?').toUpperCase()
  const q = S.search.toLowerCase()
  const list = S.jobs.filter((j) => !q || `${j.title} ${j.surface}`.toLowerCase().includes(q))
  const groups = [
    ['Needs you', list.filter(needsMe)],
    ['In progress', list.filter((j) => !needsMe(j) && j.status !== 'ready_for_dev')],
    ['Ready for dev', list.filter((j) => j.status === 'ready_for_dev')],
  ]
  const item = (j) =>
    `<a class="proj ${j.slug === S.slug ? 'is-active' : ''}" href="#j/${j.slug}"><span class="dot ${dot(j)}"></span><span class="name">${esc(j.title)}</span><span class="meta">${ago(j.updatedAt)}</span></a>`
  $('#projects').innerHTML = list.length
    ? groups
        .filter(([, js]) => js.length)
        .map(([name, js]) => `<div><div class="group-label">${name}${name === 'Needs you' ? ` <span class="n">${js.length}</span>` : ''}</div>${js.map(item).join('')}</div>`)
        .join('')
    : `<div class="none">${q ? 'No matches' : 'No projects yet. Start one with New BRD.'}</div>`
  const n = S.jobs.filter(needsMe).length
  document.title = n ? `(${n}) Design Studio` : 'Design Studio'
}

// ---------------- top bar ----------------
function renderTop() {
  const top = $('#top')
  const sideBtn = `<button class="icon-btn side-open" data-act="side" aria-label="Show sidebar">${ic.side}</button>`
  if (S.view !== 'job' || !S.job) {
    top.className = 'top'
    top.innerHTML = `${sideBtn}<span class="spacer"></span>${S.config.connected ? '' : '<a class="demo-flag" href="#settings" style="text-decoration:none">Agent not connected</a>'}`
    return
  }
  const j = S.job
  const i = stageIdx(j.stage)
  const n = S.config.stages.length
  const bar = S.config.stages.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')
  const hasWork = j.files.proposal || j.previewUrl || j.files.spec || j.files.delivery
  top.className = 'top has-border'
  top.innerHTML = `${sideBtn}<span class="dot ${dot(j)}"></span><h1>${esc(j.title)}</h1><span class="spacer"></span>
    <span class="progress" title="${esc(S.config.stages.map((s) => s.label).join(' → '))}"><span class="label">${esc(S.config.stages[i]?.label || j.stage)} · ${i + 1} of ${n}</span><span class="bar">${bar}</span></span>
    ${S.config.connected ? '' : '<a class="demo-flag" href="#settings" style="text-decoration:none">Not connected</a>'}
    ${hasWork && !S.panel ? `<button class="pill-btn" data-panel="${j.previewUrl ? 'prototype' : j.files.proposal ? 'proposal' : 'spec'}">${ic.work}Work</button>` : ''}
    <button class="icon-btn" data-act="job-menu" aria-label="More">${ic.more}</button>`
}

// ---------------- thread ----------------
function stepsBlock(items, live, key) {
  const open = S.openSteps.has(key)
  const last = items[items.length - 1]
  const summary = live ? `<span class="spin"></span><span class="live">${esc(last.text)}</span>` : `${ic.chev}Worked · ${items.length} step${items.length === 1 ? '' : 's'}`
  return `<details class="steps indent" data-steps="${key}" ${open ? 'open' : ''}><summary>${summary}</summary><ol>${items.map((e) => `<li class="${e.who === 'agent-log' ? 'note' : ''}" title="${esc(e.text)}">${esc(e.text)}${e.data?.image ? `<button type="button" class="step-img" data-zoom="${esc(imgSrc(e.data.image))}" data-caption="${esc(e.text)}"><img src="${esc(imgSrc(e.data.image))}" alt="" loading="lazy"></button>` : ''}</li>`).join('')}</ol></details>`
}
function shots(list, label) {
  if (!list?.length) return ''
  return `<div class="pb-block"><div class="pb-label">${label}</div><div class="pb-shots">${list
    .map((im) => `<button type="button" class="q-img" data-zoom="${esc(imgSrc(im.src))}" data-caption="${esc(im.caption || '')}"><img src="${esc(imgSrc(im.src))}" alt="${esc(im.caption || label)}" loading="lazy"><span>${esc(im.caption || '')}</span></button>`)
    .join('')}</div></div>`
}
function proposalCard(b, n, total) {
  const latest = n === total
  return `<article class="card pboard ${latest ? '' : 'is-old'}">
    <div class="card-head"><span class="card-icon">${ic.board}</span><div style="min-width:0"><div class="card-title">Proposal${total > 1 ? ` · v${n}` : ''}${latest ? '' : ' <span class="old-tag">superseded</span>'}</div>${b.strategy ? `<div class="card-sub">${esc(b.strategy)}</div>` : ''}</div></div>
    <div class="pb-body">
      <div class="prose pb-summary">${md(b.summary || '')}</div>
      ${b.journey?.length ? `<div class="pb-block"><div class="pb-label">Journey</div><ol class="pb-journey">${b.journey.map((s) => `<li><b>${esc(s.step)}</b>${s.detail ? `<span>${esc(s.detail)}</span>` : ''}</li>`).join('')}</ol></div>` : ''}
      ${shots(b.current, 'Today')}
      ${shots(b.proposed, 'Proposed')}
      ${b.peers?.length ? `<div class="pb-block"><div class="pb-label">Peers</div><div class="pb-list">${b.peers.map((p) => `<div class="pb-row"><b>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noreferrer">${esc(p.name)}</a>` : esc(p.name)}</b>${p.take ? `<span>Take: ${esc(p.take)}</span>` : ''}${p.avoid ? `<span>Don’t: ${esc(p.avoid)}</span>` : ''}</div>`).join('')}</div></div>` : ''}
      ${b.reuse?.length ? `<div class="pb-block"><div class="pb-label">Reuses</div><div class="pb-chips">${b.reuse.map((r) => `<span class="pb-chip" title="${esc([r.path, r.note].filter(Boolean).join(' — '))}">${esc(r.component)}${r.path ? `<code>${esc(r.path.split('/').pop())}</code>` : ''}</span>`).join('')}</div></div>` : ''}
      ${b.gaps?.length ? `<div class="pb-block"><div class="pb-label">Gaps · component briefs</div><ul class="pb-gaps">${b.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>` : ''}
      ${b.questions?.length ? `<div class="pb-block"><div class="pb-label">Open questions</div><ol class="pb-qs">${b.questions.map((q) => `<li><b>${esc(q.title)}</b>${q.context ? `<span>${esc(q.context)}</span>` : ''}${q.options?.length ? `<span class="pb-opts">${q.options.map(esc).join(' · ')}</span>` : ''}</li>`).join('')}</ol><div class="pb-hint">Answer these in your direction note or the chat.</div></div>` : ''}
    </div>
  </article>`
}
const liveVisible = (j) => !!j.previewUrl && ['refine', 'awaiting_signoff', 'packaging', 'ready_for_dev'].includes(j.status)
function versionCard(v, n, total) {
  return `<div class="card pboard is-old"><div class="card-head"><span class="card-icon">${ic.proto}</span><div style="min-width:0"><div class="card-title">Prototype · v${n} <span class="old-tag">earlier version</span></div><div class="card-sub">${esc(v.summary || '')}</div></div></div>
    ${v.changes?.length ? `<div class="pb-body"><ul class="pb-gaps">${v.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
    ${v.screens?.length ? `<div class="pb-body">${shots(v.screens, 'Screens')}</div>` : ''}</div>`
}
function liveHTML(j) {
  const versions = j.prototypes || []
  const v = versions[versions.length - 1] || { previewUrl: j.previewUrl, summary: j.prototypeSummary }
  const n = Math.max(versions.length, 1)
  const url = (S.liveUrl && S.liveFor === j.slug ? S.liveUrl : v.previewUrl || j.previewUrl)
  const states = v.states || []
  const mobile = S.device === 'mobile'
  return `<article class="card live" id="live-card">
    <div class="card-head"><span class="card-icon live-icon">${ic.proto}</span><div style="min-width:0;flex:1"><div class="card-title">Working prototype${n > 1 ? ` · v${n}` : ''}</div><div class="card-sub live-sum">${esc(v.summary || 'Click around — it’s the real site.')}</div></div></div>
    <div class="live-bar"><span class="seg"><button type="button" data-dev="desktop" aria-pressed="${!mobile}">Desktop</button><button type="button" data-dev="mobile" aria-pressed="${mobile}">390</button></span>
      <span class="live-lane" id="live-lane"></span>
      ${j.figma?.url ? `<a class="btn ghost" href="${esc(j.figma.url)}" target="_blank" rel="noreferrer">${ic.figma}Figma</a>` : me().role === 'owner' && !j.running ? `<button type="button" class="btn ghost" data-act="figma">${ic.figma}Build in Figma</button>` : ''}
      <button type="button" class="icon-btn" data-act="live-reload" aria-label="Reload prototype">${ic.reload}</button>
      <a class="icon-btn" href="${esc(url)}" target="_blank" rel="noreferrer" aria-label="Open full window">${ic.open}</a></div>
    ${states.length ? `<div class="live-states">${[{ label: 'Default', url: v.previewUrl }, ...states].map((st) => `<button type="button" class="chip" data-live-url="${esc(absProto(st.url))}" aria-pressed="${absProto(st.url) === url}">${esc(st.label)}</button>`).join('')}</div>` : ''}
    <div class="live-frame ${mobile ? 'mobile' : ''}" data-w="${mobile ? 390 : 1440}" data-h="${mobile ? 844 : 900}"><iframe title="Working prototype" src="${esc(url)}" loading="lazy"></iframe>
      <div class="live-offline" hidden><div class="live-wait"><span class="spin"></span><span class="live-msg">Starting the prototype…</span></div></div></div>
    ${v.changes?.length ? `<div class="pb-body"><div class="pb-block"><div class="pb-label">${n > 1 ? 'What changed' : 'What’s in it'}</div><ul class="pb-gaps">${v.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></div>` : ''}
    ${v.screens?.length ? `<div class="pb-body">${shots(v.screens, 'Checked by the agent')}</div>` : ''}
  </article>`
}
const absProto = (u) => (/^https?:/.test(u || '') ? u : `${S.config.links.prototypeOrigin}${u?.startsWith('/') ? '' : '/'}${u || ''}`)
function fitLive() {
  const f = document.querySelector('.live-frame')
  if (!f) return
  const w = Number(f.dataset.w)
  const h = Number(f.dataset.h)
  const ifr = f.querySelector('iframe')
  const avail = f.clientWidth
  const scale = Math.min(1, (f.classList.contains('mobile') ? Math.min(avail, 360) : avail) / w)
  ifr.style.width = w + 'px'
  ifr.style.height = h + 'px'
  ifr.style.transform = `scale(${scale})`
  f.style.height = Math.round(h * scale) + 'px'
}
addEventListener('resize', fitLive)
// The studio runs the prototype lane itself; the card just shows where it is.
function laneUI() {
  const off = document.querySelector('.live-offline')
  if (!off) return
  const st = S.config.lane || {}
  const busy = st.status === 'installing' || st.status === 'starting'
  const msg = off.querySelector('.live-msg')
  off.querySelector('.spin').hidden = !busy
  if (st.status === 'running') off.hidden = true
  else {
    off.hidden = false
    msg.innerHTML = busy ? esc(st.message || 'Starting the prototype…') : `${esc(st.message || 'The prototype isn’t running.')} <button type="button" class="btn" data-act="lane-start">Start it</button>`
  }
  const tag = $('#live-lane')
  if (tag) tag.textContent = st.status === 'running' ? '' : busy ? 'Starting…' : ''
}
async function probeLive() {
  if (!document.querySelector('.live-offline')) return
  try {
    await fetch(S.config.links.prototypeOrigin, { mode: 'no-cors', signal: AbortSignal.timeout(2500) })
    S.config.lane = { ...(S.config.lane || {}), status: 'running' }
  } catch {
    if (S.config.lane?.status === 'running' || !S.config.lane?.status || S.config.lane.status === 'unknown') S.config.lane = await api('/api/lane', { method: 'POST' }).catch(() => ({ status: 'error', message: 'Couldn’t reach the studio.' }))
  }
  laneUI()
}
function workCard(kind, title, sub, panel) {
  const icon = { proposal: ic.board, prototype: ic.proto, handoff: ic.pack, brd: ic.doc }[kind]
  return `<div class="card indent-card"><div class="card-head"><span class="card-icon">${icon}</span><div style="min-width:0"><div class="card-title">${esc(title)}</div><div class="card-sub">${esc(sub)}</div></div><button class="btn open" data-panel="${panel}">Open</button></div></div>`
}
function threadHTML() {
  const j = S.job
  const out = []
  const ev = j.events || []
  // first message: the BRD
  out.push(
    `<div class="msg-user"><div class="by">${esc(j.requester || 'BRD')} · ${esc(j.source)}</div><b>${esc(j.title)}</b>${j.surface && j.surface !== 'Other' ? ` <span style="color:var(--faint)">· ${esc(j.surface)}</span>` : ''}<div style="margin-top:8px"><button class="btn" data-panel="brd">${ic.doc}Open BRD${j.files.brdPdf ? ' · PDF' : ''}</button></div></div>`,
  )
  let group = []
  let gi = 0
  let pi = 0
  let vi = 0
  const versions = j.prototypes || []
  const live = liveVisible(j)
  const flush = (live = false) => {
    if (group.length) out.push(stepsBlock(group, live, `g${gi++}`))
    group = []
  }
  for (const e of ev) {
    if (e.who === 'tool' || e.who === 'agent-log') {
      group.push(e)
      continue
    }
    if (e.who === 'system' && /^Stage → /.test(e.text)) {
      // stage changes are shown as dividers, outside step groups
      flush()
      out.push(`<div class="divider">${esc(e.text.replace(/^Stage → /, '').split(' · ')[0])}</div>`)
      continue
    }
    flush()
    if (e.who === 'agent') {
      const long = e.text.length > 360 && !S.expanded.has(e.t)
      const text = long ? e.text.slice(0, 260).replace(/\s+\S*$/, '') + '…' : e.text
      out.push(`<div class="msg-agent"><span class="who"><img src="${LOGO}" alt="Design agent"></span><div class="body prose">${md(text)}${long ? `<button type="button" class="link-btn" data-expand="${esc(e.t)}">Show more</button>` : ''}</div></div>`)
    }
    else if (e.who === 'human') {
      if (e.data?.kind === 'answers') out.push(`<div class="msg-user"><div class="by">${esc(e.data?.by || 'You')} · answers</div><div class="prose">${md(e.text)}</div></div>`)
      else {
        const shots = (e.data?.shots || []).map((s) => `<img src="/files/${encodeURI(s)}" alt="Screenshot">`).join('')
        out.push(`<div class="msg-user"><div class="by">${esc(e.data?.by || 'You')}</div><div class="prose">${md(e.text)}</div>${shots}</div>`)
      }
    } else if (/^Learned → /.test(e.text)) {
      const [file, ...rule] = e.text.replace(/^Learned → /, '').split(': ')
      out.push(`<div class="learned indent"><span>Learned · <code>${esc(file)}</code> ${esc(rule.join(': '))}</span></div>`)
    } else if (/^Proposal ready/.test(e.text)) {
      const board = (j.proposals || [])[pi++]
      out.push(board && (board.current || board.proposed || board.journey) ? proposalCard(board, pi, (j.proposals || []).length) : workCard('proposal', 'Proposal board', e.data?.summary || '', 'proposal'))
    }
    else if (/^Prototype ready/.test(e.text)) {
      const v = versions[vi++]
      const isLatest = vi === versions.length
      if (live && isLatest) continue // shown as the live prototype below
      out.push(v ? versionCard(v, vi, versions.length) : workCard('prototype', 'Prototype', e.data?.summary || e.data?.previewUrl || '', 'prototype'))
    }
    else if (/^Figma screens ready/.test(e.text) && j.figma) out.push(`<div class="card"><div class="card-head"><span class="card-icon">${ic.figma}</span><div style="min-width:0"><div class="card-title">Figma screens</div><div class="card-sub">${(j.figma.frames || []).length} frames · Lumen library only${(j.figma.gaps || []).length ? ` · ${j.figma.gaps.length} gaps` : ''}</div></div><a class="btn open" href="${esc(j.figma.url)}" target="_blank" rel="noreferrer">Open in Figma</a></div></div>`)
    else if (/^Dev handoff package ready/.test(e.text)) out.push(workCard('handoff', 'Dev handoff', 'dev-delivery.md — components, tokens, motion, copy, acceptance', 'handoff'))
    else if (/question/.test(e.text) && e.data?.questions) continue // shown as the live card below
    else if (/^BRD received/.test(e.text)) continue
    else out.push(`<div class="sys">${esc(e.text)}</div>`)
  }
  flush(isWorking(j))
  if (isWorking(j) && !(ev.length && (ev[ev.length - 1].who === 'tool' || ev[ev.length - 1].who === 'agent-log'))) {
    out.push(`<div class="msg-agent"><span class="who"><img src="${LOGO}" alt=""></span><div class="typing" aria-label="Agent working"><i></i><i></i><i></i></div></div>`)
  }
  return out.join('')
}
// Questions: short title, context with sources, options with label/detail/recommended.
function normQ(q) {
  const options = (q.options || []).map((o) => {
    if (typeof o === 'object') return { label: o.label, detail: o.detail || '', recommended: !!o.recommended, image: o.image || '' }
    let t = String(o)
    const rec = /\(recommended\)/i.test(t)
    t = t.replace(/\s*\(recommended\)\s*/i, ' ').trim()
    const m = /^(?:[A-E]\s*[—–-]\s*)?(.{3,70}?)(?:[.:]\s+|\s+[—–]\s+)(.+)$/s.exec(t)
    return m && t.length > 70 ? { label: m[1].replace(/^[A-E]\s*[—–-]\s*/, ''), detail: m[2], recommended: rec } : { label: t.replace(/^[A-E]\s*[—–-]\s*/, ''), detail: '', recommended: rec }
  })
  let title = q.title || q.text || ''
  let context = q.context || ''
  if (!q.title && title.length > 140) {
    // older questions: put the finding in context, keep the last sentence (the ask) as the title
    const parts = title.split(/(?<=[.!?])\s+/)
    const ask = parts.reverse().find((x) => x.trim().endsWith('?')) || parts[0]
    context = title.replace(ask, '').trim()
    title = ask
  }
  return { ...q, title, context, options }
}
const imgSrc = (src) => (/^https?:\/\//.test(src) ? src : `/files/${String(src).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`)
function zoom(src, caption) {
  const root = $('#modal-root')
  root.innerHTML = `<figure class="lightbox"><img src="${esc(src)}" alt="${esc(caption || 'Screenshot')}"><figcaption>${esc(caption || '')}</figcaption></figure>`
  root.hidden = false
  root.onclick = () => ((root.hidden = true), (root.innerHTML = ''))
}
function answerFor(q) {
  const d = S.qDraft[q.id] || {}
  const note = (d.note || '').trim()
  return d.opt ? (note ? `${d.opt} — ${note}` : d.opt) : note
}
function gateCard(j) {
  if (isWorking(j)) return ''
  const owner = me().role === 'owner'
  const open = (j.questions || []).filter((q) => !q.answer)
  if (j.status === 'questions' && open.length) {
    const i = Math.min(S.qStep || 0, open.length - 1)
    const q = normQ(open[i])
    const d = S.qDraft[q.id] || {}
    const done = open.filter((x) => answerFor(normQ(x))).length
    const last = i === open.length - 1
    const ctx = q.context ? (q.context.length > 260 && !S.qMore[q.id] ? md(q.context.slice(0, 240).replace(/\s+\S*$/, '') + '…').replace(/<\/p>\s*$/, ` <button type="button" class="link-btn" data-qmore="${q.id}">More</button></p>`) : md(q.context)) : ''
    return `<form class="card is-gate qcard" id="q-form">
      <div class="q-top"><span class="q-step">${open.length > 1 ? `Question ${i + 1} of ${open.length}` : 'Question'}</span>${open.length > 1 ? `<span class="q-dots">${open.map((x, k) => `<i class="${k === i ? 'now' : answerFor(normQ(x)) ? 'done' : ''}"></i>`).join('')}</span>` : ''}</div>
      <div class="q-body">
        <h3 class="q-title">${esc(q.title)}</h3>
        ${ctx ? `<div class="q-context prose">${ctx}</div>` : ''}
        ${q.images?.length ? `<div class="q-images ${q.images.length === 1 ? 'one' : ''}">${q.images.map((im) => `<button type="button" class="q-img" data-zoom="${esc(imgSrc(im.src))}" data-caption="${esc(im.caption || '')}"><img src="${esc(imgSrc(im.src))}" alt="${esc(im.caption || 'Reference screenshot')}" loading="lazy"><span>${esc(im.caption || '')}</span></button>`).join('')}</div>` : ''}
        ${q.options.length ? `<div class="q-opts" role="radiogroup" aria-label="${esc(q.title)}">${q.options
          .map(
            (o, k) => `<button type="button" class="q-opt" role="radio" aria-checked="${d.opt === o.label}" data-q="${q.id}" data-opt="${esc(o.label)}"><span class="radio"></span>${o.image ? `<img class="q-opt-img" src="${esc(imgSrc(o.image))}" alt="">` : ''}<span class="q-opt-text"><span class="q-opt-label">${esc(o.label)}${o.recommended ? '<span class="rec">Recommended</span>' : ''}</span>${o.detail ? `<span class="q-opt-detail">${esc(o.detail)}</span>` : ''}</span></button>`,
          )
          .join('')}</div>` : ''}
        <textarea class="field-in q-note" id="q-${q.id}" data-qa="${q.id}" rows="1" placeholder="${q.options.length ? 'Add a note, or write your own answer' : 'Your answer'}">${esc(d.note || '')}</textarea>
        ${q.why ? `<div class="q-why"><b>Why it matters</b> ${esc(q.why)}</div>` : ''}
      </div>
      <div class="card-actions"><span class="note">${done}/${open.length} answered · goes into spec.md</span>${i > 0 ? '<button type="button" class="btn ghost" data-qnav="-1">Back</button>' : ''}${last ? '<button class="btn primary" type="submit">Send answers</button>' : `<button type="button" class="btn primary" data-qnav="1" ${answerFor(q) ? '' : 'disabled'}>Next</button>`}</div>
    </form>`
  }
  if (j.status === 'direction') {
    return `<div class="card is-gate gate-slim"><div class="gate-text"><b>${owner ? 'Happy with this direction?' : 'Waiting for Chris'}</b><span>${owner ? 'Approve and the agent builds the working prototype. Not quite? Say what to change in the box below and paste screenshots for reference.' : 'Chris approves the direction before anything is built.'}</span></div>
      ${owner ? `<div class="gate-actions">${j.files.proposal ? '<button class="btn ghost" data-panel="proposal">Full board</button>' : ''}<button class="btn primary" data-act="approve">Approve direction</button></div>` : ''}</div>`
  }
  if (j.status === 'refine') {
    return `<div class="card is-gate gate-slim"><div class="gate-text"><b>Looks right?</b><span>Not yet? Type feedback below and paste screenshots — each message is round ${(j.round || 0) + 1}, logged and learned.</span></div>
      <div class="gate-actions"><button class="btn" data-act="request-signoff">Request sign-off</button>${owner ? '<button class="btn primary" data-act="signoff">Final sign-off</button>' : ''}</div></div>`
  }
  if (j.status === 'awaiting_signoff') {
    return `<div class="card is-gate"><div class="card-head"><span class="card-icon">${ic.sign}</span><div><div class="card-title">${owner ? 'Sign-off requested' : 'Waiting for Chris’s sign-off'}</div><div class="card-sub">Final sign-off packages the handoff for the dev repo.</div></div><button class="btn open" data-panel="prototype">Open prototype</button></div>
      ${owner ? '<div class="card-actions"><button class="btn" data-act="back-to-refine">Back to refine</button><button class="btn primary" data-act="signoff">Final sign-off</button></div>' : ''}</div>`
  }
  if (j.status === 'error') {
    return `<div class="card is-gate"><div class="card-head"><span class="card-icon">${ic.warn}</span><div><div class="card-title">The run stopped</div><div class="card-sub">See the last lines above. Retry picks up the last step.</div></div></div><div class="card-actions"><button class="btn primary" data-act="retry">Retry</button></div></div>`
  }
  if (j.status === 'ready_for_dev' && owner) {
    return `<div class="card"><div class="card-head"><span class="card-icon">${ic.pack}</span><div><div class="card-title">Ready for dev</div><div class="card-sub">Signed off${j.signedOffBy ? ` by ${esc(j.signedOffBy)}` : ''}. Hand the delivery file to the dev repo.</div></div><button class="btn open" data-panel="handoff">Open handoff</button></div><div class="card-actions"><button class="btn" data-act="back-to-refine">Back to refine</button></div></div>`
  }
  return ''
}
function homeHTML() {
  const mine = S.jobs.filter(needsMe)
  return `<div class="home">
    <h2><img src="${LOGO}" alt="">What are we designing?</h2>
    <p class="sub">Paste a BRD or drop the PDF. The agent specs it against the strategy, asks what it needs, and brings you a proposal.</p>
    ${S.config.connected ? '<div class="home-box" id="home-slot"></div>' : connectHTML()}
    ${mine.length ? `<div class="home-cards"><div class="label">Needs you</div>${mine.map((j) => `<a class="gate-row" href="#j/${j.slug}"><span class="dot gate"></span><div style="min-width:0"><b>${esc(j.title)}</b><span class="s">${esc(S.config.statuses[j.status]?.gate || '')}</span></div><span class="go">Open</span></a>`).join('')}</div>` : ''}
    <p class="sub" style="margin-top:0;font-size:13px">BRDs from other repos land in <code>inbox/</code> and show up in the sidebar.</p>
  </div>`
}
function connectHTML() {
  return `<form class="card is-gate" id="connect-form" style="max-width:560px;margin:0 auto;width:100%">
    <div class="card-head"><span class="card-icon">${ic.sign}</span><div><div class="card-title">Connect the design agent</div><div class="card-sub">Paste an Anthropic API key once. It’s saved on this Mac in apps/studio/.env.keys (git-ignored) and only used to call Claude. Change or add keys later in Settings.</div></div></div>
    <div class="card-body"><input class="field-in" id="connect-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" aria-label="Anthropic API key">
    <div class="card-sub">Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com → API keys</a>. Billed per use; each project shows its cost.</div>
    <div class="card-sub" id="connect-err" style="color:var(--err)" hidden></div></div>
    <div class="card-actions"><button class="btn primary" type="submit">Connect</button></div></form>`
}
function settingsHTML() {
  const K = S.keys || { keys: [] }
  const owner = me().role === 'owner'
  const rows = K.keys.length
    ? K.keys
        .map(
          (k) => `<div class="gate-row" style="cursor:default"><span class="dot ${k.id === K.active ? 'done' : ''}"></span><div style="min-width:0"><b>${esc(k.label)}${k.id === K.active ? ' · active' : ''}</b><span class="s"><code>${esc(k.hint)}</code> · added ${new Date(k.addedAt).toLocaleDateString()}</span></div>
          <span style="margin-left:auto;display:flex;gap:6px">${owner && k.id !== K.active ? `<button class="btn" data-key-activate="${k.id}">Use this key</button>` : ''}${owner ? `<button class="btn ghost" data-key-remove="${k.id}">Remove</button>` : ''}</span></div>`,
        )
        .join('')
    : '<div class="none" style="padding:0">No keys yet. Add one below to connect the design agent.</div>'
  const P = S.people || []
  const people = `<div class="skill-group"><h3>People · ${P.length}</h3><div class="home-cards">${P.map(
    (u) => `<div class="gate-row" style="cursor:default"><span class="avatar-sm">${esc((u.name[0] || '?').toUpperCase())}</span><div style="min-width:0"><b>${esc(u.name)}${u.id === me().id ? ' · you' : ''}</b><span class="s">${esc(u.username)} · ${u.role === 'owner' ? 'Owner' : 'Requester'}</span></div>
      ${owner && u.id !== me().id ? `<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost" data-user-role="${u.id}" data-to="${u.role === 'owner' ? 'requester' : 'owner'}">Make ${u.role === 'owner' ? 'Requester' : 'Owner'}</button><button class="btn ghost" data-user-pass="${u.id}">Reset password</button><button class="btn ghost" data-user-remove="${u.id}">Remove</button></span>` : ''}</div>`,
  ).join('')}</div></div>
    ${owner ? `<form class="card" id="user-form" style="max-width:560px"><div class="card-head"><div><div class="card-title">Add a person</div><div class="card-sub">Give them the username and password yourself; they can change the password after signing in.</div></div></div>
      <div class="card-body"><input class="field-in" id="nu-name" placeholder="Name" maxlength="40" required aria-label="Name"><input class="field-in" id="nu-user" placeholder="Username or email" required aria-label="Username or email"><input class="field-in" id="nu-pass" type="password" autocomplete="new-password" placeholder="Temporary password (10+ characters)" required aria-label="Temporary password">
      <label class="card-sub" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="nu-owner"> Owner (can approve, sign off, delete and manage people)</label><div class="card-sub" id="nu-err" style="color:var(--err)" hidden></div></div>
      <div class="card-actions"><button class="btn primary" type="submit">Add person</button></div></form>` : ''}`
  return `<div class="skills"><div><h2>Settings</h2><p>Who can use the studio, and the API keys the agent uses.</p></div>${people}<div><p>API keys the design agent uses to call Claude. Stored on this Mac in <code>apps/studio/.env.keys</code> (git-ignored). The active key is used for every run.</p></div>
    ${K.error ? `<div class="card-sub" style="color:var(--err)">${esc(K.error)}</div>` : ''}
    <div class="skill-group"><h3>API keys</h3><div class="home-cards">${rows}</div></div>
    ${owner ? `<form class="card" id="key-form" style="max-width:560px"><div class="card-head"><div><div class="card-title">Add a key</div><div class="card-sub">e.g. a business key. Create keys at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.</div></div></div>
      <div class="card-body"><input class="field-in" id="key-label" placeholder="Label, e.g. Business" maxlength="40" aria-label="Key label"><input class="field-in" id="key-value" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" aria-label="API key">
      <label class="card-sub" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="key-active" checked> Make it the active key</label><div class="card-sub" id="key-err" style="color:var(--err)" hidden></div></div>
      <div class="card-actions"><button class="btn primary" type="submit">Add key</button></div></form>` : '<div class="card-sub">Only the Owner can add or change keys.</div>'}
  </div>`
}
function skillsHTML() {
  return `<div class="skills"><div><h2>Skills</h2><p>What the design agent reads before it designs. Edit these in the repo and the next run picks them up.</p></div>
    ${(S.skills || [])
      .filter((g) => g.items.length)
      .map((g) => `<div class="skill-group"><h3>${esc(g.name)} · ${g.items.length}</h3><div class="skill-grid">${g.items.map((i) => `<a class="skill" href="/files/${encodeURI(i.path)}" target="_blank" rel="noreferrer"><b>${esc(i.title)}</b><span>${esc(i.path)}</span></a>`).join('')}</div></div>`)
      .join('')}</div>`
}

// ---------------- composer ----------------
const composer = $('#composer')
const input = $('#input')
function placeComposer() {
  const slot = $('#home-slot')
  if (S.view === 'home' && slot) slot.append(composer)
  else if (composer.parentElement !== $('#main')) $('#main').append(composer)
  composer.classList.toggle('is-home', S.view === 'skills' || S.view === 'settings' || (S.view === 'job' && !S.job) || (S.view === 'home' && !S.config.connected))
  const j = S.job
  const home = S.view === 'home'
  input.placeholder = home
    ? 'Paste the BRD here, or attach the PDF'
    : j?.status === 'direction'
      ? 'What should change? Paste or drop screenshots for reference'
      : j?.status === 'refine' || j?.status === 'awaiting_signoff'
        ? 'Feedback on the prototype — paste or drop screenshots'
      : j?.status === 'questions'
        ? 'Answer above, or reply in your own words'
        : 'Reply to the design agent'
  $('#composer-hint').textContent = home ? 'Surface optional' : j?.status === 'refine' || j?.status === 'awaiting_signoff' ? `Round ${(j.round || 0) + 1} · logged and learned` : j?.status === 'direction' ? 'Change request · logged in feedback.md' : ''
  $('#surface-chips').innerHTML = home ? SURFACES.map((s) => `<button type="button" class="chip" data-surface="${s}" aria-pressed="${S.surface === s}">${s}</button>`).join('') : ''
  $('#file').accept = home ? '.pdf,.md,.txt,image/*' : 'image/*,.pdf'
  renderFiles()
  updateSend()
  autosize()
}
function renderFiles() {
  $('#files').innerHTML = S.files.map((f, i) => `<span class="file">${esc(f.name)}<button type="button" data-rm="${i}" aria-label="Remove ${esc(f.name)}">×</button></span>`).join('')
  updateSend()
}
function updateSend() {
  $('#send').disabled = !input.value.trim() && !S.files.length
}
function autosize() {
  input.style.height = 'auto'
  input.style.height = Math.min(input.scrollHeight, 240) + 'px'
}
async function addFiles(list) {
  for (const f of list) {
    if (S.view === 'home' && /\.(md|txt)$/i.test(f.name) && !input.value.trim()) {
      input.value = await f.text()
      autosize()
    }
    S.files.push(f)
  }
  renderFiles()
}
composer.addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text && !S.files.length) return
  const files = await Promise.all(S.files.map(toB64))
  const send = $('#send')
  send.disabled = true
  try {
    if (S.view === 'home') {
      const job = await api('/api/jobs', { title: deriveTitle(text, S.files), surface: S.surface || 'Other', brief: text, files })
      reset()
      await loadJobs()
      go(`#j/${job.slug}`)
    } else {
      reset()
      await act('message', { text, files })
    }
  } catch (err) {
    toast('Couldn’t send', err.message)
    send.disabled = false
  }
  function reset() {
    input.value = ''
    autosize()
    S.files = []
    S.surface = null
    renderFiles()
  }
})
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    composer.requestSubmit()
  }
})
input.addEventListener('input', () => (autosize(), updateSend()))
input.addEventListener('paste', (e) => {
  const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
  if (imgs.length) {
    e.preventDefault()
    addFiles(imgs.map((f, i) => new File([f], `screenshot-${Date.now()}-${i}.png`, { type: f.type })))
  }
})
$('#file').addEventListener('change', (e) => (addFiles([...e.target.files]), (e.target.value = '')))
for (const ev of ['dragover', 'dragleave', 'drop']) {
  document.addEventListener(ev, (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    composer.classList.toggle('drop-over', ev === 'dragover')
    if (ev === 'drop') addFiles([...e.dataTransfer.files])
  })
}

// ---------------- work panel ----------------
function panelTabs(j) {
  const f = j.files
  return [
    ['proposal', 'Proposal', !!f.proposal],
    ['prototype', 'Prototype', !!j.previewUrl],
    ['spec', 'Spec', !!f.spec],
    ['brd', 'BRD', true],
    ['feedback', `Feedback${j.round ? ` · ${j.round}` : ''}`, !!(f.feedback || (j.learnings || []).length)],
    ['handoff', 'Handoff', !!f.delivery],
  ].filter((t) => t[2])
}
let panelKey = ''
async function renderPanel(force = false) {
  const el = $('#panel')
  const j = S.job
  if (S.view !== 'job' || !j || !S.panel) {
    el.hidden = true
    panelKey = ''
    return
  }
  el.hidden = false
  el.classList.toggle('is-wide', S.panelWide)
  const key = [S.panel, S.device, S.panelWide, j.previewUrl, j.files.proposal && j.proposalSummary, S.panel === 'proposal' || S.panel === 'prototype' ? '' : j.updatedAt].join('|')
  if (!force && key === panelKey) return // keep iframes steady while the chat updates
  panelKey = key
  const tabs = panelTabs(j)
  const head = `<div class="panel-head"><div class="ptabs" role="tablist">${tabs.map(([id, label]) => `<button class="ptab" role="tab" aria-selected="${S.panel === id}" data-panel="${id}">${label}</button>`).join('')}</div>
    <button class="icon-btn" data-act="panel-wide" aria-label="Widen panel">${ic.widen}</button><button class="icon-btn" data-act="panel-close" aria-label="Close panel">${ic.x}</button></div>`
  let body = ''
  if (S.panel === 'proposal' || S.panel === 'prototype') {
    const url = S.panel === 'prototype' ? j.previewUrl : j.files.proposal ? `/files/specs/${j.slug}/${j.files.proposal}?v=${encodeURIComponent(j.proposalSummary || '')}${Date.now()}` : null
    if (!url) body = `<div class="panel-body"><div class="empty-panel"><b>Not ready yet</b>The agent shows it here when it submits.</div></div>`
    else {
      const local = S.panel === 'prototype' && /127\.0\.0\.1|localhost/.test(url)
      body = `<div class="panel-bar"><code>${esc(S.panel === 'prototype' ? url : `specs/${j.slug}/proposal.html`)}</code><span class="spacer"></span><span class="seg"><button data-dev="desktop" aria-pressed="${S.device === 'desktop'}">Desktop</button><button data-dev="mobile" aria-pressed="${S.device === 'mobile'}">390</button></span><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noreferrer">${ic.open}</a></div>
        ${local ? '<div class="panel-bar" style="color:var(--faint)">The studio starts the prototype lane for you; first start installs the site (a few minutes).</div>' : ''}
        <div class="panel-body"><div class="frame ${S.device === 'mobile' ? 'mobile' : ''}"><iframe title="${S.panel}" src="${esc(url)}"></iframe></div></div>`
    }
  } else if (S.panel === 'feedback') {
    const text = await doc('feedback')
    const L = j.learnings || []
    body = `<div class="panel-body"><div class="doc prose"><h1>Feedback</h1>
      ${L.length ? `<h2>Learned</h2>${L.map((l) => `<div class="learned"><span><code>${esc(l.file)}</code> ${esc(l.rule)}</span></div>`).join('')}` : ''}
      ${j.files.screenshots?.length ? `<h2>Screenshots</h2><div class="shots">${j.files.screenshots.map((s) => `<a href="/files/specs/${j.slug}/feedback/${encodeURIComponent(s)}" target="_blank" rel="noreferrer"><img src="/files/specs/${j.slug}/feedback/${encodeURIComponent(s)}" alt="Feedback screenshot"></a>`).join('')}</div>` : ''}
      ${text ? md(text) : ''}</div></div>`
  } else {
    const name = { spec: 'spec', brd: 'brd', handoff: 'delivery' }[S.panel]
    const text = await doc(name)
    const pdf = S.panel === 'brd' && j.files.brdPdf ? `<p><a class="btn" href="/files/specs/${j.slug}/brd.pdf" target="_blank" rel="noreferrer">${ic.open}Original PDF</a></p>` : ''
    const tools = text ? `<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:4px"><button class="btn ghost" data-copy="${name}">Copy</button><a class="btn ghost" href="/files/specs/${j.slug}/${j.files[name]}" target="_blank" rel="noreferrer">Raw</a></div>` : ''
    body = `<div class="panel-body"><div class="doc prose">${tools}${pdf}${text ? md(text) : '<p style="color:var(--muted)">Not written yet.</p>'}</div></div>`
  }
  el.innerHTML = head + body
}
function openPanel(tab) {
  S.panel = tab
  history.replaceState(null, '', `#j/${S.slug}/${tab}`)
  renderTop()
  renderPanel(true)
}

// ---------------- menus + modal ----------------
function menu(anchor, html, bind) {
  const m = $('#me-menu')
  m.innerHTML = html
  m.hidden = false
  const r = anchor.getBoundingClientRect()
  const below = r.bottom + 6 + 260 < innerHeight
  m.style.left = Math.min(r.left, innerWidth - 260) + 'px'
  m.style.top = below ? r.bottom + 6 + 'px' : ''
  m.style.bottom = below ? '' : innerHeight - r.top + 6 + 'px'
  bind?.(m)
  setTimeout(() => document.addEventListener('click', function off(e) {
    if (!m.contains(e.target)) {
      m.hidden = true
      document.removeEventListener('click', off)
    }
  }))
}
function meMenu(anchor) {
  const u = me()
  const perm = 'Notification' in window ? Notification.permission : 'unsupported'
  menu(
    anchor,
    `<div class="ml">${esc(u.name)} · ${u.role === 'owner' ? 'Owner · approves + signs off' : 'Requester · answers + feedback'}</div>
    <button class="mi" id="mm-notify" ${perm !== 'default' ? 'disabled' : ''}>Desktop notifications<span class="check" style="color:var(--faint)">${perm === 'granted' ? 'On' : perm === 'denied' ? 'Blocked' : perm === 'unsupported' ? '—' : 'Turn on'}</span></button>
    <a class="mi" href="#settings">Settings · people & keys</a>
    <a class="mi" href="#skills">Skills the agent reads</a>
    <hr><button class="mi" id="mm-pass">Change password</button>
    <button class="mi" id="mm-out">Sign out</button>`,
    (m) => {
      const n = $('#mm-notify', m)
      if (n) n.onclick = async () => (await Notification.requestPermission(), (m.hidden = true))
      $('#mm-out', m).onclick = async () => (await api('/api/auth/logout', {}).catch(() => {}), (S.user = null), authScreen('login'))
      $('#mm-pass', m).onclick = () => ((m.hidden = true), passwordModal())
    },
  )
}
function passwordModal(target) {
  const root = $('#modal-root')
  root.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="pw-t" id="pw-form"><h2 id="pw-t">${target ? `New password for ${esc(target.name)}` : 'Change your password'}</h2><p>At least 10 characters.${target ? ' They’ll be signed out everywhere.' : ' You’ll sign in again after.'}</p>
    <input class="field-in" id="pw-new" type="password" autocomplete="new-password" minlength="10" required aria-label="New password"><div class="card-sub" id="pw-err" style="color:var(--err)" hidden></div>
    <div class="foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`
  root.hidden = false
  $('#pw-new').focus()
  const close = () => ((root.hidden = true), (root.innerHTML = ''))
  root.onclick = (e) => (e.target === root || e.target.dataset.close != null) && close()
  $('#pw-form').onsubmit = async (e) => {
    e.preventDefault()
    try {
      if (target) await api('/api/users/password', { id: target.id, password: $('#pw-new').value })
      else await api('/api/me/password', { password: $('#pw-new').value })
      close()
      if (target) toast('Password changed', target.name)
      else authScreen('login')
    } catch (x) {
      $('#pw-err').hidden = false
      $('#pw-err').textContent = x.message
    }
  }
}
function deleteModal(j) {
  const root = $('#modal-root')
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="del-t"><h2 id="del-t">Delete “${esc(j.title)}”?</h2><p>The agent stops and the project leaves the studio. Its folder moves to <code>.studio-trash/</code>, so it can be recovered. Changes it made to the prototype site stay.</p>
    <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="del-go">Delete project</button></div></div>`
  root.hidden = false
  $('#del-go').focus()
  const close = () => ((root.hidden = true), (root.innerHTML = ''))
  root.onclick = (e) => (e.target === root || e.target.dataset.close != null) && close()
  $('#del-go').onclick = async () => {
    try {
      await api(`/api/jobs/${j.slug}/delete`, {})
      close()
      toast('Project deleted', j.title)
      await loadJobs()
      go('#')
    } catch (x) {
      close()
      toast('Couldn’t delete', x.message)
    }
  }
}
// Sign-in / first-run setup. Shown full screen; the studio loads once you're in.
function authScreen(mode) {
  let el = $('#auth')
  if (!el) {
    el = document.createElement('div')
    el.id = 'auth'
    el.className = 'auth'
    document.body.appendChild(el)
  }
  const setup = mode === 'setup'
  el.innerHTML = `<form class="auth-card" id="auth-form"><img src="${LOGO}" alt="" class="auth-logo"><h1>${setup ? 'Set up the Design Studio' : 'Sign in to the Design Studio'}</h1>
    <p>${setup ? 'Create the Owner account. The Owner approves directions, gives Final sign-off and adds the team in Settings.' : 'Ask an Owner for an account if you don’t have one.'}</p>
    ${setup ? '<input class="field-in" id="au-name" placeholder="Your name" autocomplete="name" required aria-label="Your name">' : ''}
    <input class="field-in" id="au-user" placeholder="Username or email" autocomplete="username" required aria-label="Username or email">
    <input class="field-in" id="au-pass" type="password" placeholder="${setup ? 'Password (10+ characters)' : 'Password'}" autocomplete="${setup ? 'new-password' : 'current-password'}" required aria-label="Password">
    <div class="card-sub" id="au-err" style="color:var(--err)" hidden></div>
    <button class="btn primary" type="submit">${setup ? 'Create Owner account' : 'Sign in'}</button></form>`
  el.hidden = false
  document.body.classList.add('signed-out')
  $(setup ? '#au-name' : '#au-user').focus()
  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault()
    try {
      const body = { username: $('#au-user').value, password: $('#au-pass').value, ...(setup ? { name: $('#au-name').value } : {}) }
      const r = await api(setup ? '/api/auth/setup' : '/api/auth/login', body)
      S.user = r.user
      el.hidden = true
      document.body.classList.remove('signed-out')
      if (!S.booted) start()
      else (await loadJobs(), renderAll())
    } catch (x) {
      $('#au-err').hidden = false
      $('#au-err').textContent = x.message
    }
  }
}
function jobMenu(anchor) {
  const j = S.job
  menu(
    anchor,
    `${isWorking(j) ? '<button class="mi" data-act="stop">Stop the agent</button>' : '<button class="mi" data-act="retry">Re-run the last step</button>'}
    <a class="mi" href="/files/specs/${j.slug}/job.json" target="_blank" rel="noreferrer">Open job files</a>
    ${me().role === 'owner' ? '<button class="mi danger" id="jm-del">Delete project…</button>' : ''}
    <div class="ml">specs/${esc(j.slug)}/ · ${esc(j.source)}${j.costUsd ? ` · $${j.costUsd.toFixed(2)}` : ''}</div>`,
    (m) => {
      const d = $('#jm-del', m)
      if (d) d.onclick = () => ((m.hidden = true), deleteModal(j))
    },
  )
}
function changesModal() {
  const root = $('#modal-root')
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ch-t"><h2 id="ch-t">What should change?</h2><p>It's logged in feedback.md. If it's a rule for next time, the agent writes it into chris-taste.</p>
    <textarea class="field-in" id="ch-note" rows="6"></textarea><div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="ch-go">Send</button></div></div>`
  root.hidden = false
  $('#ch-note').focus()
  const close = () => ((root.hidden = true), (root.innerHTML = ''))
  root.onclick = (e) => (e.target === root || e.target.dataset.close != null) && close()
  $('#ch-go').onclick = async () => {
    const note = $('#ch-note').value.trim()
    if (!note) return
    close()
    await act('direction', { decision: 'changes', note })
  }
}

// ---------------- actions ----------------
async function act(action, body = {}) {
  try {
    await api(`/api/jobs/${S.slug}/${action}`, body)
    await refresh(true)
  } catch (err) {
    toast('Couldn’t do that', err.message)
  }
}
document.addEventListener('click', async (e) => {
  const pu = e.target.closest('[data-user-role],[data-user-pass],[data-user-remove]')
  if (pu) {
    const u = (S.people || []).find((x) => x.id === (pu.dataset.userRole || pu.dataset.userPass || pu.dataset.userRemove))
    if (!u) return
    if (pu.dataset.userPass) return passwordModal(u)
    try {
      S.people = pu.dataset.userRole ? await api('/api/users/role', { id: u.id, role: pu.dataset.to }) : await api('/api/users/remove', { id: u.id })
      toast(pu.dataset.userRole ? 'Role changed' : 'Removed', u.name)
      renderAll()
    } catch (x) {
      toast('Couldn’t do that', x.message)
    }
    return
  }
  const k = e.target.closest('[data-key-activate],[data-key-remove]')
  if (k) {
    const remove = k.dataset.keyRemove
    try {
      S.keys = await api(remove ? '/api/keys/remove' : '/api/keys/activate', { id: remove || k.dataset.keyActivate })
      S.config = await api('/api/config')
      renderAll()
    } catch (x) {
      toast('Couldn’t change keys', x.message)
    }
    return
  }
  const t = e.target.closest('[data-expand],[data-live-url],[data-act],[data-panel],[data-dev],[data-zoom],[data-opt],[data-qnav],[data-qmore],[data-rm],[data-surface],[data-copy],.new-btn,#me-btn')
  if (!t) return
  if (t.classList.contains('new-btn')) {
    e.preventDefault()
    go('#')
    setTimeout(() => input.focus(), 50)
    return
  }
  if (t.id === 'me-btn') return meMenu(t)
  if (t.dataset.panel) return openPanel(t.dataset.panel)
  if (t.dataset.dev) {
    S.device = t.dataset.dev
    S.liveKey = ''
    renderThread(false)
    return renderPanel(true)
  }
  if (t.dataset.opt) {
    const d = (S.qDraft[t.dataset.q] = S.qDraft[t.dataset.q] || {})
    d.opt = d.opt === t.dataset.opt ? null : t.dataset.opt
    return renderThread(false)
  }
  if (t.dataset.qnav) {
    S.qStep = Math.max(0, (S.qStep || 0) + Number(t.dataset.qnav))
    return renderThread(false)
  }
  if (t.dataset.zoom) return zoom(t.dataset.zoom, t.dataset.caption)
  if (t.dataset.qmore) {
    S.qMore[t.dataset.qmore] = true
    return renderThread(false)
  }
  if (t.dataset.rm) return (S.files.splice(Number(t.dataset.rm), 1), renderFiles())
  if (t.dataset.surface) {
    S.surface = S.surface === t.dataset.surface ? null : t.dataset.surface
    return placeComposer()
  }
  if (t.dataset.copy) {
    const text = Object.entries(S.docs).find(([k]) => k.startsWith(t.dataset.copy + ':'))?.[1] || ''
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied', 'Markdown is on your clipboard.')
    } catch {}
    return
  }
  if (t.dataset.expand) {
    S.expanded.add(t.dataset.expand)
    return renderThread(false)
  }
  if (t.dataset.liveUrl) {
    S.liveUrl = t.dataset.liveUrl
    S.liveFor = S.slug
    S.liveKey = ''
    return renderThread(false)
  }
  const a = t.dataset.act
  $('#me-menu').hidden = true
  if (a === 'lane-start') {
    S.config.lane = await api('/api/lane', { method: 'POST' })
    S.config.lane = { ...S.config.lane, status: S.config.lane.status === 'running' ? 'running' : 'starting', message: S.config.lane.status === 'running' ? '' : 'Starting the prototype…' }
    return laneUI()
  }
  if (a === 'live-reload') {
    const f = document.querySelector('.live-frame iframe')
    if (f) f.src = f.src
    return probeLive()
  }
  if (a === 'side') {
    const app = $('#app')
    if (innerWidth <= 820) app.classList.toggle('side-shown')
    else app.classList.toggle('side-hidden', false)
    return ls.set('side', true)
  }
  if (a === 'job-menu') return jobMenu(t)
  if (a === 'panel-close') {
    S.panel = null
    history.replaceState(null, '', `#j/${S.slug}`)
    renderTop()
    return renderPanel()
  }
  if (a === 'panel-wide') return ((S.panelWide = !S.panelWide), ls.set('panelWide', S.panelWide), renderPanel(true))
  if (a === 'approve') return act('direction', { decision: 'approve' })
  if (['stop', 'retry', 'request-signoff', 'signoff', 'back-to-refine', 'figma'].includes(a)) return act(a)
})
$('#side-close').onclick = () => {
  const app = $('#app')
  if (innerWidth <= 820) app.classList.remove('side-shown')
  else app.classList.add('side-hidden')
  ls.set('side', false)
}
$('#search').addEventListener('input', (e) => ((S.search = e.target.value), renderSide()))
document.addEventListener('toggle', (e) => {
  const k = e.target.dataset?.steps
  if (k) e.target.open ? S.openSteps.add(k) : S.openSteps.delete(k)
}, true)
document.addEventListener('input', (e) => {
  if (e.target.dataset?.qa) {
    const d = (S.qDraft[e.target.dataset.qa] = S.qDraft[e.target.dataset.qa] || {})
    d.note = e.target.value
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
    const next = document.querySelector('[data-qnav="1"]')
    if (next) next.disabled = !answerFor(normQ({ id: e.target.dataset.qa }))
  }
})
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'connect-form') {
    e.preventDefault()
    const err = $('#connect-err')
    try {
      await api('/api/keys', { key: $('#connect-key').value, label: 'Default' })
      S.config = await api('/api/config')
      toast('Connected', 'The design agent is ready. Paste a BRD to start.')
      renderAll()
      setTimeout(() => input.focus(), 50)
    } catch (x) {
      err.hidden = false
      err.textContent = x.message
    }
    return
  }
  if (e.target.id === 'user-form') {
    e.preventDefault()
    try {
      S.people = await api('/api/users', { name: $('#nu-name').value, username: $('#nu-user').value, password: $('#nu-pass').value, role: $('#nu-owner').checked ? 'owner' : 'requester' })
      toast('Person added', $('#nu-name').value)
      renderAll()
    } catch (x) {
      $('#nu-err').hidden = false
      $('#nu-err').textContent = x.message
    }
    return
  }
  if (e.target.id === 'key-form') {
    e.preventDefault()
    try {
      S.keys = await api('/api/keys', { key: $('#key-value').value, label: $('#key-label').value, makeActive: $('#key-active').checked })
      S.config = await api('/api/config')
      toast('Key added', S.config.connected ? 'The design agent is connected.' : '')
      renderAll()
    } catch (x) {
      $('#key-err').hidden = false
      $('#key-err').textContent = x.message
    }
    return
  }
  if (e.target.id !== 'q-form') return
  e.preventDefault()
  const open = (S.job.questions || []).filter((q) => !q.answer)
  const answers = Object.fromEntries(open.map((q) => [q.id, answerFor(normQ(q))]).filter(([, v]) => v))
  if (Object.keys(answers).length < open.length) {
    S.qStep = open.findIndex((q) => !answers[q.id])
    renderThread(false)
    return toast('One more', 'Answer every question, or reply in the box below instead.')
  }
  S.qDraft = {}
  S.qStep = 0
  await act('answers', { answers })
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $('#me-menu').hidden = true
    if (!$('#modal-root').hidden) $('#modal-root').hidden = true
  }
})

// ---------------- render ----------------
function renderThread(scrollToEnd) {
  const sc = $('#scroll')
  const nearEnd = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120
  const active = document.activeElement?.dataset?.qa
  const caret = active ? document.activeElement.selectionStart : null
  const typing = document.activeElement === input
  const inputCaret = typing ? input.selectionStart : null
  const th = $('#thread')
  if (S.view === 'job' && S.job) {
    if (!th.querySelector('#t-main')) {
      th.innerHTML = '<div id="t-main" class="t-part"></div><div id="t-live" class="t-part"></div><div id="t-gate" class="t-part"></div>'
      S.liveKey = ''
    }
    $('#t-main').innerHTML = threadHTML()
    $('#t-gate').innerHTML = gateCard(S.job)
    const j = S.job
    const v = (j.prototypes || []).length
    const key = liveVisible(j) ? [j.slug, v, j.previewUrl, S.device, S.liveFor === j.slug ? S.liveUrl : '', j.figma?.url || '', !!j.running, me().role].join('|') : ''
    if (key !== S.liveKey) {
      // only touch the live iframe when the prototype version, device or state changes
      S.liveKey = key
      $('#t-live').innerHTML = key ? liveHTML(j) : ''
      if (key) {
        fitLive()
        probeLive()
      }
    }
  } else {
    th.innerHTML = S.view === 'home' ? homeHTML() : S.view === 'skills' ? skillsHTML() : S.view === 'settings' ? settingsHTML() : '<div class="sys" style="margin-top:20vh">Project not found.</div>'
  }
  placeComposer()
  if (active) {
    const t = th.querySelector(`[data-qa="${active}"]`)
    t?.focus()
    if (t && caret != null) t.setSelectionRange(caret, caret)
  }
  if (typing) {
    input.focus()
    input.setSelectionRange(inputCaret, inputCaret)
  }
  if (S.view === 'home' || S.view === 'skills' || S.view === 'settings') sc.scrollTop = 0
  else if (scrollToEnd || nearEnd) sc.scrollTop = sc.scrollHeight
}
function renderAll(scrollToEnd = true) {
  renderSide()
  renderTop()
  renderThread(scrollToEnd)
  renderPanel()
}
let timer
function refresh(now = false) {
  clearTimeout(timer)
  return new Promise((ok) => {
    timer = setTimeout(
      async () => {
        await loadJobs()
        if (S.view === 'job') await loadJob()
        renderSide()
        renderTop()
        renderThread(false)
        await renderPanel()
        ok()
      },
      now ? 0 : 120,
    )
  })
}
function connect() {
  const es = new EventSource('/api/events')
  es.onerror = () => api('/api/auth/me').then((r) => !r.user && authScreen(r.setup ? 'setup' : 'login')).catch(() => {})
  es.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.type === 'deleted') {
      if (msg.slug === S.slug) go('#')
      return loadJobs().then(renderAll)
    }
    if (msg.type === 'lane') {
      const was = S.config.lane?.status
      S.config.lane = msg.lane
      laneUI()
      const f = document.querySelector('.live-frame iframe')
      if (f && msg.lane.status === 'running' && was !== 'running') f.src = f.src
      return
    }
    if (msg.type === 'notify') {
      const j = S.jobs.find((x) => x.slug === msg.slug) || {}
      if (needsMe({ ...j, running: false, status: msg.status })) {
        chime()
        if (msg.slug !== S.slug || document.hidden) toast(msg.title, msg.gate, () => go(`#j/${msg.slug}`))
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          const n = new Notification(msg.title, { body: msg.gate, icon: LOGO })
          n.onclick = () => (window.focus(), go(`#j/${msg.slug}`))
        }
      }
    }
    refresh()
  }
}

async function start() {
  S.booted = true
  S.panelWide = ls.get('panelWide', false)
  if (ls.get('side', true) === false && innerWidth > 820) $('#app').classList.add('side-hidden')
  S.config = await api('/api/config')
  await loadJobs()
  addEventListener('hashchange', route)
  await route()
  connect()
}
;(async function boot() {
  const r = await api('/api/auth/me').catch(() => ({}))
  S.user = r.user || null
  if (!S.user) return authScreen(r.setup ? 'setup' : 'login')
  start()
})()
