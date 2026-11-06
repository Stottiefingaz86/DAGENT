# Design Agent Repo

**The design stage of our agentic product pipeline.** A BRD goes in. A Claude design agent turns it into a spec, asks the questions only a human can answer, proposes a direction, and builds a working prototype on the real site using only the Lumen design system. The Head of Design gives sign-off. Then one handover package goes to the development repo: spec, every screen and state (happy and unhappy paths), journeys, hover and motion, the prototype and the Figma page. Dev's agent can send questions back, and the design agent answers or escalates.

```
 Product repo ──BRD──▶  DESIGN REPO (this)  ──handover──▶  Dev repo ─▶ Backend & Security ─▶ QA ─▶ Release
                         │
                         ├─ Design Studio      apps/studio      the team's chat-style dashboard + the agent worker
                         ├─ Live site          apps/live-site   the real product shell; prototypes run here (:3001)
                         ├─ Lumen              tokens/ src/     the design system: the only source of colour, type, space, components
                         ├─ Skills             .claude/skills   how the agent works (playbook, build rules, SpecKit, Figma, Mobbin)
                         └─ Knowledge          knowledge/       taste rules learned from feedback + product strategy & research
```

---

## How a BRD flows through

| # | Stage | Who | What happens | Output |
|---|---|---|---|---|
| 1 | **Intake** | Agent | BRD arrives (upload, `inbox/`, or API from the product repo). The agent names the project and maps it to the site surfaces it touches. | `specs/<slug>/brd.md` |
| 2 | **Spec** | Agent | SpecKit spec with strategy alignment (bet · initiative · the needle it moves). | `spec.md` |
| 2b | **Research** | Agent | Research Figma folder (newest files first), strategy, Mobbin, our live site. | sources in the proposal |
| 3 | **Clarify** | Agent → **Human** | Answers everything it can from the code, strategy and research. Asks at most 3 real questions, each with screenshots and a recommended option. | answers in `spec.md` |
| 4 | **Proposal** | Agent → **Head of Design** | Journey, today vs proposed (real screenshots of a draft on the real shell), components reused, Lumen gaps, peer references. **Gate: approve direction.** | proposal card |
| 5 | **Prototype** | Agent | Full working prototype at `/prototype/<slug>`. The agent screenshots desktop and mobile, type-checks, runs the Lumen lint and fixes issues before anyone sees it. | live prototype |
| 6 | **Refine** | Team ↔ Agent | Feedback rounds in the chat. Every comment is logged, and lasting rules are written into `knowledge/chris-taste/`. | `feedback.md` |
| 7 | **Sign-off** | **Head of Design only** | Final sign-off. | — |
| 8 | **Handover** | Agent | One package: screens for every state (logged in/out, skeleton, empty, API failure, image failure), journeys, states matrix, hover/motion/sound, data & errors, tokens, copy, Given/When/Then acceptance, `manifest.json`, the prototype, and the **Figma page** (Lumen instances and icons, component variants, journeys, motion notes). | `handover/` + Figma |
| 9 | **Dev questions** | Dev agent → Agent → *Head of Design* | Dev's SpecKit finds a case: it POSTs the question. Covered → answered with the source. Not covered → escalated as a question card, then the handover is updated. | `decisions.md` |
| — | **Ideas** | Agent → Head of Design | On request: gaps against the strategy and research, each with a mock, scope and business case. Good ones become projects. | Ideas page |

The full contract between this repo and its neighbours is in **[docs/PIPELINE.md](docs/PIPELINE.md)**; the handover and dev-questions API in **[docs/HANDOVER.md](docs/HANDOVER.md)**; components Lumen doesn't have in **[knowledge/lumen/GAPS.md](knowledge/lumen/GAPS.md)**; what's next in **[docs/ROADMAP.md](docs/ROADMAP.md)**. For a presentation version, see **[docs/Design_Agent_Overview.pdf](docs/Design_Agent_Overview.pdf)**.

---

## Quick start (about 5 minutes)

