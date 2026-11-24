// Screenshots of the live site for the design agent (question cards, proposals, current-state boards).
// Uses the Chrome already installed on this Mac through playwright-core — no browser download.
// Only the local live site is captured (prototype lane :3001 by default).
import fs from 'node:fs'
import path from 'node:path'

let pw
async function chromium() {
  if (!pw) pw = await import('playwright-core')
  const opts = { headless: true }
  const linux = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p))
  if (process.env.STUDIO_CHROME_PATH) opts.executablePath = process.env.STUDIO_CHROME_PATH
  else if (linux) opts.executablePath = linux // server (Docker image ships Chromium)
  else opts.channel = 'chrome'
  if (process.platform === 'linux') opts.args = ['--no-sandbox', '--disable-dev-shm-usage']
  try {
    return await pw.chromium.launch(opts)
  } catch (e) {
    throw new Error(`Couldn’t start Chrome for screenshots (${e.message.split('\n')[0]}). Install Google Chrome, or set STUDIO_CHROME_PATH in apps/studio/.env.`)
  }
}

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } }

export async function captureSite({ origin, route = '/', viewport = 'desktop', selector, loggedIn = true, fullPage = false, outFile, waitMs = 1200 }) {
  const url = new URL(route, origin)
  if (!/^(127\.0\.0\.1|localhost)$/.test(url.hostname)) throw new Error('Only the local live site can be captured.')
  try {
    await fetch(origin, { signal: AbortSignal.timeout(3000) })
  } catch {
    throw new Error(`The live site isn’t running at ${origin}. Ask the team to double-click “Start Prototype Lane.command”, then capture again.`)
  }
  const browser = await chromium()
  try {
    const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: 'dark' })
    // The site's own local access flag (lib/access.ts) and demo login (shell-context.tsx), so we capture the product, not the gate.
    await ctx.addCookies([{ name: 'lumen-access', value: '1', domain: url.hostname, path: '/' }])
    await ctx.addInitScript((li) => {
      try {
        localStorage.setItem('lumen-shell-demo-logged-in', li ? '1' : '0')
      } catch {}
    }, loggedIn)
    const page = await ctx.newPage()
    await page.goto(url.href, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.waitForLoadState('load'))
    await page.waitForTimeout(waitMs)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    if (selector) {
      const el = page.locator(selector).first()
      await el.waitFor({ state: 'visible', timeout: 8000 })
      await el.screenshot({ path: outFile })
    } else {
      await page.screenshot({ path: outFile, fullPage })
    }
    return outFile
  } finally {
    await browser.close()
  }
}

// Draw numbered comment pins onto a screenshot, so the agent sees exactly where each comment points.
// Uses the same local Chrome as captureSite. pins: [{ n, x, y }] with x/y as 0–1 of the image.
export async function renderAnnotated({ src, pins, outFile }) {
  const data = fs.readFileSync(src)
  const ext = path.extname(src).slice(1).toLowerCase().replace('jpg', 'jpeg')
  const browser = await chromium()
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
    const html = `<!doctype html><html><body style="margin:0;background:#000">
      <div id="w" style="position:relative;display:inline-block">
        <img id="i" src="data:image/${ext};base64,${data.toString('base64')}" style="display:block;max-width:1600px">
        ${pins.map((p) => `<div style="position:absolute;left:${(p.x * 100).toFixed(3)}%;top:${(p.y * 100).toFixed(3)}%;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;background:#ff2d95;color:#fff;font:700 16px/34px system-ui,sans-serif;text-align:center;border:3px solid #fff;box-shadow:0 0 0 3px #ff2d95,0 6px 18px rgba(0,0,0,.6)">${p.n}</div>`).join('')}
      </div></body></html>`
    await page.setContent(html)
    await page.waitForFunction(() => document.getElementById('i').complete)
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    await page.locator('#w').screenshot({ path: outFile })
  } finally {
    await browser.close()
  }
  return outFile
}
