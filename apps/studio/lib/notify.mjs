// Chat notifications + replies: Slack, Mattermost, Microsoft Teams or any webhook.
// Out: when a project needs a person (or a handover is ready, or dev asks a design question) the studio posts to each channel.
// In:  a Mattermost outgoing webhook or a Slack slash command posts "<project> <message>" to /api/notify/inbound;
//      the message reaches that project's agent like feedback typed in the studio.
// Settings live in .studio-notify.json next to the studio (git-ignored, owner-read only).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const EVENTS = {
  needs_you: 'A project needs someone (questions, direction, prototype review, sign-off)',
  handover: 'Handover ready for dev',
  dev_question: 'Dev asked something the handover doesn’t cover',
  setup: 'Setup broke (a sign-in expired) or was completed',
  error: 'An agent run stopped with an error',
}

export function createNotify({ dir, publicUrl }) {
  const file = path.join(dir, '.studio-notify.json')
  let cfg = { channels: [], inboundToken: '' }
  try {
    cfg = { ...cfg, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {}
  const save = () => fs.writeFileSync(file, JSON.stringify(cfg, null, 2), { mode: 0o600 })
  if (!cfg.inboundToken) {
    cfg.inboundToken = crypto.randomBytes(18).toString('base64url')
    save()
  }
  const okUrl = (u) => /^https:\/\/[^\s]+$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u)
  const hint = (u) => u.replace(/^(https?:\/\/[^/]+\/).*(.{4})$/, '$1…$2')

  function payload(ch, msg) {
    const link = msg.slug ? `${publicUrl()}/#j/${msg.slug}` : publicUrl()
    const text = `${msg.title ? `*${msg.title}*: ` : ''}${msg.text}${msg.slug ? ` → ${link}` : ''}`
    if (ch.type === 'teams') return { text: text.replace(/\*/g, '**') }
    if (ch.type === 'webhook') return { event: msg.event, project: msg.slug || null, title: msg.title || null, text: msg.text, url: link }
    return { text } // Slack + Mattermost incoming webhooks
  }
  async function post(ch, msg) {
    try {
      const r = await fetch(ch.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(ch, msg)), signal: AbortSignal.timeout(10000) })
      ch.last = { at: new Date().toISOString(), ok: r.ok, status: r.status }
    } catch (e) {
      ch.last = { at: new Date().toISOString(), ok: false, status: String(e.cause?.code || e.message).slice(0, 80) }
    }
    save()
    return ch.last
  }

  return {
    // What the Settings page shows (webhook URLs are secrets: only a hint goes to the browser).
    public() {
      return { events: EVENTS, inboundToken: cfg.inboundToken, channels: cfg.channels.map(({ url, ...c }) => ({ ...c, hint: hint(url) })) }
    },
    add({ type, label, url, events }) {
      if (!['slack', 'mattermost', 'teams', 'webhook'].includes(type)) throw new Error('Pick Slack, Mattermost, Teams or Webhook.')
      url = String(url || '').trim()
      if (!okUrl(url)) throw new Error('Paste the webhook URL (it starts with https://).')
      const ch = { id: crypto.randomBytes(5).toString('hex'), type, label: String(label || type).slice(0, 40), url, events: (events || Object.keys(EVENTS)).filter((e) => EVENTS[e]), addedAt: new Date().toISOString() }
      cfg.channels.push(ch)
      save()
      return ch
    },
    remove(id) {
      cfg.channels = cfg.channels.filter((c) => c.id !== id)
      save()
    },
    setEvents(id, events) {
      const ch = cfg.channels.find((c) => c.id === id)
      if (ch) (ch.events = events.filter((e) => EVENTS[e])), save()
    },
    rotateToken() {
      cfg.inboundToken = crypto.randomBytes(18).toString('base64url')
      save()
      return cfg.inboundToken
    },
    test(id) {
      const ch = cfg.channels.find((c) => c.id === id)
      if (!ch) throw new Error('No such channel')
      return post(ch, { event: 'test', text: 'Design Studio is connected. You’ll get messages here when a project needs you.' })
    },
    send(event, msg) {
      for (const ch of cfg.channels) if (ch.events.includes(event)) post(ch, { ...msg, event })
    },
    tokenOk: (t) => !!t && crypto.timingSafeEqual(Buffer.from(String(t).padEnd(64).slice(0, 64)), Buffer.from(cfg.inboundToken.padEnd(64).slice(0, 64))),
  }
}
