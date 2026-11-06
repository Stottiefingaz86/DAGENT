# Security

## Access
- Everyone signs in. Passwords are hashed with scrypt; sessions are random tokens in HttpOnly, SameSite=Strict cookies, and only their hashes are stored. Eight failed sign-ins from one address lock it out for 15 minutes.
- Roles come from the account, never from the browser. **Owner-only:** approve direction, Final sign-off, delete projects, manage people and API keys.
- By default the studio listens on `127.0.0.1` only. Opening it to a network requires `STUDIO_HOST=0.0.0.0`, and should go behind https with `STUDIO_SECURE_COOKIE=1`.
- Cross-site requests are refused. `/api/intake` needs a bearer token unless the request comes from the same machine.

## The agent
A BRD is untrusted input: it could contain instructions aimed at the agent. The worker limits what the agent can do whatever it is told:
- **Files:** read and write only inside this repo, and never `.env*`, studio account files, `.git/`, SSH or cloud credentials, or the studio's own code.
- **Shell:** an allow-list (token lint, type-check, `ls`/`cat`/`head`/`wc`), one command at a time, no chaining, redirects or absolute paths.
- **Never:** `git commit/push/reset/checkout/rebase`, deploys, `rm -rf`, publishing.
- **Design guard:** hand-drawn boards and copied brand marks are refused at the tool level.

## Secrets
| Secret | Where it lives | In git? |
|---|---|---|
| Anthropic API keys | `apps/studio/.env.keys` (mode 600) | Never |
| Studio accounts and sessions | `apps/studio/.studio-*.json` (mode 600) | Never |
| Live-site service keys | Vercel environment variables | Never |
| Intake token | `apps/studio/.env` | Never |

`Push to GitHub.command` refuses to push any file that contains an Anthropic key. If a key leaks, revoke it at console.anthropic.com and add a new one in the studio.

## Data
The repo holds internal strategy, research and BRDs. **Keep the repository private** and share it through the organisation's GitHub with named access. Deleted projects move to `.studio-trash/`, which git ignores.

## Reporting
Report security issues privately to the Head of Design, not in public issues.
