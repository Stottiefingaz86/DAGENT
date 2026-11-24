// Server only (AWS): the prototype site (the lane on 127.0.0.1:3001) for people's browsers, behind the studio login.
// Runs on its own port (STUDIO_PROTOTYPE_PROXY_PORT, e.g. 4101) so the load balancer can give it its own address
// (e.g. https://proto.example.com). The studio login cookie is shared through STUDIO_COOKIE_DOMAIN.
// Plain HTTP and websockets (Next's live reload) are forwarded. Nobody without a studio session gets through.
import http from 'node:http'
import net from 'node:net'

const SIGN_IN = (studioUrl) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sign in</title>` +
  `<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0f1115;color:#e8e8ea;font:15px system-ui,sans-serif">` +
  `<div>Sign in to the Design Studio first${studioUrl ? `: <a style="color:#8ab4ff" href="${studioUrl}">${studioUrl}</a>` : ''}.</div>`

export function startPrototypeProxy({ port, host, target, auth, lane, studioUrl, log }) {
  const t = new URL(target)
  const tPort = Number(t.port || 80)
  // The site's own passcode gate (lib/access.ts) is already covered by the studio login.
  const ACCESS = 'lumen-access=1; Path=/; Max-Age=2592000; SameSite=Lax'
  const fwdHeaders = (req) => {
    const h = { ...req.headers, host: t.host }
    if (h.origin) h.origin = t.origin
    delete h['x-forwarded-host']
    return h
  }

  const server = http.createServer(async (req, res) => {
    if (req.url === '/healthz') return res.writeHead(200, { 'Content-Type': 'text/plain' }), res.end('ok')
    if (!auth.userFor(req)) return res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }), res.end(SIGN_IN(studioUrl))
    if (lane.status().status !== 'running') await lane.ensure().catch(() => {})
    const up = http.request({ host: t.hostname, port: tPort, method: req.method, path: req.url, headers: fwdHeaders(req) }, (r) => {
      const headers = { ...r.headers }
      if (/text\/html/.test(headers['content-type'] || '')) headers['set-cookie'] = [...[].concat(headers['set-cookie'] || []), ACCESS]
      res.writeHead(r.statusCode || 502, headers)
      r.pipe(res)
    })
    up.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '5' })
      res.end('The prototype site is starting. Refresh in a moment.')
    })
    req.pipe(up)
  })

  // Websockets (Next.js live reload): check the session, then pipe the raw connection through.
  server.on('upgrade', (req, socket, head) => {
    if (!auth.userFor(req)) return socket.destroy()
    const up = net.connect(tPort, t.hostname, () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`]
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const k = req.rawHeaders[i]
        const lk = k.toLowerCase()
        if (lk === 'host') lines.push(`Host: ${t.host}`)
        else if (lk === 'origin') lines.push(`Origin: ${t.origin}`)
        else lines.push(`${k}: ${req.rawHeaders[i + 1]}`)
      }
      up.write(lines.join('\r\n') + '\r\n\r\n')
      if (head?.length) up.write(head)
      socket.pipe(up).pipe(socket)
    })
    up.on('error', () => socket.destroy())
    socket.on('error', () => up.destroy())
  })

  server.on('error', (e) => log(`prototype proxy error: ${e.code || e.message}`))
  server.listen(port, host, () => log(`prototype proxy listening on ${host}:${port} → ${target}`))
  return server
}