**You need:** macOS or Linux, Node 22+, Google Chrome (used for the agent's screenshots), and an Anthropic API key.

```bash
git clone https://github.com/Stottiefingaz86/DAGENT.git && cd DAGENT
npm --prefix apps/studio install
npm run studio              # → http://localhost:4100
```

On macOS you can instead double-click **`Start Design Studio.command`**.

1. **Create the Owner account.** The first time you open the studio, you set up the Owner. Owners approve directions, give sign-off and add the team in **Settings → People**.
2. **Add your Anthropic API key** in **Settings → API keys**. It stays on that machine and is never committed.
3. **Start a project:** click **New BRD**, then paste a brief or attach a PDF. The studio starts the prototype site by itself; the first start installs it, which takes a few minutes.

More detail is in **[docs/SETUP.md](docs/SETUP.md)**.

---

## What's in the box

| Path | What it is |
|---|---|
| `apps/studio/` | **Design Studio.** A Node server with no framework. It runs the agent through the Claude Agent SDK, offers a chat UI with question, proposal and prototype cards, has sign-in with Owner/Requester roles, and starts the prototype lane itself. |
| `apps/live-site/` | **The product shell** (Next.js 14). Prototypes live at `app/prototype/[slug]`. Deployed to Vercel from `main`. |
| `tokens/`, `src/`, `.storybook/` | **Lumen design system:** token source, components, Storybook. |
| `.claude/skills/` | **26 skills, one source of truth** (catalogue below). |
| `knowledge/chris-taste/` | Taste rules learned from feedback: polish, copy, confirmation states, carousels, auth, shell, Figma, and more. `SURFACES.md` maps every part of the site. |
| `knowledge/product-strategy/` | 2026–2028 strategy, the 50 initiatives, journey audits, competitor research. |
| `.specify/` | SpecKit constitution (I: Lumen only · VI: strategy first) and templates. |
| `specs/<slug>/` | One folder per project: BRD, spec, conversation, feedback, screenshots, handoff. |
| `inbox/` | Drop zone for BRDs from other repos. |
| `docs/` | Pipeline contract, setup, connectors, security. |
| `scripts/` | Token sync, the **Lumen lint**, skills check/sync. |

### Skills

| Skill | Use |
|---|---|
| `design-agent` | **The playbook.** The whole flow above, the gates, the learning loop, and the dev-delivery template. |
| `lumen-build` | Required for any UI work: shell, sub-navs, cards, claims, motion, glass, and the anti-patterns list. |
| `speckit-*` (9) | Specify, clarify, plan, tasks, checklist, analyze, implement, constitution, tasks → issues. |
| `figma-*` (14) | Official Figma MCP skills: design → code, code → design, library, Code Connect, motion. |
| `mobbin` | Production screens from peer products, used for inspiration only, never cloned. |

Run `npm run skills:list` for descriptions and `npm run skills:check` to validate them.

---

## How the agent gets smarter

| Loop | What happens | Where |
|---|---|---|
| **Taste ledger** | Every signal is recorded: 👍/👎 on proposals and prototypes, approvals, change requests, refine feedback, sign-offs. | `knowledge/taste-ledger.jsonl` |
| **Learned rules** | The agent turns signals into **Do** and **Don't** rules, written straight into `knowledge/chris-taste/` and reinforced each time feedback repeats. Rules the Head of Design undoes are never re-learned. | `knowledge/learned-rules.json` · Studio → **Taste** (Keep / Undo) |
| **Every run starts informed** | The agent gets this project's reactions, the strongest rules and the newest learnings before it designs. | automatic |
| **Independent reviewer** | A separate design-reviewer agent with a fresh context checks every proposal and prototype against Lumen, POLISH, copy rules and the learned rules. The agent fixes everything it flags before you see the work. | `apps/studio/lib/claude-runner.mjs` |
| **Lumen watch** | Every 6 hours, and on start, the studio compares Lumen tokens and components with the last snapshot. Changes go into a changelog the agent reads every run, with any prototypes still using removed pieces listed. | `npm run lumen:watch` · `knowledge/lumen/CHANGELOG.md` |
| **Check Lumen in Figma** | An Owner button: the agent compares the Figma Lumen library with the repo (read-only) and lists what needs re-exporting. | Studio → Taste |
| **Tidy taste notes** | An Owner button: the agent merges duplicate rules and resolves conflicts so the knowledge stays sharp. | Studio → Taste |

---

## Guardrails

- **Lumen only.** No raw colours, no off-scale sizes, no invented components. `npm run tokens:lint <dir>` fails on any of them. If Lumen is missing something, the agent writes a component brief instead of improvising.
- **Humans own the gates.** Direction and Final sign-off are Owner-only and enforced by the server, not by the UI.
- **The agent is sandboxed.** It can only read and write non-secret files inside this repo, it runs only a short list of shell commands, and it can't commit, push or deploy.
- **`main` is production.** Vercel deploys `apps/live-site` from `main`. Work happens on branches, and a pull request into `main` is the release.
- **No secrets in git.** API keys, accounts and `.env` files are ignored, and the push script refuses any file containing a key.

See **[docs/SECURITY.md](docs/SECURITY.md)**.

---

## Connectors

| Connector | Why | Where |
|---|---|---|
| **Anthropic API** | Runs the agent | Studio → Settings → API keys |
| **Figma** (MCP) | Build approved screens from Lumen library components | `.mcp.json` · `figma-*` skills |
| **Mobbin** (MCP, paid plan) | Peer flows for research | `.mcp.json` · `mobbin` skill |
| **GitHub** | BRDs in (Action from the product repo), branches and pull requests out | `apps/studio/examples/` |
| **Vercel** | Hosts the live site and a preview per branch | `apps/live-site/vercel.json` |

Setup for each is in **[docs/CONNECTORS.md](docs/CONNECTORS.md)**.

---

## Everyday commands

```bash
npm run studio            # Design Studio on :4100 (starts the prototype lane on :3001 itself)
npm run skills:check      # validate every skill's front matter
npm run lumen:watch       # record any Lumen token/component change in knowledge/lumen/CHANGELOG.md
npm run tokens:sync       # rebuild tokens from the Lumen source
npm run tokens:lint apps/live-site/app/prototype   # the Lumen rule, enforced
npm run storybook         # Lumen components on :6006
npm run verify            # skills + Lumen lint on prototypes + studio syntax
```

---

## Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)**. In short: work on a branch, keep the agent's knowledge in `knowledge/` and `.claude/skills/` (never in prompts), run `npm run verify`, and open a pull request. The Head of Design reviews taste and skills changes.
