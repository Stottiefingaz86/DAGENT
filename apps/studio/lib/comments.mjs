// Pinned comments on screenshots, Figma-style. One file per project: specs/<slug>/comments.json.
// A comment is pinned at x/y (0–1, relative to the image) so the agent knows exactly what it refers to.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export function createComments(store) {
  const file = (slug) => path.join(store.dir(slug), 'comments.json')
  const read = (slug) => {
    try {
      return JSON.parse(fs.readFileSync(file(slug), 'utf8'))
    } catch {
      return []
    }
  }
  const write = (slug, list) => fs.writeFileSync(file(slug), JSON.stringify(list, null, 2))
  const clip = (s, n) => String(s || '').trim().slice(0, n)
  const num = (v) => Math.min(1, Math.max(0, Number(v) || 0))
  // Only screenshots inside this project's folder (or other repo images under specs/) can be commented on.
  const okImage = (slug, image) => /^specs\/[a-z0-9-]+\/[\w./-]+\.(png|jpe?g|webp)$/i.test(image) && !image.includes('..') && fs.existsSync(path.join(store.repoRoot, image))

  return {
    list: read,
    add(slug, { image, x, y, text }, user) {
      if (!okImage(slug, String(image))) throw new Error('Comments can only go on project screenshots.')
      if (!clip(text, 2000)) throw new Error('Write a comment')
      const list = read(slug)
      const c = { id: crypto.randomUUID().slice(0, 8), n: list.length + 1, image, x: num(x), y: num(y), text: clip(text, 2000), by: user.name, byId: user.id, at: new Date().toISOString(), replies: [], resolved: false, sentAt: null }
      list.push(c)
      write(slug, list)
      return c
    },
    reply(slug, id, text, user) {
      const list = read(slug)
      const c = list.find((x) => x.id === id)
      if (!c) throw new Error('No such comment')
      if (!clip(text, 2000)) throw new Error('Write a reply')
      c.replies.push({ id: crypto.randomUUID().slice(0, 8), text: clip(text, 2000), by: user.name, byId: user.id, at: new Date().toISOString() })
      c.sentAt = null // new discussion goes to the agent with the next send
      write(slug, list)
      return c
    },
    resolve(slug, id, value, user) {
      const list = read(slug)
      const c = list.find((x) => x.id === id)
      if (!c) throw new Error('No such comment')
      c.resolved = value !== false
      c.resolvedBy = c.resolved ? user.name : null
      write(slug, list)
      return c
    },
    remove(slug, id, user, isOwner) {
      const list = read(slug)
      const c = list.find((x) => x.id === id)
      if (!c) throw new Error('No such comment')
      if (c.byId !== user.id && !isOwner) throw new Error('Only the author or an Owner can delete a comment.')
      write(slug, list.filter((x) => x.id !== id))
    },
    unsent: (slug) => read(slug).filter((c) => !c.resolved && !c.sentAt),
    markSent(slug, ids) {
      const list = read(slug)
      const at = new Date().toISOString()
      for (const c of list) if (ids.includes(c.id)) c.sentAt = at
      write(slug, list)
    },
  }
}
