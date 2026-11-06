# Design Studio

The place designers come to. BRDs land here, the design agent works them through SpecKit, asks questions when it needs a human, shows its proposal and prototype, takes feedback and learns from it, and packages a dev handoff after Chris signs off.

```
BRD (PDF upload · inbox/ folder · API)
   → Design agent (Claude, runs in this worker)
        reads: SKILL playbook · SURFACES.md · Lumen · strategy · research · chris-taste
        Intake → Spec → Clarify ──► questions for you (chime + Inbox)
        → Research → Proposal ──► Chris: approve direction / request changes
        → Prototype → Refine ──► feedback rounds (logged + learned)
        → Sign-off (Chris only) → Handoff (dev-delivery.md)
```

Everything is written into the design repo under `specs/<slug>/`, so it is versioned with git and readable by any agent:

| File | What |
|---|---|
| `job.json` | status, stage, questions, gates — what the dashboard shows |
| `events.jsonl` | the whole back-and-forth with the agent |
| `brd.md` / `brd.pdf` | the BRD as it arrived |
| `spec.md` | SpecKit spec with Strategy alignment |
| `refs/*.png` | real screenshots of today's site and the prototype (questions, proposal, QA) |
| `feedback.md` + `feedback/` | every feedback round verbatim + screenshots |
| `dev-delivery.md` | the handoff for the dev repo |

Durable feedback goes further: the agent writes it into `knowledge/chris-taste/` or the skills, and the Feedback tab lists what it learned.

## What you need

1. **Node 20 or newer.** Check with `node -v`. Install from nodejs.org if needed.
2. **An Anthropic API key** for the real agent: console.anthropic.com → Settings → API keys. This is separate from a Claude.ai plan and is billed per use; the dashboard shows the cost per initiative. There is no demo mode: until a key is connected, the studio shows a Connect screen and runs nothing.
3. **The live site installed** for prototypes: `cd apps/live-site && npm install` once.

## Run it

From the repo root (`design-agent`):

```bash
cd apps/studio
npm install                # first time only
npm start                  # → http://localhost:4100, paste your key on the Connect screen
```

In a second terminal, for prototype previews:

```bash
cd apps/live-site
npm run dev:3001           # prototype lane → http://127.0.0.1:3001/prototype/<slug>
```

Or just double-click **Start Design Studio.command** in the repo root.

## Getting a BRD in

- **Dashboard:** the pink **+** on Overview. Paste text or drop a PDF / markdown / screenshots.
- **Inbox folder:** drop a `.md`, `.txt` or `.pdf` into `inbox/` at the repo root. Another repo can commit there: `examples/send-brd-to-design-repo.yml` is a GitHub Action for the product repo that does it. Optional front matter in markdown: `title`, `surface`, `source`.
- **API:** `POST http://localhost:4100/api/intake` with JSON `{ "title", "brief", "surface", "source" }`. Set `STUDIO_INTAKE_TOKEN` in `.env` to require `Authorization: Bearer <token>`.

## The human steps

| When | Who | Where |
|---|---|---|
| The agent has questions | anyone | answer in the chat panel |
| Proposal is ready | Chris (Owner) | **Approve direction** or **Request changes** |
| Prototype is ready | anyone | feedback + pasted screenshots in chat; each send is a logged round |
| Ready for sign-off | designers | **Request sign-off** |
| Final sign-off | Chris only | **Final sign-off** → agent writes the handoff |

Set your role and name under **Account**, and turn on desktop notifications there. You also get a chime and a toast in the tab whenever something needs a human, and the **Inbox** badge counts what is waiting on you.

The role switch is a local convenience for now; there is no login. Run the studio on your machine or a trusted network until Admin / Members exist.

## What the agent may and may not do

- Read anything in the repo; write files in the repo (specs, prototype code in `apps/live-site`, taste notes).
- Shell: only read-only commands and `npm run tokens:lint` / `tokens:sync`.
- Never: git commit / push, deploy, delete with `rm -rf`, or write outside the repo.

Change these rules in `lib/claude-runner.mjs`.

## Mobbin and Figma in the worker

The worker uses the MCP servers in the repo's `.mcp.json` (copy `.mcp.json.example`). Mobbin needs a paid plan and its sign-in must work without a browser for a background worker. If either isn't available, the agent says so once and uses `COMPETITOR_RESEARCH.md` + the `competitors/` screenshots.

## Coming from Cursor

| Cursor | Claude |
|---|---|
| Cursor agent chat | **Claude Code** in a terminal (`npm i -g @anthropic-ai/claude-code`, then `claude` in the repo) — or the Claude app |
| `.cursor/rules/*.mdc` | `CLAUDE.md` at the repo root (it points at the same rules) |
| `.claude/skills/*` | `.claude/skills/<name>/SKILL.md` — Claude Code finds these automatically |
| Cursor MCP settings | `.mcp.json` at the repo root |
| Cursor cloud agent (`@cursor/sdk`) | **Claude Agent SDK** — this worker (`lib/claude-runner.mjs`) |
| `CURSOR_API_KEY` | `ANTHROPIC_API_KEY` |

## Troubleshooting

- **Agent error on start:** check the key in `apps/studio/.env` (or paste it again on the home screen), then **Retry** on the project.
- **Preview is blank on a prototype:** the prototype lane isn't running (`npm run dev:3001` in `apps/live-site`).
- **Port in use:** set `STUDIO_PORT=4200` in `.env`.
- A restart is safe: jobs live on disk, and any run that was in progress comes back as "Waiting for you" with a Retry.

## Security
- **Sign-in.** The first time you open the studio on this computer you create the Owner account. Owners add people in Settings (Owner or Requester). Roles come from the login, never from the browser. Passwords are scrypt-hashed in `.studio-users.json`; sessions are HttpOnly, SameSite=Strict cookies (only token hashes stored). 8 wrong passwords per IP locks sign-in for 15 minutes.
- **Who can reach it.** Only this computer by default (`STUDIO_HOST=127.0.0.1`). Open it to the network with `STUDIO_HOST=0.0.0.0` — put it behind https and set `STUDIO_SECURE_COOKIE=1` if it leaves your LAN.
- **Owner-only:** approve direction, Final sign-off, delete projects, manage people, API keys (keys also only from this computer).
- **BRD intake API** needs `STUDIO_INTAKE_TOKEN` for anything not on this computer. Cross-site requests are refused.
- **The agent** can only read and write non-secret files inside the repo (no `.env*`, keys, user files, `.git`, or the studio's own code), runs only a short list of shell commands one at a time, and can't commit, push or deploy. That stops a malicious BRD from tricking it into leaking keys.
- **Deleting a project** stops its agent and moves `specs/<slug>/` to `.studio-trash/` (git-ignored) so it can be recovered.
- Never committed: `.env`, `.env.keys`, `.studio-users.json`, `.studio-sessions.json`, `.studio-trash/`, `prototype-lane.log`.
