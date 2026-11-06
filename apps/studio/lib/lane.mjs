// The prototype lane: the local copy of the BetOnline site (apps/live-site, port 3001) where the
// agent builds drafts and prototypes and where the chat's live prototype runs.
// The studio starts it itself (installing the site's packages the first time) so nobody has to.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export function createLane({ repoRoot, origin, onChange = () => {} }) {
  const siteDir = path.join(repoRoot, 'apps', 'live-site')
  const logFile = path.join(repoRoot, 'apps', 'studio', 'prototype-lane.log')
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(origin)
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  let state = { status: 'unknown', message: '', origin }
  let child = null
  let pending = null

  const set = (status, message = '') => {
    state = { status, message, origin, at: new Date().toISOString() }
    onChange(state)
  }
  const log = (s) => fs.appendFileSync(logFile, s)

  async function healthy() {
    try {
      // Any HTTP answer means Next is up (first compile may 404/500 briefly).
      await fetch(origin, { signal: AbortSignal.timeout(4000), redirect: 'manual' })
      return true
    } catch {
      return false
    }
  }

  function run(args, label) {
    return new Promise((resolve, reject) => {
      log(`\n--- ${new Date().toISOString()} ${label}: npm ${args.join(' ')}\n`)
      const p = spawn(npm, args, { cwd: siteDir, env: { ...process.env, PORT: undefined }, stdio: ['ignore', 'pipe', 'pipe'] })
      p.stdout.on('data', (d) => log(d))
      p.stderr.on('data', (d) => log(d))
      p.on('error', reject)
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed (exit ${code}). See apps/studio/prototype-lane.log`))))
    })
  }

  async function start() {
    if (await healthy()) return set('running', 'Prototype lane is running.')
    if (!local) return set('error', `The prototype site at ${origin} isn’t answering.`)
    if (!fs.existsSync(path.join(siteDir, 'package.json'))) return set('error', 'apps/live-site is missing from the repo.')
    if (!fs.existsSync(path.join(siteDir, 'node_modules', 'next'))) {
      set('installing', 'Installing the site the first time (a few minutes)…')
      await run(['install', '--no-audit', '--no-fund'], 'install')
    }
    set('starting', 'Starting the prototype lane…')
    if (!child || child.exitCode !== null) {
      log(`\n--- ${new Date().toISOString()} start: npm run dev:3001\n`)
      child = spawn(npm, ['run', 'dev:3001'], { cwd: siteDir, env: { ...process.env, PORT: undefined }, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout.on('data', (d) => log(d))
      child.stderr.on('data', (d) => log(d))
      child.on('exit', (code) => {
        log(`\n--- lane exited (${code})\n`)
        child = null
        if (state.status === 'running') set('stopped', 'The prototype lane stopped. It restarts when needed.')
      })
    }
    const until = Date.now() + 180000
    while (Date.now() < until) {
      if (await healthy()) {
        // Warm the first route so the chat's iframe doesn't sit on Next's first compile.
        fetch(origin, { signal: AbortSignal.timeout(120000) }).catch(() => {})
        return set('running', 'Prototype lane is running.')
      }
      if (!child) break
      await new Promise((r) => setTimeout(r, 1500))
    }
    throw new Error('The prototype lane didn’t start. See apps/studio/prototype-lane.log')
  }

  // Safe to call any time: resolves when the lane answers, starts/installs it if needed.
  function ensure() {
    if (state.status === 'running' && child) return Promise.resolve(state)
    if (!pending) {
      pending = start()
        .catch((e) => set('error', e.message))
        .finally(() => (pending = null))
        .then(() => state)
    }
    return pending
  }

  const stop = () => {
    try {
      child?.kill('SIGTERM')
    } catch {}
  }
  process.on('exit', stop)
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => (stop(), process.exit(0)))

  return { ensure, status: () => state, stop }
}
