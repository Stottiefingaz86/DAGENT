// Server only: create the first Owner account from the command line (the setup screen only works on the
// computer running the studio, and a server has no screen).
//   docker compose exec studio node apps/studio/scripts/create-owner.mjs --name "CH" --username ch
// It asks for the password (not shown). Restart the studio afterwards so it loads the new account.
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { createAuth } from '../lib/auth.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : ''
}
const ask = (q, hidden) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : '')
    rl.question(q, (a) => (rl.close(), hidden && process.stdout.write('\n'), resolve(a)))
  })

const auth = createAuth(path.join(here, '..'))
if (!auth.needsSetup()) {
  console.log('An Owner already exists. Invite people from Settings → People instead.')
  process.exit(1)
}
const name = arg('name') || (await ask('Name shown in the studio: '))
const username = arg('username') || (await ask('Username or email: '))
const password = process.env.STUDIO_OWNER_PASSWORD || (await ask('Password (10+ characters, not shown): ', true))
try {
  auth.setup({ setHeader() {} }, { name, username, password })
  console.log(`Owner "${name}" created. Restart the studio (docker compose restart studio), then sign in.`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
