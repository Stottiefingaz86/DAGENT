// Server only (AWS): the agent writes prototypes, specs and taste notes into the server's copy of the repo.
// Every STUDIO_GIT_SYNC_MINUTES this commits them and pushes to one branch (default "studio-work"), never main,
// never with force. The team merges studio-work → main with a pull request. Secrets are git-ignored, and a
// last check refuses to commit anything that looks like an API key.
import { execFile } from 'node:child_process'

const git = (cwd, args) =>
  new Promise((resolve) =>
    execFile('git', args, { cwd, timeout: 180000, maxBuffer: 64 << 20, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, out, errOut) =>
      resolve({ ok: !err, out: String(out || ''), err: String(errOut || err?.message || '') })
    )
  )
const SECRET = /(sk-ant-[A-Za-z0-9_-]{20,}|figd_[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,})/

export function startGitSync({ repoRoot, minutes, branch, log }) {
  const name = process.env.STUDIO_GIT_NAME || 'Design Studio'
  const email = process.env.STUDIO_GIT_EMAIL || 'design-studio@users.noreply.github.com'
  let busy = false
  let last = { at: null, ok: null, message: 'Not synced yet.' }

  async function sync() {
    if (busy) return last
    busy = true
    try {
      const st = await git(repoRoot, ['status', '--porcelain'])
      if (st.ok && st.out.trim()) {
        await git(repoRoot, ['add', '-A'])
        const diff = await git(repoRoot, ['diff', '--cached'])
        if (SECRET.test(diff.out)) {
          await git(repoRoot, ['reset', '-q'])
          last = { at: new Date().toISOString(), ok: false, message: 'Stopped: a changed file contains what looks like an API key. Nothing was committed.' }
          return log(`git sync: ${last.message}`), last
        }
        const c = await git(repoRoot, ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `Design Studio sync ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`])
        if (!c.ok) log(`git sync: commit failed: ${c.err.split('\n')[0]}`)
      }
      const p = await git(repoRoot, ['push', '-q', 'origin', `HEAD:refs/heads/${branch}`])
      last = { at: new Date().toISOString(), ok: p.ok, message: p.ok ? `Pushed to ${branch}.` : `Push refused (nothing was overwritten): ${p.err.split('\n').find(Boolean) || 'unknown error'}` }
      if (!p.ok) log(`git sync: ${last.message}`)
      return last
    } finally {
      busy = false
    }
  }
  setTimeout(sync, 60e3).unref()
  setInterval(sync, Math.max(5, minutes) * 60e3).unref()
  return { sync, status: () => last }
}
