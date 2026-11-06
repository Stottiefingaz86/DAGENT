# SpecKit → Design → Dev — one flow (HARD RULE)

**Source:** Chris, Oct 2026.

Outside repos and agents use **the same SpecKit flow**. There is not a parallel “design-only” process. Design Agent owns the middle of the pipe; we do **not** own production engineering.

## The pipe

```
BRD (SpecKit specify)
  → Design Agent mock / refine (this desk + preview URL)
  → Chris sign-off
  → Dev delivery handoff
  → Dev agents implement
```

1. **SpecKit / BRD** — Spec is created with SpecKit (`specify` → plan/tasks as needed). Intake may be another agent, another repo, or upload into `/designagent`. Same `specs/<slug>/` artifact shape.
2. **Design** — Our job only: make the experience **perfect** before handoff.
   - Lumen tokens + Storybook/approved components (constitution Principle I) — Storybook stays the component gate; desk links it under Site
   - Chris taste (shell, cards, claims, carousels, copy, confirmation states, Daily Spin, etc.)
   - Correct motion / animations
   - Unique pre-prod / preview URL for refine (`:3001/prototype/<slug>` — **not** demo `:3000`; see `PROTOTYPE_LANE.md`)
   - **Refine loop on the desk:** Requester pastes/attaches screenshots + issue notes in chat → logged on the job → iterate until **Request Chris sign-off**
3. **Dev delivery** — Only after **Chris Final sign-off**, package what the requester / dev agents need (spec, screens, component/token map, **hover/motion/transitions**, **prototype URL**, acceptance). Then **hand off**. Chris can **Back to refine** anytime before Merge. We do not stay as the implementers of production code unless Chris explicitly says so.

## Roles

| Who | Owns |
| --- | --- |
| SpecKit + any intake agent | BRD / spec artifacts |
| **Design Agent (us)** | Mock, refine, Lumen correctness, animations, preview |
| Chris | Taste sign-off on the desk |
| Dev agents | Production implementation from **dev delivery** |

## Desk visibility

Every stage of this one flow is visible on `/designagent`: initiative, inbox questions, chat, screens, preview, and eventually the **dev delivery** artifact. External agents posting into the pipe must land on the same job — you always see it here.

## Anti-patterns

- Separate “non-SpecKit” design track for outside agents
- Design Agent building production features past handoff
- Handoff without Lumen/token/component map or preview URL
- Fake “live” before dev has shipped from the delivery package

## Suggest before building (HARD — Chris, Nov 2026)

Supersedes "prefer build → refine" for new BRDs. After intake the Design Agent runs SpecKit clarify, answers what it can from the BRD + existing site, checks Mobbin, then posts a **proposal** (journey, Lumen components/tokens it will reuse, gaps, open questions, peer refs). Chris approves direction **before** any prototype is built. Small refine fixes on an approved prototype don't need a proposal.

## Feedback is always recorded (HARD — Chris, Nov 2026)

Every piece of Chris feedback on a design is logged on the job (`specs/<slug>/feedback.md`) and, when durable, written into the matching chris-taste note or `lumen-build` anti-patterns in the same turn. The agent says in its reply what it recorded and where.

## Dev handoff is for a repo we don't control (Nov 2026)

`dev-delivery.md` must stand on its own: dev agents can't read our skills or chris-taste. Inline token names + resolved values, component source paths, motion specs (duration/easing/trigger), states, copy strings, acceptance criteria, prototype URL.

## No prototype in the chat without a screenshot (HARD — Chris, Nov 2026)

**Source:** Chris, Nov 2026 (job `screenshot-1793961160095-0`). Quote: “prototype not building in the chat”. The agent submitted while the `:3001` lane was down.

- **Do:** before `submit_prototype`, get `capture_site` screenshots of `/prototype/<slug>` at desktop **and** mobile. Read them, fix what's wrong, and attach them to the submit.
- **Do:** if `capture_site` says the lane isn't running and the studio can't start it, **stop**. Call `ask_questions` asking for **Start Prototype Lane.command** to be run (name the exact URL), and end the turn.
- **Don't:** submit a prototype with "not verified visually" in the summary. An unverified prototype is not ready for the chat.

## Agent questions must be real (HARD — Chris, Nov 2026)

Rejected: generic, hard-coded questions ("Where should this live first?", "Is there a launch date?"). The agent infers placement, components and states from SURFACES.md + the code and states its decision. It only asks about a specific gap or conflict it found, cites the source, says what changes per answer, and gives concrete options with a recommendation. Max 3. Demo mode must label its placeholder questions as demo.

## Unhappy paths are part of the design (Chris, Nov 2026: "don't only create screens for happy paths")
- **Do:** every proposal, prototype and Figma build covers the full state set, not just the happy path: logged in, logged out, loading skeleton (shaped like the real content), empty, partial data, image/asset failure, **failed API call / server error with a retry**, single-item and overflow cases, and mobile for each where layout differs.
- **Don't:** ship a Figma page or prototype that shows only the default state. If the BRD doesn't say what happens on failure, decide it on-system (Lumen error/empty patterns, plain copy, a retry) and list it as a decision in the spec.

## Handover = one package (Chris, Nov 2026)
- Mocks + prototype + Figma + spec + handover docs, with journeys for happy AND unhappy paths, hover states and motion. One archive the dev agent can build from.
- Dev questions come back through the studio; answer from the handover, escalate only real design decisions.
- Research comes from the research Figma folder first (it is always being updated), then strategy, then Mobbin.
- Recommend ideas that move the strategy: gap + evidence + mock + scope + business case.
