// Screenshots of the live site for the design agent (question cards, proposals, current-state boards).
// Uses the Chrome already installed on this Mac through playwright-core — no browser download.
// Only the local live site is captured (prototype lane :3001 by default).
import fs from 'node:fs'
import path from 'node:path'

let pw
async function chromium() {
  if (!pw) pw = await import('playwright-core')
  const opts = { headless: true }
  if (process.env.STUDIO_CHROME_PATH) opts.executablePath = process.env.STUDIO_CHROME_PATH
  else opts.channel = 'chrome'
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
