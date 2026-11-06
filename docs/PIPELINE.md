# Pipeline contract

This repo is one stage of an agentic product pipeline. Each repo owns one job and talks to its neighbours through **files in git**: agents and humans can read them, review them and version them.

```
┌────────────┐  BRD   ┌──────────────┐ dev-delivery ┌──────────┐      ┌──────────────────┐      ┌──────┐      ┌─────────┐
│  Product   │ ─────▶ │    Design    │ ───────────▶ │   Dev    │ ───▶ │ Backend/Security │ ───▶ │  QA  │ ───▶ │ Release │
│  (BRD/PRD) │        │  (this repo) │              │  (UI)    │      │ (APIs, review)   │      │      │      │         │
└────────────┘        └──────────────┘              └──────────┘      └──────────────────┘      └──────┘      └─────────┘
       ▲                      ▲                           │                                         │
       └──── questions ───────┘◀──── design questions ────┘◀──────────── design defects ──────────────┘
```

## 1. Inbound: BRD → Design

**Format:** Markdown (preferred), PDF or plain text. Front matter is optional but recommended:

```markdown
---
title: VIP cashback            # short project name
surface: Rewards               # Rewards · Casino · Sports · Cashier · Account · Promotions · Poker · Marketing · Other
source: product-repo           # where it came from (shown in the studio)
id: PRD-142                    # the product repo's own id, echoed back in every output
---
# Problem, goal, success metric, scope, constraints …
```

**Three ways in:**

| Route | How | Best for |
|---|---|---|
| Git (recommended) | The product repo's GitHub Action copies `brds/*.md` into this repo's `inbox/` ([example](../apps/studio/examples/send-brd-to-design-repo.yml)). | Automated pipeline |
| API | `POST /api/intake` with `Authorization: Bearer $STUDIO_INTAKE_TOKEN` and `{title, surface, brief, source, files:[{name,data(base64)}]}` | Other agents and services |
| Studio | **New BRD**: paste text or attach a PDF/screenshot | Humans |

**The design agent guarantees:**
- it maps the BRD to `knowledge/chris-taste/SURFACES.md` and the 2026–2028 strategy before designing
- it asks only questions it can't answer from the sources, at most 3 at a time, each with screenshots and a recommendation
- it never uses anything outside Lumen. Missing pieces become component briefs, not one-offs.

## 2. Outbound: Design → Dev

At **Final sign-off** the agent builds ONE handover package in `specs/<slug>/handover/`: the mocks (every screen and state, logged in/out, 1440 + 390), the prototype, the Figma page, journeys (happy + unhappy paths), a states matrix, hover/focus/motion/sound, data and error handling, `dev-delivery.md` with tokens, copy and Given/When/Then acceptance, and `manifest.json` for agents.

Dev downloads it from the studio (`/api/jobs/<slug>/handover.tar.gz`) or reads it from this repo. When dev's agent finds a case nobody designed, it POSTs to `/api/jobs/<slug>/dev-questions`: the design agent answers what the handover covers and escalates real design decisions to the Head of Design. Full detail: [HANDOVER.md](HANDOVER.md).

## 3. Feedback loops

| From | To | How |
|---|---|---|
| Dev | Design | Questions about the handoff → studio message on the project (or `inbox/` with `source: dev-repo`) |
| QA | Design | Visual or UX defects → a new BRD in `inbox/` referencing the project slug and the failed acceptance criterion |
| Release | Design | Shipped → the project moves to done; the surface row in `SURFACES.md` is updated |

## 4. Repo boundaries

- **Design owns:** UX, UI, copy, motion, tokens, the prototype, the acceptance criteria for look and feel.
- **Design does not own:** production code, APIs, data contracts, security review. Those belong to Dev, Backend and Security.
- **Design never** deploys production code into the product. `apps/live-site` is the design team's product shell and prototype host.
