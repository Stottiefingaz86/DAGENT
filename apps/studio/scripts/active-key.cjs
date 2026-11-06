// Prints the studio's active Anthropic key (for the one-time Connect Tools session on this machine only).
const fs = require('fs')
const path = require('path')
try {
  const k = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.env.keys'), 'utf8'))
  const a = k.keys.find((x) => x.id === k.active)
  process.stdout.write(a ? a.key : '')
} catch (e) {}
