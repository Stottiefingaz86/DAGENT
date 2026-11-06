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
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 012 2.3l-1.2 6A2 2 0 0117.8 20H7"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 13V4h3v9zM17 13l-4 7c-1.5 0-2.5-1-2.2-2.6l.6-3.4H5a2 2 0 01-2-2.3l1.2-6A2 2 0 016.2 4H17"/></svg>',
  taste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.5 5.5L20 9l-4.2 4 1.1 6L12 16l-4.9 3 1.1-6L4 9l5.5-.5z"/></svg>',
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
// Sounds for "a project needs you" (chosen per person on Settings → Notifications; kept in this browser).
const SOUNDS = {
  chime: { label: 'Chime', notes: [[880, 0], [1320, 0.09]], type: 'sine' },
  soft: { label: 'Soft', notes: [[523, 0], [659, 0.12], [784, 0.24]], type: 'sine' },
  bell: { label: 'Bell', notes: [[1046, 0], [1568, 0.02]], type: 'triangle', long: true },
  pop: { label: 'Pop', notes: [[660, 0]], type: 'square', short: true },
}
const pref = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d
  } catch {
    return d
  }
}
const setPref = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {}
}
function chime(name) {
  const key = name || pref('studio-sound', 'chime')
  if (key === 'off') return
  const snd = SOUNDS[key] || SOUNDS.chime
  const vol = Number(pref('studio-volume', '0.07'))
  try {
    ac = ac || new AudioContext()
    const t = ac.currentTime
    for (const [f, d] of snd.notes) {
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.type = snd.type
      o.frequency.value = f
      const len = snd.long ? 0.9 : snd.short ? 0.12 : 0.35
      g.gain.setValueAtTime(0.0001, t + d)
      g.gain.exponentialRampToValueAtTime(vol * (snd.type === 'square' ? 0.4 : 1), t + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + len)
      o.connect(g).connect(ac.destination)
      o.start(t + d)
      o.stop(t + d + len + 0.05)
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
  if (a === 'taste') return { view: 'taste' }
  if (a === 'ideas') return { view: 'ideas' }
  if (a === 'resources') return { view: 'resources' }
  if (a === 'notifications') return { view: 'notifications' }
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
  if (S.view === 'taste') S.taste = await api('/api/taste').catch(() => ({ rules: [], signals: [] }))
  if (S.view === 'ideas') S.ideas = await api('/api/ideas').catch(() => [])
  if (S.view === 'notifications' && S.user?.role === 'owner') S.notify = await api('/api/notify').catch(() => null)
  if (S.view === 'settings') S.figmaToken = await api('/api/figma-token').catch(() => ({}))
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
  // Links to the demo site, Lumen and Figma live in the account menu (Resources).
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
    <div class="card-head"><span class="card-icon">${ic.board}</span><div style="min-width:0"><div class="card-title">Proposal${total > 1 ? ` · v${n}` : ''}${latest ? '' : ' <span class="old-tag">superseded</span>'}</div>${b.strategy ? `<div class="card-sub">${esc(b.strategy)}</div>` : ''}</div>${latest ? reactHTML('proposal') : ''}</div>
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
      ${reactHTML('prototype')}
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
    else if (/^Dev handoff package ready/.test(e.text)) out.push(workCard('handoff', 'Handover', 'Spec, every screen and state, journeys, hover and motion, prototype and Figma', 'handoff'))
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
// ---------------- review: pinned comments + live cursors on screenshots (Figma-style) ----------------
const R = { open: false, slug: null, images: [], i: 0, comments: [], cursors: new Map(), draft: null, focus: null, lastSent: 0 }
const repoPath = (url) => (url.startsWith('/files/') ? decodeURIComponent(url.slice(7)) : null)
const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const rvAgo = (iso) => {
  const s = (Date.now() - Date.parse(iso)) / 1000
  return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : new Date(iso).toLocaleDateString()
}
function zoom(src, caption, el) {
  const path = repoPath(src)
  // Project screenshots open in the review viewer; anything else (peer images) in the plain lightbox.
  if (S.job && path && path.startsWith(`specs/${S.job.slug}/`)) {
    const group = el?.closest('.pb-shots, .q-images, .steps') || null
    const btns = group ? [...group.querySelectorAll('[data-zoom]')] : [el].filter(Boolean)
    const images = btns.map((b) => ({ url: b.dataset.zoom, path: repoPath(b.dataset.zoom), caption: b.dataset.caption || '' })).filter((x) => x.path)
    const i = Math.max(0, images.findIndex((x) => x.url === src))
    return openReview(images.length ? images : [{ url: src, path, caption }], i)
  }
  const root = $('#modal-root')
  root.innerHTML = `<figure class="lightbox"><img src="${esc(src)}" alt="${esc(caption || 'Screenshot')}"><figcaption>${esc(caption || '')}</figcaption></figure>`
  root.hidden = false
  root.onclick = () => ((root.hidden = true), (root.innerHTML = ''))
}
async function openReview(images, i) {
  Object.assign(R, { open: true, slug: S.job.slug, images, i, draft: null, focus: null })
  R.cursors.clear()
  let el = $('#review')
  if (!el) {
    el = document.createElement('div')
    el.id = 'review'
    el.className = 'review'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.setAttribute('aria-label', 'Review screenshot')
    document.body.appendChild(el)
  }
  el.hidden = false
  document.body.classList.add('reviewing')
  await loadComments()
  renderReview()
}
function closeReview() {
  if (!R.open) return
  presence(null, true)
  R.open = false
  $('#review').hidden = true
  $('#review').innerHTML = ''
  document.body.classList.remove('reviewing')
}
async function loadComments() {
  try {
    R.comments = await api(`/api/jobs/${R.slug}/comments`)
  } catch {
    R.comments = []
  }
}
const cur = () => R.images[R.i]
const here = () => R.comments.filter((c) => c.image === cur().path)
const unsent = () => R.comments.filter((c) => !c.resolved && !c.sentAt)
function renderReview() {
  const el = $('#review')
  if (!R.open || !el) return
  const im = cur()
  const list = here()
  const owner = me().role === 'owner'
  const viewers = [...new Map([[me().id, { name: me().name, color: S.config.me?.color || 'var(--accent)' }], ...[...R.cursors].filter(([, c]) => Date.now() - c.t < 15000).map(([id, c]) => [id, c])]).values()]
  const pending = unsent().length
  const job = S.job
  const sendLabel = job?.status === 'direction' ? 'Send as changes' : 'Send to agent'
  el.innerHTML = `
    <header class="rv-bar">
      <div class="rv-title"><b>${esc(im.caption || 'Screenshot')}</b><span>${R.images.length > 1 ? `${R.i + 1} of ${R.images.length} · ` : ''}click anywhere on the image to comment</span></div>
      <div class="rv-tools">
        ${R.images.length > 1 ? `<button class="icon-btn" data-rv="prev" aria-label="Previous screenshot">‹</button><button class="icon-btn" data-rv="next" aria-label="Next screenshot">›</button>` : ''}
        <span class="rv-viewers" aria-label="Viewing now">${viewers.map((v) => `<span class="rv-av" style="--c:${v.color}" title="${esc(v.name)}">${esc(initials(v.name))}</span>`).join('')}</span>
        <button class="btn primary" data-rv="send" ${pending && (job?.status !== 'direction' || owner) ? '' : 'disabled'} title="${job?.status === 'direction' && !owner ? 'The Owner sends changes during direction review' : ''}">${sendLabel}${pending ? ` · ${pending}` : ''}</button>
        <button class="icon-btn" data-rv="close" aria-label="Close">${ic.x}</button>
      </div>
    </header>
    <div class="rv-main">
      <div class="rv-stage" id="rv-stage">
        <div class="rv-canvas" id="rv-canvas">
          <img src="${esc(im.url)}" alt="${esc(im.caption || 'Screenshot')}" id="rv-img" draggable="false">
          ${list.map((c) => `<button class="rv-pin ${c.resolved ? 'done' : ''} ${R.focus === c.id ? 'on' : ''}" style="left:${c.x * 100}%;top:${c.y * 100}%;--c:${c.color}" data-pin="${c.id}" aria-label="Comment ${c.n} by ${esc(c.by)}">${c.n}</button>`).join('')}
          ${R.draft ? `<div class="rv-pin draft" style="left:${R.draft.x * 100}%;top:${R.draft.y * 100}%;--c:${S.config.me?.color || 'var(--accent)'}">+</div>
            <form class="rv-pop" id="rv-pop" style="left:${R.draft.x * 100}%;top:${R.draft.y * 100}%" data-flip="${R.draft.x > 0.62 ? 'l' : 'r'}" data-up="${R.draft.y > 0.7 ? '1' : ''}"><textarea id="rv-text" rows="3" placeholder="What should change here?" aria-label="Comment"></textarea><div class="rv-pop-foot"><span>Enter to post · Esc to cancel</span><button type="button" class="btn ghost" data-rv="cancel">Cancel</button><button type="button" class="btn primary" data-rv="post">Comment</button></div></form>` : ''}
          <div class="rv-cursors" id="rv-cursors"></div>
        </div>
      </div>
      <aside class="rv-side">
        <div class="rv-side-head"><b>Comments</b><span>${list.length ? `${list.filter((c) => !c.resolved).length} open · ${list.filter((c) => c.resolved).length} resolved` : 'None yet'}</span></div>
        <div class="rv-list">
          ${list.length ? list.map((c) => `<article class="rv-c ${c.resolved ? 'done' : ''} ${R.focus === c.id ? 'on' : ''}" data-cid="${c.id}">
              <div class="rv-c-head"><span class="rv-av sm" style="--c:${c.color}">${esc(initials(c.by))}</span><b>${esc(c.by)}</b><span class="rv-n">#${c.n}</span><span class="rv-t">${rvAgo(c.at)}</span>${c.sentAt ? '<span class="rv-sent">sent</span>' : ''}</div>
              <div class="rv-c-text">${esc(c.text)}</div>
              ${c.replies.map((r) => `<div class="rv-r"><b>${esc(r.by)}</b> ${esc(r.text)} <span class="rv-t">${rvAgo(r.at)}</span></div>`).join('')}
              <div class="rv-c-act"><input class="rv-reply" data-reply="${c.id}" placeholder="Reply" aria-label="Reply to comment ${c.n}"><button class="btn ghost" data-resolve="${c.id}">${c.resolved ? 'Reopen' : 'Resolve'}</button>${c.byId === me().id || owner ? `<button class="btn ghost" data-del="${c.id}" aria-label="Delete comment ${c.n}">Delete</button>` : ''}</div>
            </article>`).join('') : '<p class="rv-empty">Click a spot on the screenshot to leave the first comment. Everyone on this project sees it live, and the agent gets the exact spot.</p>'}
        </div>
        ${pending ? `<div class="rv-foot">${pending} comment${pending === 1 ? '' : 's'} not sent yet. ${job?.status === 'direction' ? 'Sending asks the agent to revise the proposal.' : 'Sending gives them to the agent as feedback.'}</div>` : ''}
      </aside>
    </div>`
  bindReview()
  drawCursors()
  if (R.draft) $('#rv-text')?.focus()
}
function bindReview() {
  const img = $('#rv-img')
  const canvas = $('#rv-canvas')
  if (!img || !canvas) return
  const at = (e) => {
    const r = img.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  img.addEventListener('click', (e) => {
    R.draft = at(e)
    R.focus = null
    renderReview()
  })
  canvas.addEventListener('mousemove', (e) => presence(at(e)))
  canvas.addEventListener('mouseleave', () => presence(null, true))
  const t = $('#rv-text')
  if (t) t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) (e.preventDefault(), postComment())
    if (e.key === 'Escape') (e.stopPropagation(), (R.draft = null), renderReview())
  })
  for (const inp of document.querySelectorAll('.rv-reply')) inp.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter' || !inp.value.trim()) return
    await rvCall('reply', { id: inp.dataset.reply, text: inp.value.trim() })
  })
}
async function rvCall(op, body) {
  try {
    R.comments = await api(`/api/jobs/${R.slug}/comments${op ? `/${op}` : ''}`, body)
    renderReview()
    return true
  } catch (x) {
    toast('Couldn’t do that', x.message)
    return false
  }
}
async function postComment() {
  const text = $('#rv-text')?.value.trim()
  if (!text || !R.draft) return
  const ok = await rvCall('', { image: cur().path, x: R.draft.x, y: R.draft.y, text })
  if (ok) {
    R.draft = null
    R.focus = R.comments[R.comments.length - 1]?.id || null
    renderReview()
  }
}
// Live cursors: send mine (throttled), draw everyone else's.
let presenceTimer = 0
function presence(pt, leave = false) {
  if (!R.slug) return
  const now = Date.now()
  if (!leave && now - R.lastSent < 60) {
    clearTimeout(presenceTimer)
    presenceTimer = setTimeout(() => presence(pt), 70)
    return
  }
  R.lastSent = now
  fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ slug: R.slug, image: cur()?.path || '', ...(pt || {}), leave }) }).catch(() => {})
}
function onCursor(msg) {
  if (!R.open || msg.slug !== R.slug || msg.user.id === me().id) return
  const before = R.cursors.has(msg.user.id)
  if (msg.leave) R.cursors.set(msg.user.id, { ...(R.cursors.get(msg.user.id) || {}), name: msg.user.name, color: msg.user.color, image: null, t: Date.now() })
  else R.cursors.set(msg.user.id, { x: msg.x, y: msg.y, image: msg.image, name: msg.user.name, color: msg.user.color, t: Date.now() })
  if (!before) renderReview()
  else drawCursors()
}
function drawCursors() {
  const layer = $('#rv-cursors')
  if (!layer) return
  const now = Date.now()
  layer.innerHTML = [...R.cursors.values()]
    .filter((c) => c.image === cur()?.path && now - c.t < 8000 && Number.isFinite(c.x))
    .map((c) => `<div class="rv-cursor" style="left:${c.x * 100}%;top:${c.y * 100}%;--c:${c.color}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l5.5 13 1.8-5.2L14 7z"/></svg><span>${esc(c.name)}</span></div>`)
    .join('')
}
setInterval(() => R.open && drawCursors(), 2000)
document.addEventListener('change', async (e) => {
  if (e.target.name === 'nf-type') {
    document.querySelectorAll('.nf-types .chip').forEach((c) => c.classList.toggle('on', c.contains(e.target)))
    $('#nf-help').textContent = CH_HELP[e.target.value][1]
  }
  if (e.target.dataset?.nfVol != null) setPref('studio-volume', e.target.value), chime()
  if (e.target.dataset?.nfEv) {
    const id = e.target.dataset.nfEv
    const events = [...document.querySelectorAll(`[data-nf-ev="${id}"]:checked`)].map((x) => x.value)
    S.notify = await api('/api/notify', { action: 'events', id, events }).catch(() => S.notify)
  }
})
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'nf-form') {
    e.preventDefault()
    try {
      S.notify = await api('/api/notify', { action: 'add', type: document.querySelector('[name=nf-type]:checked').value, label: $('#nf-label').value, url: $('#nf-url').value })
      toast('Channel added', 'Send a test to check it.')
      renderAll(false)
    } catch (x) {
      $('#nf-err').hidden = false
      $('#nf-err').textContent = x.message
    }
    return
  }
  if (e.target.id !== 'ideas-form') return
  e.preventDefault()
  try {
    const j = await api('/api/recommend', { focus: $('#ideas-focus').value })
    await loadJobs()
    go(`#j/${j.slug}`)
  } catch (x) {
    toast('Couldn’t start it', x.message)
  }
})
document.addEventListener('click', async (e) => {
  if (!R.open) return
  const pin = e.target.closest('[data-pin]')
  if (pin) {
    R.focus = pin.dataset.pin
    R.draft = null
    renderReview()
    document.querySelector(`[data-cid="${pin.dataset.pin}"]`)?.scrollIntoView({ block: 'nearest' })
    return
  }
  const card = e.target.closest('.rv-c')
  if (card && !e.target.closest('button,input')) {
    R.focus = card.dataset.cid
    return renderReview()
  }
  const res = e.target.closest('[data-resolve]')
  if (res) return rvCall('resolve', { id: res.dataset.resolve, value: !R.comments.find((c) => c.id === res.dataset.resolve)?.resolved })
  const del = e.target.closest('[data-del]')
  if (del) return rvCall('delete', { id: del.dataset.del })
  const b = e.target.closest('[data-rv]')
  if (!b) return
  const a = b.dataset.rv
  if (a === 'close') return closeReview()
  if (a === 'cancel') return ((R.draft = null), renderReview())
  if (a === 'post') return postComment()
  if (a === 'prev' || a === 'next') {
    presence(null, true)
    R.i = (R.i + (a === 'next' ? 1 : -1) + R.images.length) % R.images.length
    R.draft = null
    R.focus = null
    return renderReview()
  }
  if (a === 'send') {
    b.disabled = true
    if (await rvCall('send', {})) {
      toast('Sent to the agent', 'It gets the screenshots with numbered pins and every comment.')
      closeReview()
      refresh(true)
    } else b.disabled = false
  }
})
document.addEventListener('keydown', (e) => {
  if (!R.open || e.target.matches('textarea,input')) return
  if (e.key === 'Escape') closeReview()
  if (e.key === 'ArrowRight' && R.images.length > 1) document.querySelector('[data-rv="next"]')?.click()
  if (e.key === 'ArrowLeft' && R.images.length > 1) document.querySelector('[data-rv="prev"]')?.click()
})

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
  if (j.status === 'ready_for_dev') return handoverCard(j, owner)
  return ''
}
// ---------- learning: reactions, taste, lumen ----------
function reactHTML(target) {
  return `<span class="react" role="group" aria-label="React to this ${target}"><button type="button" class="icon-btn" data-react="like" data-target="${target}" aria-label="This is good" title="This is good">${ic.up}</button><button type="button" class="icon-btn" data-react="dislike" data-target="${target}" aria-label="Not this" title="Not this">${ic.down}</button></span>`
}
function reactModal(value, target) {
  const root = $('#modal-root')
  const like = value === 'like'
  root.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="re-t" id="re-form"><h2 id="re-t">${like ? 'What’s good about it?' : 'What’s not right?'}</h2>
    <p>${like ? 'The agent learns what to keep doing.' : 'The agent learns what to avoid. During review, it also fixes it now.'}${like ? ' A note is optional.' : ''}</p>
    <textarea class="field-in" id="re-note" rows="4" placeholder="${like ? 'e.g. the glass sub-nav and the claim moment feel right' : 'e.g. the toast copy is too long; the cards feel heavy'}"></textarea>
    <div class="foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="button" id="re-send">${like ? 'Send 👍' : 'Send 👎'}</button></div></form>`
  root.hidden = false
  $('#re-note').focus()
  const close = () => ((root.hidden = true), (root.innerHTML = ''))
  root.onclick = (e) => (e.target === root || e.target.dataset.close != null) && close()
  const send = async (e) => {
    e?.preventDefault()
    const note = $('#re-note').value.trim()
    close()
    await act('react', { value, target, note })
    toast(like ? 'Noted: keep doing this' : 'Noted: avoid this', note ? 'Recorded in the taste ledger.' : '')
  }
  $('#re-form').onsubmit = send
  $('#re-send').onclick = send
  $('#re-note').onkeydown = (e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && send(e)
}
function lumenNotice() {
  const L = S.config.lumen
  if (!L || L.baseline || !L.latestDate || Date.now() - Date.parse(L.latestDate) > 14 * 864e5) return ''
  return `<a class="gate-row lumen-note" href="#taste"><span class="dot gate"></span><div style="min-width:0"><b>Lumen changed on ${esc(L.latestDate)}</b><span class="s">${esc((L.latest.split('\n')[0] || '').replace(/^## /, ''))}. The agent now designs against the new version.</span></div><span class="go">See changes</span></a>`
}
function tasteHTML() {
  const T = S.taste || { rules: [], signals: [] }
  const owner = me().role === 'owner'
  const L = S.config.lumen || {}
  const active = T.rules.filter((r) => r.status !== 'undone')
  const fresh = active.filter((r) => r.status === 'new')
  const rule = (r) => `<div class="rule ${r.status}"><span class="pol ${r.polarity}">${r.polarity === 'do' ? 'Do' : 'Don’t'}</span><div style="min-width:0;flex:1"><b>${esc(r.rule)}</b>
      <span class="s">${esc(r.file)} · ${r.seen > 1 ? `seen ${r.seen}× · ` : ''}${r.status === 'kept' ? 'confirmed' : r.status === 'undone' ? 'undone' : 'new'}${r.evidence?.[0]?.quote ? ` · “${esc(r.evidence[0].quote.slice(0, 140))}”` : ''}</span></div>
      ${owner && r.status === 'new' ? `<span class="rule-act"><button class="btn" data-rule="${r.id}" data-rule-act="keep">Keep</button><button class="btn ghost" data-rule="${r.id}" data-rule-act="undo">Undo</button></span>` : owner && r.status === 'kept' ? `<span class="rule-act"><button class="btn ghost" data-rule="${r.id}" data-rule-act="undo">Undo</button></span>` : ''}</div>`
  const sig = (s) => `<div class="sigrow"><span class="sig ${s.kind}">${{ like: '👍', approve: '✓', signoff: '★', dislike: '👎', change: '✎', rule: '＋', 'rule-kept': '✓', 'rule-undone': '↺' }[s.kind] || '·'}</span><div style="min-width:0"><b>${esc(s.title || s.project || 'Taste')}</b><span class="s">${esc((s.text || s.kind).slice(0, 220))}</span></div><span class="when">${new Date(s.at).toLocaleDateString()}</span></div>`
  return `<div class="skills"><div><h2>Taste</h2><p>What the agent has learned from your feedback: what's good, what's bad. New rules apply straight away; keep the ones you agree with and undo the rest.</p></div>
    <div class="skill-group"><h3>Lumen</h3><div class="card lumen-card"><div class="card-head"><span class="card-icon">${ic.board}</span><div style="min-width:0;flex:1"><div class="card-title">${L.baseline ? 'Tracking Lumen (baseline recorded)' : L.latestDate ? `Last change ${esc(L.latestDate)}` : 'Not checked yet'}</div><div class="card-sub">Checked ${L.checkedAt ? new Date(L.checkedAt).toLocaleString() : '—'} · every 6 hours from <code>tokens/figma</code> and the component folders.</div></div>
      <a class="btn ghost" href="/files/knowledge/lumen/CHANGELOG.md" target="_blank" rel="noreferrer">Changelog</a>${owner ? '<button class="btn" data-maint="lumen-figma">Check Lumen in Figma</button>' : ''}</div>
      ${!L.baseline && L.latest ? `<div class="card-body"><div class="prose">${md(L.latest.split('\n').slice(1).join('\n').slice(0, 900))}</div></div>` : ''}</div></div>
    <div class="skill-group"><h3>Learned rules · ${active.length}${fresh.length ? ` · ${fresh.length} to review` : ''}</h3>${owner ? '<div style="margin:-4px 0 10px"><button class="btn ghost" data-maint="tidy-taste">Tidy taste notes</button> <span class="card-sub">The agent merges duplicates and resolves conflicts across knowledge/chris-taste.</span></div>' : ''}
      <div class="rules">${T.rules.length ? T.rules.map(rule).join('') : '<div class="none" style="padding:0">Nothing learned yet. 👍 / 👎 on proposals and prototypes, change requests and sign-offs all teach the agent.</div>'}</div></div>
    <div class="skill-group"><h3>Recent signals</h3><div class="rules">${T.signals.length ? T.signals.slice(0, 40).map(sig).join('') : '<div class="none" style="padding:0">No signals yet.</div>'}</div></div>
  </div>`
}
// One package for the dev agent: spec, mocks (screens), prototype, Figma, journeys, states, motion, decisions.
function handoverCard(j, owner) {
  const F = S.config.figma || {}
  const dq = j.devQuestions || []
  const open = dq.filter((q) => q.status !== 'answered')
  const figma = j.figma?.url
    ? `<a class="btn" href="${esc(j.figma.url)}" target="_blank" rel="noreferrer">Figma page</a>`
    : owner ? `<button class="btn" data-act="figma">${F.connected === false ? 'Build in Figma (connect first)' : 'Build in Figma'}</button>` : ''
  return `<div class="card"><div class="card-head"><span class="card-icon">${ic.pack}</span><div><div class="card-title">Handover ready</div><div class="card-sub">Signed off${j.signedOffBy ? ` by ${esc(j.signedOffBy)}` : ''}. One package for the dev agent: spec, every screen and state, journeys, hover and motion, the prototype${j.figma?.url ? ' and Figma' : ''}.</div></div><button class="btn open" data-panel="handoff">Open handover</button></div>
    <div class="card-actions"><a class="btn primary" href="/api/jobs/${j.slug}/handover.tar.gz">Download package</a>${figma}${j.previewUrl ? `<a class="btn ghost" href="${esc(j.previewUrl)}" target="_blank" rel="noreferrer">Prototype</a>` : ''}${owner ? '<button class="btn ghost" data-act="back-to-refine">Back to refine</button>' : ''}</div>
    ${F.connected === false && !j.figma?.url ? '<div class="card-sub" style="padding:0 16px 12px">Figma isn’t connected to the studio yet: run <b>Connect Tools.command</b> once, restart the studio, then Build in Figma.</div>' : ''}
    ${dq.length ? `<div class="card-body"><div class="card-sub"><b>Questions from dev · ${dq.length}${open.length ? ` · ${open.length} open` : ''}</b></div>${dq.map((q) => `<div class="dq"><span class="dot ${q.status === 'answered' ? 'ok' : 'gate'}"></span><div><b>${esc(q.text)}</b>${q.answer ? `<span class="card-sub">${esc(q.answer)}${q.source ? ` · ${esc(q.source)}` : ''}</span>` : '<span class="card-sub">The agent is checking the handover…</span>'}</div></div>`).join('')}</div>` : ''}
  </div>`
}

// Ideas: the agent looks for gaps against the product strategy and research, with a mock, scope and business case.
// Notifications: desktop alerts and sounds (this browser) + chat channels and replying from chat (Owner).
const CH_HELP = {
  slack: ['Slack', 'In Slack: Apps → search "Incoming WebHooks" (or create an app at api.slack.com/apps → Incoming Webhooks → On) → Add New Webhook → pick the channel → copy the URL.'],
  mattermost: ['Mattermost', 'In Mattermost: Product menu → Integrations → Incoming Webhooks → Add → pick the channel → copy the URL.'],
  teams: ['Microsoft Teams', 'In Teams: the channel → ⋯ → Workflows → "Post to a channel when a webhook request is received" → copy the URL.'],
  webhook: ['Webhook', 'Any https URL. The studio POSTs JSON: { event, project, title, text, url }.'],
}
function notificationsHTML() {
  const owner = S.user?.role === 'owner'
  const perm = 'Notification' in window ? Notification.permission : 'unsupported'
  const sound = pref('studio-sound', 'chime')
  const N = S.notify
  const evs = N?.events || {}
  const desk =
    perm === 'granted' ? 'On. You get a desktop alert when a project needs you and the studio is in the background.'
    : perm === 'denied' ? 'Blocked by your browser for this page. To fix: click the icon left of the address bar → Notifications → Allow, then reload. On a Mac, also System Settings → Notifications → your browser → Allow.'
    : perm === 'unsupported' ? 'This browser can’t show desktop alerts. Chrome can.'
    : 'Off. Turn them on to get a desktop alert when a project needs you.'
  const chans = (N?.channels || [])
    .map((c) => `<div class="card"><div class="card-head"><div><div class="card-title">${esc(c.label)} · ${esc(CH_HELP[c.type]?.[0] || c.type)}</div><div class="card-sub"><code>${esc(c.hint)}</code>${c.last ? ` · last message ${c.last.ok ? 'delivered' : `failed (${esc(String(c.last.status))})`}` : ''}</div></div></div>
      <div class="card-body nf-events">${Object.entries(evs).map(([k, d]) => `<label class="card-sub"><input type="checkbox" data-nf-ev="${c.id}" value="${k}" ${c.events.includes(k) ? 'checked' : ''}> ${esc(d)}</label>`).join('')}</div>
      <div class="card-actions"><button class="btn" data-nf-test="${c.id}">Send a test</button><button class="btn ghost" data-nf-remove="${c.id}">Remove</button></div></div>`)
    .join('')
  return `<div class="skills"><div><h2>Notifications</h2><p>How the studio tells you a project needs you, and how to answer the agent from chat.</p></div>
    <div class="skill-group"><h3>In this browser</h3>
      <div class="card" style="max-width:640px"><div class="card-head"><div><div class="card-title">Desktop alerts</div><div class="card-sub">${esc(desk)}</div></div></div>
        <div class="card-actions">${perm === 'default' ? '<button class="btn primary" data-nf-desk>Turn on</button>' : perm === 'granted' ? '<button class="btn" data-nf-desk>Send a test</button>' : ''}</div></div>
      <div class="card" style="max-width:640px"><div class="card-head"><div><div class="card-title">Sound</div><div class="card-sub">Plays when a project needs you while the studio is open.</div></div></div>
        <div class="card-body nf-sounds">${[...Object.entries(SOUNDS).map(([k, v]) => [k, v.label]), ['off', 'Off']].map(([k, l]) => `<button class="chip${sound === k ? ' on' : ''}" data-nf-sound="${k}">${l}</button>`).join('')}
        <label class="card-sub nf-vol">Volume <input type="range" min="0.01" max="0.2" step="0.01" value="${pref('studio-volume', '0.07')}" data-nf-vol></label></div></div>
    </div>
    ${owner ? `<div class="skill-group"><h3>Chat channels</h3><p class="card-sub" style="margin:-4px 0 10px">The studio posts to these when something happens. Pick what each channel hears.</p>
      ${chans}
      <form class="card" id="nf-form" style="max-width:640px"><div class="card-head"><div><div class="card-title">Add a channel</div><div class="card-sub" id="nf-help">${esc(CH_HELP.slack[1])}</div></div></div>
        <div class="card-body"><div class="nf-types">${Object.entries(CH_HELP).map(([k, [l]], i) => `<label class="chip${i ? '' : ' on'}"><input type="radio" name="nf-type" value="${k}" ${i ? '' : 'checked'} hidden>${l}</label>`).join('')}</div>
        <input class="field-in" id="nf-label" placeholder="Name, e.g. #design-agent" maxlength="40" aria-label="Channel name">
        <input class="field-in" id="nf-url" type="password" autocomplete="off" placeholder="Webhook URL (https://…)" aria-label="Webhook URL"><div class="card-sub" id="nf-err" style="color:var(--err)" hidden></div></div>
        <div class="card-actions"><button class="btn primary" type="submit">Add channel</button></div></form>
    </div>
    <div class="skill-group"><h3>Answer the agent from chat</h3>
      <div class="card" style="max-width:640px"><div class="card-body">
        <p>Send <code>&lt;project&gt; &lt;message&gt;</code> from chat and it reaches that project’s agent like feedback typed here. Send <code>list</code> to see what needs you.</p>
        <p class="card-sub"><b>Mattermost:</b> Integrations → Outgoing Webhooks → Add → trigger word <code>design</code> → callback URL below → paste the token below as the webhook token (or add <code>?token=…</code> to the URL).<br>
        <b>Slack:</b> create an app at api.slack.com/apps → Slash Commands → <code>/design</code> → request URL below with <code>?token=…</code>.<br>
        Slack and Mattermost cloud must be able to reach the studio, so this works once the studio is hosted (see Resources → Setup & hosting; set <code>STUDIO_PUBLIC_URL</code>).</p>
        <div class="nf-copy"><span class="card-sub">URL</span><code>${esc(N?.inboundUrl || '')}</code><button class="btn ghost" data-nf-copy="${esc(N?.inboundUrl || '')}">Copy</button></div>
        <div class="nf-copy"><span class="card-sub">Token</span><code>${N ? '•'.repeat(12) + esc(N.inboundToken.slice(-4)) : ''}</code><button class="btn ghost" data-nf-copy="${esc(N?.inboundToken || '')}">Copy</button><button class="btn ghost" data-nf-rotate>New token</button></div>
      </div></div></div>` : '<p class="card-sub">The Owner sets up chat channels.</p>'}
  </div>`
}

// Resources: every link the team needs in one place (moved out of the sidebar, Chris Nov 2026).
function resourcesHTML() {
  const L = S.config.links || {}
  const group = (title, items) => `<div class="skill-group"><h3>${title}</h3><div class="skill-grid">${items
    .filter((i) => i[2])
    .map(([t, d, h, ext]) => `<a class="skill" href="${esc(h)}"${ext === false ? '' : ' target="_blank" rel="noreferrer"'}><b>${esc(t)}</b><span>${esc(d)}</span></a>`)
    .join('')}</div></div>`
  return `<div class="skills"><div><h2>Resources</h2><p>Everything the team and the agent work from.</p></div>
    ${group('Sites', [
      ['Demo site', 'The live site on Vercel', L.demo],
      ['Prototype site', 'Where the agent builds prototypes (this computer)', L.prototypeOrigin],
      ['Lumen', 'The design system, components and tokens', L.lumen],
    ])}
    ${group('Figma', [
      ['Design Agent file', 'Where the agent builds every project page', L.designAgentFile],
      ['Lumen library', 'The only library the agent may use', L.figma],
      ['Research folder', 'Competitor and market research (always updated)', L.research],
    ])}
    ${group('Repo & docs', [
      ['GitHub repo', 'The design repo', L.repo],
      ['How the pipeline works', 'docs/PIPELINE.md', '/files/docs/PIPELINE.md'],
      ['Handover & dev questions', 'docs/HANDOVER.md', '/files/docs/HANDOVER.md'],
      ['Setup & hosting', 'docs/SETUP.md', '/files/docs/SETUP.md'],
      ['Connectors', 'docs/CONNECTORS.md', '/files/docs/CONNECTORS.md'],
      ['Overview deck (PDF)', 'docs/Design_Agent_Overview.pdf', '/files/docs/Design_Agent_Overview.pdf'],
    ])}
  </div>`
}

function ideasHTML() {
  const owner = S.user?.role === 'owner'
  const runs = S.ideas || []
  const cards = runs.flatMap((r) => (r.ideas || []).map((i) => ({ ...i, run: r.slug })))
  return `<div class="skills"><div><h2>Recommendations</h2><p>Ideas the agent found to move the product strategy: a gap we have against the research, with a mock, scope and business case. Turn the good ones into projects.</p></div>
    ${owner ? `<form class="card" id="ideas-form" style="max-width:640px"><div class="card-body"><input class="field-in" id="ideas-focus" placeholder="Optional focus, e.g. retention in casino, first deposit, VIP" maxlength="300" aria-label="Focus"></div><div class="card-actions"><button class="btn primary" type="submit">Find ideas</button><span class="card-sub">Reads the strategy, the research Figma folder${S.config.research?.changed ? ' (updated)' : ''}, Mobbin and our live site.</span></div></form>` : ''}
    ${runs.filter((r) => r.running || r.status === 'working').map((r) => `<a class="gate-row" href="#j/${r.slug}"><span class="dot gate"></span><div><b>${esc(r.title)}</b><span class="s">Researching…</span></div><span class="go">Watch</span></a>`).join('')}
    ${cards.length ? `<div class="home-cards">${cards.map((i) => `<div class="card idea"><div class="card-head"><div><div class="card-title">${esc(i.title)}</div><div class="card-sub">${esc(i.goal || '')}</div></div></div>
      ${(i.screenshots || []).length ? `<div class="idea-shots">${i.screenshots.slice(0, 2).map((x) => `<img src="/files/${encodeURI(x)}" alt="" loading="lazy">`).join('')}</div>` : ''}
      <div class="card-body"><div>${esc(i.summary || '')}</div><div class="card-sub">Impact: ${esc(i.impact || '—')} · Effort: ${esc(i.effort || '—')}</div></div>
      <div class="card-actions"><a class="btn ghost" href="/files/${encodeURI(i.file || '')}" target="_blank" rel="noreferrer">Business case</a>${i.project ? `<a class="btn" href="#j/${i.project}">Open project</a>` : owner ? `<button class="btn primary" data-promote="${esc(i.id)}" data-run="${esc(i.run)}">Turn into project</button>` : ''}</div></div>`).join('')}</div>` : runs.length ? '' : '<p class="card-sub">No ideas yet.</p>'}
  </div>`
}

// Setup gate (Chris, Nov 2026): until every required connection works, nothing runs. Home shows this instead.
const SETUP_HELP = {
  apiKey: {
    what: 'The key that lets the design agent use Claude. It stays on this computer.',
    steps: ['Go to console.anthropic.com → Settings → API keys (sign in with your company account).', 'Click Create Key, name it "Design Studio", copy it.', 'Paste it in the box on this page (or Settings → API keys) and save.'],
    action: ['Open Anthropic console', 'https://console.anthropic.com/settings/keys'],
  },
  figma: {
    what: 'Lets the agent read the Lumen library and your research, and build the Figma page in every handover.',
    steps: ['Click Connect now: a Terminal window opens.', 'Press Enter, then type /mcp and press Enter.', 'Choose figma → Authenticate. Your browser opens: sign in with the Figma account that sees Lumen, click Allow.', 'Do the same for mobbin, then type /exit.', 'Come back here and click Check again.'],
    run: 'tools',
  },
  mobbin: {
    what: 'Real competitor screens and flows for research. Needs a paid Mobbin plan.',
    steps: ['Click Connect now: a Terminal window opens (same window as Figma).', 'Type /mcp → mobbin → Authenticate, sign in to Mobbin in the browser, click Allow.', 'Type /exit, come back here and click Check again.'],
    run: 'tools',
  },
  research: {
    what: 'A read-only Figma token so the studio sees new research files in your research folder by itself.',
    steps: ['In Figma, go to the home screen (not inside a file).', 'Click your name top-left → Settings → Security → Personal access tokens → Generate new token.', 'Name it "Design Studio research". Scopes: Folders = Read only and File content = Read only. Pick the longest expiry. Generate and copy it.', 'Paste it below and click Save and check.'],
    inline: 'research',
  },
  chrome: {
    what: 'The agent takes screenshots of the prototype with Google Chrome.',
    steps: ['Download and install Google Chrome on the machine that runs the studio.', 'Click Check again.'],
    action: ['Download Chrome', 'https://www.google.com/chrome/'],
  },
}
// Setup gate (Chris, Nov 2026): until every required connection works, nothing runs. Home shows this instead.
function setupGateHTML() {
  const st = S.config.setup || { items: {}, required: [], missing: [] }
  const owner = S.user?.role === 'owner'
  const open = S.setupOpen || st.missing?.[0]
  const rows = (st.required || []).map((k) => {
    const it = st.items[k] || {}
    const h = SETUP_HELP[k] || {}
    const expanded = owner && !it.ok && open === k
    const body = expanded
      ? `<div class="setup-help"><p>${esc(h.what || '')}</p><ol>${(h.steps || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        ${it.detail ? `<p class="card-sub">Status: ${esc(it.detail)}</p>` : ''}
        <div class="card-actions" style="padding:0">${h.run ? `<button class="btn primary" data-setup-run="${h.run}">Connect now</button>` : ''}${h.action ? `<a class="btn ${h.run ? '' : 'primary'}" href="${h.action[1]}" target="_blank" rel="noreferrer">${esc(h.action[0])}</a>` : ''}${k === 'apiKey' && !S.config.connected ? '' : ''}<button class="btn ghost" data-setup-check>Check again</button></div>
        ${k === 'apiKey' && !S.config.connected ? connectHTML() : ''}${h.inline === 'research' ? figmaTokenHTML(true) : ''}</div>`
      : ''
    return `<div class="setup-item${expanded ? ' is-open' : ''}"><button type="button" class="gate-row" data-setup-open="${k}"${it.ok ? ' style="opacity:.6"' : ''}><span class="dot ${it.ok ? 'done' : 'gate'}"></span><div style="min-width:0;text-align:left"><b>${esc(it.label || k)}</b><span class="s">${it.ok ? 'Done' : owner ? (expanded ? 'How to fix it' : 'Click for help') : 'Waiting for the Owner'}</span></div>${!it.ok && owner ? `<span class="go">${expanded ? 'Close' : 'Fix'}</span>` : ''}</button>${body}</div>`
  })
  const done = (st.required || []).length - (st.missing || []).length
  return `<div class="home">
    <h2><img src="${LOGO}" alt="">Finish setup first</h2>
    <p class="sub">${owner ? 'The design agent stays off until all of these work, so nothing runs half-connected. Click one to see what to do. Items turn green by themselves within a few seconds of being connected.' : 'The Owner is still setting up the studio. Projects start once setup is finished.'}</p>
    ${S.config.restartNeeded ? '<div class="gate-row" style="cursor:default"><span class="dot gate"></span><div><b>Restart the studio to load the latest version</b><span class="s">Close its Terminal window, then double-click Start Design Studio.</span></div></div>' : ''}
    <div class="home-cards"><div class="label">Setup · ${done} of ${(st.required || []).length} done</div>${rows.join('')}</div>
  </div>`
}

function homeHTML() {
  if (S.config.setup && !S.config.setup.ready) return setupGateHTML()
  const mine = S.jobs.filter(needsMe)
  return `<div class="home">
    <h2><img src="${LOGO}" alt="">What are we designing?</h2>
    <p class="sub">Paste a BRD or drop the PDF. The agent specs it against the strategy, asks what it needs, and brings you a proposal.</p>
    ${S.config.connected ? '<div class="home-box" id="home-slot"></div>' : connectHTML()}
    ${mine.length ? `<div class="home-cards"><div class="label">Needs you</div>${mine.map((j) => `<a class="gate-row" href="#j/${j.slug}"><span class="dot gate"></span><div style="min-width:0"><b>${esc(j.title)}</b><span class="s">${esc(S.config.statuses[j.status]?.gate || '')}</span></div><span class="go">Open</span></a>`).join('')}</div>` : ''}
    ${lumenNotice()}
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
    ${figmaTokenHTML(owner)}
  </div>`
}
function figmaTokenHTML(owner) {
  const F = S.figmaToken || {}
  const R = F.research || S.config.research || {}
  const status = F.set
    ? R.error ? `<span style="color:var(--err)">${esc(R.error)}</span>` : R.checkedAt ? `Connected · ${R.files || 0} research files found${R.updated?.length ? ` · ${R.updated.length} new/updated` : ''}` : 'Saved · checking the folder…'
    : 'Not set. The agent can still open research files you link, but won’t see new ones by itself.'
  return `<div class="skill-group"><h3>Figma research folder</h3>
    <div class="gate-row" style="cursor:default"><span class="dot ${F.set && !R.error ? 'done' : ''}"></span><div style="min-width:0"><b>${F.set ? `Token ${esc(F.hint || '')}` : 'No Figma token'}</b><span class="s">${status}</span></div></div></div>
    ${owner ? `<form class="card" id="figma-token-form" style="max-width:560px"><div class="card-head"><div><div class="card-title">${F.set ? 'Replace the Figma token' : 'Add the Figma token'}</div><div class="card-sub">Figma home → your name (top-left) → Settings → Security → Personal access tokens. Scopes: Folders and File content, read only. Pick the longest expiry. It stays on this computer.</div></div></div>
      <div class="card-body"><input class="field-in" id="figma-token" type="password" autocomplete="off" spellcheck="false" placeholder="figd_…" aria-label="Figma token"><div class="card-sub" id="ft-err" style="color:var(--err)" hidden></div></div>
      <div class="card-actions"><button class="btn primary" type="submit">Save and check</button>${F.set ? '<button class="btn ghost" type="button" data-figma-remove>Remove</button>' : ''}</div></form>` : ''}`
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
  composer.classList.toggle('is-home', S.view === 'skills' || S.view === 'settings' || S.view === 'taste' || S.view === 'ideas' || S.view === 'resources' || S.view === 'notifications' || (S.view === 'job' && !S.job) || (S.view === 'home' && (!S.config.connected || (S.config.setup && !S.config.setup.ready))))
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
  m.classList.remove('me-menu')
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
  const I = (d) => `<svg class="mi-ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`
  const icons = {
    ideas: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0012 3z"/>'),
    taste: I('<path d="M12 3l2.5 5.5L20 9l-4.2 4 1.1 6L12 16l-4.9 3 1.1-6L4 9l5.5-.5z"/>'),
    skills: I('<path d="M4 5h6v14H4zM14 5h6v14h-6z"/>'),
    settings: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>'),
    res: I('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
    bell: I('<path d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0"/>'),
    key: I('<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M17 5l2 2"/>'),
    out: I('<path d="M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10"/>'),
  }
  menu(
    anchor,
    `<div class="mm-head"><span class="avatar">${esc((u.name || '?').slice(0, 2).toUpperCase())}</span><div><b>${esc(u.name)}</b><span>${u.role === 'owner' ? 'Owner' : 'Requester'}</span></div></div>
    <hr>
    <a class="mi" href="#ideas">${icons.ideas}Ideas</a>
    <a class="mi" href="#taste">${icons.taste}Taste</a>
    <a class="mi" href="#skills">${icons.skills}Skills</a>
    <a class="mi" href="#settings">${icons.settings}Settings</a>
    <a class="mi" href="#resources">${icons.res}Resources</a>
    <hr>
    <a class="mi" href="#notifications">${icons.bell}Notifications</a>
    <button class="mi" id="mm-pass">${icons.key}Change password</button>
    <button class="mi" id="mm-out">${icons.out}Sign out</button>`,
    (m) => {
      m.classList.add('me-menu')
      $('#mm-out', m).onclick = async () => (await api('/api/auth/logout', {}).catch(() => {}), (S.user = null), authScreen('login'))
      $('#mm-pass', m).onclick = () => ((m.hidden = true), passwordModal())
    },
  )
}
function passwordModal(target) {
  const root = $('#modal-root')
  root.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-labelledby="pw-t" id="pw-form"><h2 id="pw-t">${target ? `New password for ${esc(target.name)}` : 'Change your password'}</h2><p>At least 10 characters.${target ? ' They’ll be signed out everywhere.' : ' You’ll sign in again after.'}</p>
    <input class="field-in" id="pw-new" type="password" autocomplete="new-password" minlength="10" required aria-label="New password"><div class="card-sub" id="pw-err" style="color:var(--err)" hidden></div>
    <div class="foot"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit" id="pw-save">Save</button></div></form>`
  root.hidden = false
  $('#pw-new').focus()
  const close = () => ((root.hidden = true), (root.innerHTML = ''))
  root.onclick = (e) => (e.target === root || e.target.dataset.close != null) && close()
  $('#pw-save').onclick = (e) => (e.preventDefault(), $('#pw-form').requestSubmit())
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
  if (mode === 'restart') {
    el.innerHTML = `<div class="auth-card"><img src="${LOGO}" alt="" class="auth-logo"><h1>Restart the studio</h1><p>The studio was updated but the old version is still running. Close its Terminal window (choose Terminate), double-click <b>Start Design Studio.command</b>, then reload this page.</p><button class="btn primary" type="button" onclick="location.reload()">Reload</button></div>`
    el.hidden = false
    document.body.classList.add('signed-out')
    return
  }
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
  const rx = e.target.closest('[data-react]')
  if (rx) return reactModal(rx.dataset.react, rx.dataset.target)
  const rb = e.target.closest('[data-rule-act]')
  if (rb) {
    try {
      const r = await api('/api/taste/review', { id: rb.dataset.rule, action: rb.dataset.ruleAct })
      S.taste.rules = r.rules
      toast(rb.dataset.ruleAct === 'keep' ? 'Kept' : 'Undone', rb.dataset.ruleAct === 'keep' ? 'Confirmed rule.' : 'Removed from the taste notes; the agent won’t re-learn it.')
      renderAll(false)
    } catch (x) {
      toast('Couldn’t do that', x.message)
    }
    return
  }
  if (e.target.closest('[data-figma-remove]')) {
    S.figmaToken = await api('/api/figma-token', { remove: true }).catch(() => S.figmaToken)
    renderAll()
    return
  }
  const nfs = e.target.closest('[data-nf-sound]')
  if (nfs) {
    setPref('studio-sound', nfs.dataset.nfSound)
    chime(nfs.dataset.nfSound)
    return renderAll(false)
  }
  if (e.target.closest('[data-nf-desk]')) {
    let p = Notification.permission
    if (p === 'default') p = await Notification.requestPermission()
    if (p === 'granted') new Notification('Design Studio', { body: 'Desktop alerts are on.', icon: LOGO })
    return renderAll(false)
  }
  const nft = e.target.closest('[data-nf-test]')
  const nfr = e.target.closest('[data-nf-remove]')
  if (nft || nfr || e.target.closest('[data-nf-rotate]')) {
    try {
      S.notify = await api('/api/notify', nft ? { action: 'test', id: nft.dataset.nfTest } : nfr ? { action: 'remove', id: nfr.dataset.nfRemove } : { action: 'rotate' })
      toast(nft ? 'Test sent' : nfr ? 'Channel removed' : 'New token', nft ? 'Check the channel.' : nfr ? '' : 'Update it in Mattermost / Slack.')
    } catch (x) {
      toast('Couldn’t do that', x.message)
    }
    return renderAll(false)
  }
  const nfc = e.target.closest('[data-nf-copy]')
  if (nfc) {
    navigator.clipboard?.writeText(nfc.dataset.nfCopy).then(() => toast('Copied', ''), () => toast('Couldn’t copy', 'Select it and copy by hand.'))
    return
  }
  const so = e.target.closest('[data-setup-open]')
  if (so) {
    S.setupOpen = S.setupOpen === so.dataset.setupOpen ? '__none' : so.dataset.setupOpen
    if (so.dataset.setupOpen === 'research' && !S.figmaToken) S.figmaToken = await api('/api/figma-token').catch(() => ({}))
    renderAll(false)
    return
  }
  const sr = e.target.closest('[data-setup-run]')
  if (sr) {
    try {
      const r = await api('/api/setup/run', { item: sr.dataset.setupRun })
      toast('Opened', r.message)
    } catch (x) {
      toast('Do this on the studio computer', x.message)
    }
    return
  }
  const sc = e.target.closest('[data-setup-check]')
  if (sc) {
    sc.disabled = true
    sc.textContent = 'Checking…'
    try {
      S.config.setup = await api('/api/setup', {})
      toast(S.config.setup.ready ? 'Setup complete' : 'Still missing', S.config.setup.ready ? 'The design agent is on.' : S.config.setup.missing.map((k) => S.config.setup.items[k].label).join(', '))
    } catch (x) {
      toast('Couldn’t check', x.message)
    }
    renderAll(false)
    return
  }
  const pr = e.target.closest('[data-promote]')
  if (pr) {
    try {
      const j = await api('/api/ideas/promote', { slug: pr.dataset.run, id: pr.dataset.promote })
      await loadJobs()
      go(`#j/${j.slug}`)
    } catch (x) {
      toast('Couldn’t do that', x.message)
    }
    return
  }
  const mt = e.target.closest('[data-maint]')
  if (mt) {
    try {
      const j = await api(`/api/maintenance/${mt.dataset.maint}`, {})
      await loadJobs()
      go(`#j/${j.slug}`)
    } catch (x) {
      toast('Couldn’t start it', x.message)
    }
    return
  }
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
  if (t.dataset.zoom) return zoom(t.dataset.zoom, t.dataset.caption, t)
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
  if (e.target.id === 'figma-token-form') {
    e.preventDefault()
    const btn = e.target.querySelector('button[type=submit]')
    btn.disabled = true
    btn.textContent = 'Checking…'
    try {
      S.figmaToken = await api('/api/figma-token', { token: $('#figma-token').value })
      toast('Figma token saved', 'Checking the research folder… this takes a few seconds.')
      renderAll()
    } catch (x) {
      btn.disabled = false
      btn.textContent = 'Save and check'
      $('#ft-err').hidden = false
      $('#ft-err').textContent = x.message
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
    th.innerHTML = S.view === 'home' ? homeHTML() : S.view === 'skills' ? skillsHTML() : S.view === 'taste' ? tasteHTML() : S.view === 'ideas' ? ideasHTML() : S.view === 'resources' ? resourcesHTML() : S.view === 'notifications' ? notificationsHTML() : S.view === 'settings' ? settingsHTML() : '<div class="sys" style="margin-top:20vh">Project not found.</div>'
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
  if (S.view === 'home' || S.view === 'skills' || S.view === 'settings' || S.view === 'taste' || S.view === 'ideas') sc.scrollTop = 0
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
    if (msg.type === 'cursor') return onCursor(msg)
    if (msg.type === 'comments') return msg.slug === R.slug && R.open ? loadComments().then(renderReview) : undefined
    if (msg.type === 'research' && msg.research?.checkedAt) {
      if (S.figmaToken) S.figmaToken.research = msg.research
      if (S.figmaToken?.set) toast(msg.research.error ? 'Research folder: problem' : 'Research folder connected', msg.research.error || `${msg.research.files} research files found.`)
      if (S.view === 'home' || S.view === 'settings') renderAll(false)
    }
    if (msg.type === 'setup') {
      const was = S.config.setup?.ready
      const before = (S.config.setup?.missing || []).length
      S.config.setup = { ...S.config.setup, ...msg.setup }
      const after = (S.config.setup.missing || []).length
      if (after < before) toast(S.config.setup.ready ? 'Setup complete' : 'Connected', S.config.setup.ready ? 'The design agent is on.' : `${after} left to do.`)
      if (S.view === 'home' && (after !== before || was !== S.config.setup.ready)) renderAll(false)
    }
    if (msg.type === 'lumen') {
      S.config.lumen = msg.lumen
      toast('Lumen changed', 'The agent will design against the new version. See Taste → Lumen.', () => go('#taste'))
      if (S.view === 'home' || S.view === 'taste') renderAll(false)
      return
    }
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
  const r = await api('/api/auth/me').catch((e) => ({ error: e.message }))
  // An older studio server has no accounts yet: it needs a restart, not a password.
  if (r.error) return authScreen('restart')
  S.user = r.user || null
  if (!S.user) return authScreen(r.setup ? 'setup' : 'login')
  start()
})()
