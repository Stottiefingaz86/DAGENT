// Studio accounts. Passwords are scrypt-hashed; sessions are random tokens in an
// HttpOnly, SameSite=Strict cookie (only a hash of each token is stored on disk).
// Files: apps/studio/.studio-users.json and .studio-sessions.json (git-ignored, mode 600).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const SESSION_DAYS = 14
const COOKIE = 'studio_session'

export function createAuth(dir) {
  const USERS = path.join(dir, '.studio-users.json')
  const SESSIONS = path.join(dir, '.studio-sessions.json')
  const read = (f, d) => {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch {
      return d
    }
  }
  const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2), { mode: 0o600 })
  // Roles: owner (shown as Admin) · lead (signs off, no admin) · designer · viewer. Older studios used "requester" → designer.
  const ROLES = ['owner', 'lead', 'designer', 'viewer']
  // Security policy comes from Settings → Security (session length, idle timeout).
  let policy = () => ({ sessionDays: SESSION_DAYS, idleHours: 0 })
  const normRole = (r) => (ROLES.includes(r) ? r : r === 'requester' ? 'designer' : 'designer')
  let users = read(USERS, []).map((u) => ({ ...u, role: normRole(u.role) }))
  let sessions = read(SESSIONS, {}) // sha256(token) -> { userId, exp }
  const saveUsers = () => write(USERS, users)
  const saveSessions = () => write(SESSIONS, sessions)
  const sha = (t) => crypto.createHash('sha256').update(t).digest('hex')
  const publicUser = (u) =>
    u && { id: u.id, name: u.name, username: u.username, handle: u.username.split('@')[0], role: u.role, canSignoff: !!u.canSignoff, signoffUntil: u.signoffUntil || null, away: u.away || null, createdAt: u.createdAt }

  const hash = (password, salt = crypto.randomBytes(16).toString('hex')) => ({ salt, hash: crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex') })
  const verify = (u, password) => {
    const h = Buffer.from(hash(password, u.salt).hash, 'hex')
    const s = Buffer.from(u.hash, 'hex')
    return h.length === s.length && crypto.timingSafeEqual(h, s)
  }
  const checkPassword = (pw) => (String(pw || '').length < 10 ? 'Use at least 10 characters for the password.' : null)
  const cleanName = (s, n = 40) => String(s || '').trim().slice(0, n)
  const cleanUsername = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9._@-]/g, '').slice(0, 60)

  // Brute-force guard: 8 failed logins per IP per 15 minutes.
  const fails = new Map()
  const limited = (ip) => {
    const f = fails.get(ip)
    return f && f.n >= 8 && Date.now() - f.at < 15 * 60e3
  }
  const fail = (ip) => {
    const f = fails.get(ip)
    fails.set(ip, f && Date.now() - f.at < 15 * 60e3 ? { n: f.n + 1, at: f.at } : { n: 1, at: Date.now() })
  }

  function cookieToken(req) {
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`).exec(req.headers.cookie || '')
    return m?.[1] || null
  }
  let dirty = 0
  function userFor(req) {
    const t = cookieToken(req)
    if (!t) return null
    const k = sha(t)
    const s = sessions[k]
    if (!s || s.exp < Date.now()) return null
    const idle = policy().idleHours
    if (idle && s.last && Date.now() - s.last > idle * 3600e3) {
      delete sessions[k]
      saveSessions()
      return null
    }
    s.last = Date.now()
    // write "last used" at most every 5 minutes
    if (Date.now() - dirty > 5 * 60e3) (dirty = Date.now()), saveSessions()
    return users.find((u) => u.id === s.userId) || null
  }
  function startSession(res, user, secure) {
    const t = crypto.randomBytes(32).toString('hex')
    for (const [k, s] of Object.entries(sessions)) if (s.exp < Date.now()) delete sessions[k]
    const days = policy().sessionDays || SESSION_DAYS
    sessions[sha(t)] = { userId: user.id, exp: Date.now() + days * 864e5, last: Date.now() }
    saveSessions()
    res.setHeader('Set-Cookie', `${COOKIE}=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${days * 86400}${secure ? '; Secure' : ''}`)
  }
  function endSession(req, res) {
    const t = cookieToken(req)
    if (t) delete sessions[sha(t)]
    saveSessions()
    res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`)
  }
  const dropSessionsOf = (userId) => {
    for (const [k, s] of Object.entries(sessions)) if (s.userId === userId) delete sessions[k]
    saveSessions()
  }

  function addUser({ name, username, password, role }) {
    const un = cleanUsername(username)
    if (!un) throw new Error('Add a username or email.')
    if (users.some((u) => u.username === un)) throw new Error('That username is taken.')
    const bad = checkPassword(password)
    if (bad) throw new Error(bad)
    const u = { id: crypto.randomUUID(), name: cleanName(name) || un, username: un, role: normRole(role), ...hash(String(password)), createdAt: new Date().toISOString() }
    users.push(u)
    saveUsers()
    return publicUser(u)
  }

  return {
    COOKIE,
    needsSetup: () => users.length === 0,
    userFor,
    publicUser,
    setup(res, body, secure) {
      if (users.length) throw new Error('The studio is already set up.')
      const u = addUser({ ...body, role: 'owner' })
      startSession(res, users.find((x) => x.id === u.id), secure)
      return u
    },
    login(req, res, body, ip, secure) {
      if (limited(ip)) throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'), { code: 429 })
      const u = users.find((x) => x.username === cleanUsername(body.username))
      if (!u || !verify(u, String(body.password || ''))) {
        fail(ip)
        throw Object.assign(new Error('Wrong username or password.'), { code: 401 })
      }
      fails.delete(ip)
      startSession(res, u, secure)
      return publicUser(u)
    },
    logout: endSession,
    list: () => users.map(publicUser),
    addUser,
    removeUser(id, byId) {
      if (id === byId) throw new Error('You can’t remove yourself.')
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      if (u.role === 'owner' && users.filter((x) => x.role === 'owner').length === 1) throw new Error('Keep at least one Owner.')
      users = users.filter((x) => x.id !== id)
      saveUsers()
      dropSessionsOf(id)
    },
    setPassword(id, password) {
      const bad = checkPassword(password)
      if (bad) throw new Error(bad)
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      Object.assign(u, hash(String(password)))
      saveUsers()
      dropSessionsOf(id)
    },
    setRole(id, role, byId) {
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      if (u.role === 'owner' && role !== 'owner' && users.filter((x) => x.role === 'owner').length === 1) throw new Error('Keep at least one Owner.')
      if (id === byId && role !== 'owner') throw new Error('Ask another Owner to change your role.')
      u.role = normRole(role)
      if (u.role !== 'designer') (u.canSignoff = false), (u.signoffUntil = null)
      saveUsers()
    },
    // Let a Designer approve directions and give Final sign-off (e.g. while the Admin is off). Optional end date.
    setSignoff(id, on, until) {
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      if (on && u.role !== 'designer') throw new Error(u.role === 'viewer' ? 'Make them a Designer first; Viewers can only comment.' : 'Admins and Leads can always sign off.')
      u.canSignoff = !!on
      u.signoffUntil = on && until ? new Date(until).toISOString() : null
      saveUsers()
    },
    // "I'm away until …" — shown to the team; sign-off requests also go to people with sign-off rights.
    setAway(id, until) {
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      u.away = until ? { until: new Date(until).toISOString() } : null
      saveUsers()
    },
    setPolicy: (fn) => (policy = fn),
    setName(id, name) {
      const u = users.find((x) => x.id === id)
      if (!u) throw new Error('No such person.')
      const n = cleanName(name)
      if (!n) throw new Error('Add a name.')
      u.name = n
      saveUsers()
    },
    // Security: sign one person out everywhere, or everyone except the current session.
    signOutUser: (id) => dropSessionsOf(id),
    signOutAllExcept(req) {
      const keep = cookieToken(req) && sha(cookieToken(req))
      for (const k of Object.keys(sessions)) if (k !== keep) delete sessions[k]
      saveSessions()
    },
    sessionCount: (id) => Object.values(sessions).filter((s) => s.userId === id && s.exp > Date.now()).length,
    raw: () => users.map((u) => ({ ...publicUser(u), away: u.away && new Date(u.away.until) > new Date() ? u.away : null })),
    // Accept an invite link: create the account with the invited role and sign them in.
    join(res, body, role, secure) {
      const u = addUser({ ...body, role })
      startSession(res, users.find((x) => x.id === u.id), secure)
      return u
    },
  }
}
