# Handover: design → dev

After the Head of Design gives **Final sign-off**, the design agent writes one package a dev agent can build from without coming back to design.

## What's in it

`specs/<slug>/handover/`

| File | What it holds |
|---|---|
| `README.md` | Start here. Links to everything, prototype route + source path, Figma page, how to ask design |
| `manifest.json` | The same, machine-readable: spec, prototype, Figma frames, screens, journeys, states, tokens, components, gaps, acceptance |
| `screens/` | Every screen × state × width (1440, 390), logged in and logged out, captured from the prototype |
| `journeys.md` | Happy path step by step, then every unhappy branch: logged out, loading, empty, API failure + retry, image failure, partial failure, timeout |
| `states.md` | Component/section × state (default, hover, pressed, focus, disabled, loading, empty, error, logged out) × breakpoint |
| `interactions.md` | Hover/focus/pressed, motion table (trigger, property, duration, easing, token), sound, celebration, keyboard, screen reader |
| `data-and-errors.md` | Each API/data dependency, its failure UI, retry rules, skeleton timing, analytics events |
| `dev-delivery.md` | Tokens (resolved), component paths, every copy string, acceptance criteria (Given/When/Then, happy + unhappy) |
| `decisions.md` | Every question dev asked later, the answer, who decided |

Plus, next to it: `spec.md` (SpecKit spec), the prototype source `apps/live-site/app/prototype/<slug>/`, and the **Figma page** in the Design Agent file (Lumen instances, all states, journeys, motion notes).

## How dev gets it

All endpoints take `Authorization: Bearer $STUDIO_INTAKE_TOKEN` (the same token as BRD intake).

```bash
# What's there
curl -H "Authorization: Bearer $TOKEN" https://<studio>/api/jobs/<slug>/handover
# Everything in one archive (handover + spec + prototype source)
curl -H "Authorization: Bearer $TOKEN" -o handover.tar.gz https://<studio>/api/jobs/<slug>/handover.tar.gz
```

Or read `specs/<slug>/handover/` straight from this repo (read-only for dev).

## When dev has questions

Dev's own agent (SpecKit `clarify` in the dev repo) will find cases. Don't email design — send them:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  https://<studio>/api/jobs/<slug>/dev-questions \
  -d '{"from":"web-dev-repo","questions":[{"text":"What happens if the race API returns an empty leaderboard?","context":"spec FR-012"}]}'

# Poll for answers
curl -H "Authorization: Bearer $TOKEN" https://<studio>/api/jobs/<slug>/dev-questions
```

What happens:
1. The design agent checks the handover, spec, prototype and taste notes.
2. **Covered** → it answers with the source (file:line or Figma frame) and fixes the handover if it was unclear. Status `answered`.
3. **Not covered** (a real design decision) → status `needs_design` with the agent's recommendation; the Head of Design gets a question card in the studio. Once answered, the agent updates the prototype, the handover and Figma, and the dev question flips to `answered`.
4. Everything lands in `handover/decisions.md`, and durable answers become taste rules so the next handover covers them up front.

Tip for dev repos: add one line to your SpecKit `clarify` step — "For UX/design questions, POST to the design studio's dev-questions endpoint and wait for the answer instead of guessing."

## Components Lumen doesn't have

See `knowledge/lumen/GAPS.md`. The handover lists them under `gaps` with code in `apps/live-site/components/proposed/`. Build them as local components; the design-system team promotes them into Lumen.
