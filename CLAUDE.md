# BetOnline Design Build — Claude Code / Claude Design

You are working in the **BetOnline agentic design** monorepo. Ship live-site UI to Lumen + Chris taste — not generic AI layouts.

## Read first (every feature / flow / BRD)

0. `.cursor/knowledge/chris-taste/SURFACES.md` — **which part of the site a BRD touches** (any iGaming feature: rewards, account, cashier, casino, sportsbook, poker…) → routes, components, taste notes, strategy initiative, Mobbin queries
1. `.cursor/skills/lumen-build/SKILL.md` — **required** for any live-site work  
2. `.cursor/skills/lumen-build/patterns.md` — nav, cards, inputs, tables, claims, sticky, Figma→code  
3. `.specify/memory/constitution.md` — **Principle I: Lumen Only**  
4. Relevant `.cursor/knowledge/chris-taste/*.md` (AUTH_JOIN, COPY, DAILY_SPIN, LIVE_WINS, PIPELINE, DESIGN_AGENT_APP, …)  
5. `.cursor/knowledge/product-strategy/BRIEF.md` + `COMPETITOR_RESEARCH.md` when advising or inventing UX  

Also mirrored under `.claude/skills/project/` for Claude discovery.

## What this repo is

| Path | Role |
|------|------|
| `apps/live-site/` | Next.js BetOnline **live-site shell** (product UI to extend) |
| `src/components/lumen/` + `tokens/` + `.storybook/` | **Lumen design system** + Storybook |
| `.cursor/skills/` | SpecKit + lumen-build |
| `.cursor/knowledge/` | Chris taste + product strategy + competitor research |
| `.cursor/rules/` | Always-on rules (Lumen, build stack, strategy) |
| `.specify/` | SpecKit constitution / templates |
| `docs/Design_Agent_North_Star_Process.pdf` | Design Agent north-star process |
| `.claude/skills/figma-plugin/` | Figma MCP skills (design↔code, generate, library) |
| `.claude/skills/mobbin/` | **Mobbin** competitor-screen skill |
| `.claude/mcp/mobbin/` | Official Mobbin MCP config (`api.mobbin.com/mcp`) |

## North-star Design Agent flow

```
Product BRD → load skills + Mobbin + strategy
  → agent builds journey + prototype (:3001)
  → HUMAN #1 direction feedback
  → agent revises
  → HUMAN #2 refine (motion / sound / tokens)
  → learn into chris-taste
  → HUMAN #3 Final sign-off (Chris)
  → package for Dev (+ optional Figma)
```

Desk UI (when running live-site): `/designagent`.

## Hard product rules (summary)

- **Lumen only** — tokens/components; no raw hex / parallel primitives  
- **ShellFrame** + `#shell-scroll`; soft-nav + skeletons  
- Dark inputs on cards: `border-input bg-popover`  
- Mobile carousels: **swipe only** — never edge chevrons on touch  
- Auth: see `AUTH_JOIN.md` — Email → Password → Verify → welcome  
- Competitor patterns: **Mobbin + research** → translate to Lumen, **never clone**  
- Do **not** commit unless asked; deploy live-site with Vercel when asked  

## Commands

```bash
# Design system / Storybook (repo root)
npm install
npm run storybook

# Live site
cd apps/live-site && npm install
npm run dev          # demo :3000
npm run dev:3001     # prototype lane
```

## MCP (required for full power)

See `docs/CLAUDE_MCP_SETUP.md` and `.mcp.json.example`.

| MCP | Endpoint | Skills / config in this pack |
|-----|----------|------------------------------|
| **Mobbin** | `https://api.mobbin.com/mcp` | `.claude/skills/mobbin/` + `.claude/mcp/mobbin/` + rule `mobbin-usage.mdc` |
| **Figma** | Figma official MCP | `.claude/skills/figma-plugin/` |

**Mobbin first** for peer flows (Rainbet join, Winna rewards, live wins). Load `.claude/skills/mobbin/SKILL.md` before searching. Paid Mobbin plan required; else use `COMPETITOR_RESEARCH.md` + `competitors/`.

Load Figma skills from `.claude/skills/figma-plugin/` before Figma tool calls (especially `figma-design-to-code`, `figma-use`, `figma-generate-design`).

## SpecKit

Use `.cursor/skills/speckit-*` for BRD → plan → tasks. Specs live under `specs/`.

## Do not ship

- Secrets (`.env` is excluded from this handoff — copy from `.env.example`)  
- Unmerged prototypes onto demo `:3000` until Chris says **Merge**  
- Peer brand clones (Rainbet/Winna art, gems, purple chrome)  
