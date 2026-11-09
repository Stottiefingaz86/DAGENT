// Team collaboration: invite links, the in-app notification inbox, who's online, @mentions and project access.
// Files (git-ignored, mode 600): apps/studio/.studio-team.json (settings, invites, last seen) and .studio-inbox.json.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const INVITE_DAYS = 7
const ONLINE_MS = 90e3 // seen in the last 90s (or a live tab open) = online

export function createTeam(dir, { auth, broadcast }) {
  const TEAM = path.join(dir, '.studio-team.json')
  const INBOX = path.join(dir, '.studio-inbox.json')
  const read = (f, d) => {
    try {
      return { ...d, ...JSON.parse(fs.readFileSync(f, 'utf8')) }
    } catch {
      return d
    }
  }
  const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2), { mode: 0o600 })
  const DEFAULTS = { designersSeeAll: false, sessionDays: 14, idleHours: 0, inviteDays: INVITE_DAYS, allowedDomains: [] }
  const team = read(TEAM, { settings: {}, invites: [], lastSeen: {} })
  team.settings = { ...DEFAULTS, ...team.settings }
  let inbox = read(INBOX, { items: [] }).items
  const saveTeam = () => write(TEAM, team)
  // Audit log (sign-ins, invites, roles, security changes): one JSON line each, git-ignored.
  const AUDIT = path.join(dir, '.studio-audit.jsonl')
  function audit(user, type, text, extra = {}) {
    try {
      fs.appendFileSync(AUDIT, JSON.stringify({ at: new Date().toISOString(), by: user?.name || 'Someone', byId: user?.id || null, type, text: String(text).slice(0, 400), ...extra }) + '\n', { mode: 0o600 })
    } catch {}
  }
  function auditList() {
    try {
      return fs.readFileSync(AUDIT, 'utf8').trim().split('\n').filter(Boolean).slice(-5000).map((l) => JSON.parse(l))
    } catch {
      return []
    }
  }
  const saveInbox = () => write(INBOX, { items: inbox })
  const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')

  // ---------- roles + access ----------
  const isAdmin = (u) => u?.role === 'owner'
  // Lead: signs off on any project and sees everything, but has no access to admin settings.
  const isLead = (u) => u?.role === 'lead'
  const tempSignoff = (u) => u?.role === 'designer' && u.canSignoff && (!u.signoffUntil || new Date(u.signoffUntil) > new Date())
  const signoffActive = (u) => !!u && (isAdmin(u) || isLead(u) || tempSignoff(u))
  const assigned = (u, job) => !!u && ((job.assignees || []).includes(u.id) || job.createdById === u.id)
  const canSee = (u, job) => !!u && (isAdmin(u) || isLead(u) || assigned(u, job) || (u.role === 'designer' && team.settings.designersSeeAll))
  // Work on a project (message the agent, answer, react, request sign-off, Figma): Admin, Lead, or a Designer on the project.
  const canWork = (u, job) => !!u && (isAdmin(u) || isLead(u) || (u.role === 'designer' && assigned(u, job)))
  // Approve direction / Final sign-off: Admin or Lead on any project; a Designer with temporary rights on their projects.
  const canSignoff = (u, job) => signoffActive(u) && (isAdmin(u) || isLead(u) || assigned(u, job))
  // People who can sign off this project right now (Admins first; delegates when an Admin is away or always if granted).
  const signers = (job) => auth.raw().filter((u) => canSignoff(u, job))

  // ---------- invites ----------
  function createInvite({ role, name, projects, days }, by) {
    const token = crypto.randomBytes(24).toString('hex')
    const inv = {
      id: crypto.randomUUID().slice(0, 8),
      hash: sha(token),
      role: ['owner', 'lead', 'designer', 'viewer'].includes(role) ? role : 'designer',
      name: String(name || '').trim().slice(0, 40),
      projects: Array.isArray(projects) ? projects.map(String).slice(0, 50) : [],
      by: by.name,
      createdAt: new Date().toISOString(),
      expires: new Date(Date.now() + Math.min(30, Math.max(1, Number(days) || team.settings.inviteDays || INVITE_DAYS)) * 864e5).toISOString(),
    }
    team.invites = team.invites.filter((i) => new Date(i.expires) > new Date())
    team.invites.push(inv)
    saveTeam()
    return { token, invite: publicInvite(inv) }
  }
  const publicInvite = ({ hash, ...i }) => i
  const findInvite = (token) => {
    const i = team.invites.find((x) => x.hash === sha(String(token || '')))
    return i && new Date(i.expires) > new Date() ? i : null
  }
  function useInvite(token) {
    const i = findInvite(token)
    if (!i) throw new Error('This invite link has expired or was already used. Ask an Admin for a new one.')
    team.invites = team.invites.filter((x) => x.id !== i.id)
    saveTeam()
    return i
  }
  function revokeInvite(id) {
    team.invites = team.invites.filter((x) => x.id !== id)
    saveTeam()
  }

  // ---------- inbox (in-app notifications) ----------
  // type: signoff | direction | mention | assigned | comment | gate | handover | dev_question | joined
  function notify(userIds, { type, slug = null, title = '', text, by = null, byId = null }) {
    const ids = [...new Set(userIds)].filter((id) => id && id !== byId)
    if (!ids.length) return []
    const at = new Date().toISOString()
    const made = ids.map((userId) => ({ id: crypto.randomUUID().slice(0, 10), userId, type, slug, title, text: String(text).slice(0, 400), by, at, read: false }))
    inbox.push(...made)
    // keep the last 200 per person
    const per = new Map()
    inbox = inbox.reverse().filter((n) => (per.set(n.userId, (per.get(n.userId) || 0) + 1), per.get(n.userId) <= 200)).reverse()
    saveInbox()
    broadcast({ type: 'inbox', users: ids, kind: type, slug, title, text: made[0].text, by })
    return made
  }
  const inboxFor = (userId) => {
    const items = inbox.filter((n) => n.userId === userId).slice(-100).reverse()
    return { items, unread: items.filter((n) => !n.read).length }
  }
  function markRead(userId, ids) {
    for (const n of inbox) if (n.userId === userId && (ids === 'all' || ids.includes(n.id))) n.read = true
    saveInbox()
  }

  // ---------- @mentions ----------
  // "@sam", "@sam.lee", "@Sam" match a handle (username before @) or a first name.
  const handleOf = (u) => u.username.split('@')[0]
  function mentioned(text) {
    const tags = [...String(text || '').matchAll(/(^|[\s(])@([a-z0-9._-]{2,40})/gi)].map((m) => m[2].toLowerCase().replace(/[._-]+$/, ''))
    if (!tags.length) return []
    const users = auth.raw()
    return users.filter((u) => tags.some((t) => t === handleOf(u) || t === u.username || t === u.name.toLowerCase().split(/\s+/)[0] || t === u.name.toLowerCase().replace(/\s+/g, '')))
  }

  // ---------- presence ----------
  const live = new Map() // userId -> { tabs, at, slug, view }
  let lastBroadcast = ''
  const onlineNow = (id) => {
    const p = live.get(id)
    return !!p && (p.tabs > 0 || Date.now() - p.at < ONLINE_MS)
  }
  function pushPresence() {
    const snap = JSON.stringify(presence())
    if (snap === lastBroadcast) return
    lastBroadcast = snap
    broadcast({ type: 'online', online: JSON.parse(snap) })
  }
  function touch(user, where) {
    if (!user) return
    const p = live.get(user.id) || { tabs: 0, at: 0, slug: null, view: null }
    p.at = Date.now()
    if (where) Object.assign(p, { slug: where.slug || null, view: where.view || null })
    live.set(user.id, p)
    // persist "last seen" at most once a minute per person
    if (!team.lastSeen[user.id] || Date.now() - new Date(team.lastSeen[user.id]) > 60e3) {
      team.lastSeen[user.id] = new Date().toISOString()
      saveTeam()
    }
    if (where) pushPresence()
  }
  function tab(user, delta) {
    if (!user) return
    touch(user)
    const p = live.get(user.id)
    p.tabs = Math.max(0, p.tabs + delta)
    pushPresence()
  }
  const presence = () =>
    auth.raw()
      .filter((u) => onlineNow(u.id))
      .map((u) => ({ id: u.id, slug: live.get(u.id)?.slug || null, view: live.get(u.id)?.view || null }))
  setInterval(pushPresence, 30e3).unref()

  return {
    audit,
    auditList,
    settings: () => team.settings,
    setSettings(s) {
      const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)))
      if ('designersSeeAll' in s) team.settings.designersSeeAll = !!s.designersSeeAll
      if ('sessionDays' in s) team.settings.sessionDays = num(s.sessionDays, 1, 30)
      if ('idleHours' in s) team.settings.idleHours = num(s.idleHours, 0, 720)
      if ('inviteDays' in s) team.settings.inviteDays = num(s.inviteDays, 1, 30)
      if ('allowedDomains' in s)
        team.settings.allowedDomains = String(Array.isArray(s.allowedDomains) ? s.allowedDomains.join(',') : s.allowedDomains || '')
          .split(/[\s,]+/)
          .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
          .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
          .slice(0, 10)
      saveTeam()
    },
    // Invite sign-ups must use a work email on one of these domains (when any are set).
    domainOk: (username) => !team.settings.allowedDomains.length || team.settings.allowedDomains.some((d) => String(username).toLowerCase().endsWith('@' + d)),
    isAdmin,
    canSee,
    canWork,
    canSignoff,
    signoffActive,
    signers,
    assigned,
    createInvite,
    findInvite: (t) => {
      const i = findInvite(t)
      return i && publicInvite(i)
    },
    useInvite,
    revokeInvite,
    invites: () => team.invites.filter((i) => new Date(i.expires) > new Date()).map(publicInvite),
    notify,
    inboxFor,
    markRead,
    mentioned,
    handleOf,
    touch,
    tab,
    presence,
    onlineNow,
    where: (id) => live.get(id) || null,
    lastSeen: (id) => (onlineNow(id) ? new Date().toISOString() : team.lastSeen[id] || null),
  }
}
