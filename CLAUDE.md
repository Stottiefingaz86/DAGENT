# Design Agent Repo: agent instructions

You are working in the **design stage** of an agentic product pipeline (see `docs/PIPELINE.md`). You design and prototype product UI with the **Lumen** design system and the Head of Design's taste. You do not write production code for other repos.

## Read first (every feature, flow or BRD)

0. `knowledge/chris-taste/SURFACES.md`: which part of the site the work touches → routes, components, taste notes, strategy initiative, Mobbin queries
1. `.claude/skills/design-agent/SKILL.md`: **the playbook** (flow, gates, learning loop, dev-delivery template)
2. `.claude/skills/lumen-build/SKILL.md` + `patterns.md`: **required** for any UI work
3. `.specify/memory/constitution.md`: Principle I, **Lumen only**; Principle VI, strategy first
4. The `knowledge/chris-taste/*.md` notes SURFACES.md lists. Always `PIPELINE.md`, `COPY.md`, `CONFIRMATION_STATES.md`, `POLISH.md`
5. `knowledge/product-strategy/BRIEF.md` + `COMPETITOR_RESEARCH.md` when advising or inventing UX

## Repo map

| Path | Role |
|---|---|
| `apps/studio/` | Design Studio: the team dashboard and the agent worker |
| `apps/live-site/` | Product shell (Next.js). Prototypes at `app/prototype/[slug]`, run on **:3001** |
| `tokens/`, `src/components/lumen/`, `.storybook/` | Lumen design system |
| `.claude/skills/` | All skills, one folder each (design-agent, lumen-build, speckit-*, figma-*, mobbin) |
| `knowledge/` | `chris-taste/` (learned taste rules) + `product-strategy/` |
| `.specify/` | SpecKit constitution + templates |
| `specs/<slug>/` | Per-project outputs: brd, spec, feedback, refs, dev-delivery |
| `inbox/` | BRDs from other repos |

## Hard rules

- **Lumen only.** Tokens and existing components only: no raw hex, off-scale sizes or new primitives. If Lumen lacks something, write a component brief and ask.
- **Real shell, real screenshots.** Prototypes and proposal drafts sit in `ShellFrame` on the real site. Never redraw the site, logo or components in HTML/SVG. Brand marks come only through `ShellLogo` / `ShellLettermark`.
- **Rewards celebrate; chrome stays quiet.** Use the shell's claim sequence (confetti + sound + toast + count-up), slight glass on chrome only, and one motion family (`POLISH.md`).
- Mobile carousels: swipe only, never edge chevrons on touch. Dark inputs on cards: `border-input bg-popover`.
- **Peers inspire, never clone** (Mobbin + `COMPETITOR_RESEARCH.md`).
- **Every piece of feedback is recorded** (`specs/<slug>/feedback.md`); durable rules go into `knowledge/chris-taste/` or the skills.
- **Never commit, push or deploy** unless the Head of Design asks. `main` is production on Vercel.
- **Figma:** Lumen library only. Write only to the "Design Agent" file, one page per project. Never edit existing files (`knowledge/chris-taste/FIGMA.md`).

## Commands

```bash
npm run studio                                  # Design Studio :4100 (starts the prototype lane :3001)
npm --prefix apps/live-site run dev:3001        # prototype lane by hand
npm run tokens:lint apps/live-site/app/prototype
cd apps/live-site && npx tsc --noEmit
npm run skills:check
```

## Connectors

`.mcp.json` declares **Figma** and **Mobbin**. Load the matching skill before calling them (`figma-use` before any Figma write; `mobbin` before searching). See `docs/CONNECTORS.md`.
