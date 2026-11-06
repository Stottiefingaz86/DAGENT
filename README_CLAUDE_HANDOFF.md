# BetOnline → Claude handoff pack

Drop this folder into Claude Code / Claude Design as the project root (or open it as the workspace).

## What’s inside

| Item | Purpose |
|------|---------|
| `CLAUDE.md` | **Start here** — Claude’s operating instructions |
| `docs/CLAUDE_MCP_SETUP.md` | Figma + Mobbin MCP setup |
| `docs/Design_Agent_North_Star_Process.pdf` | Process north star (intake → humans → Dev) |
| `apps/live-site/` | Full BetOnline live-site (Next.js) |
| `src/` + `tokens/` + `.storybook/` | Lumen design system |
| `.cursor/skills|rules|knowledge` | SpecKit, lumen-build, chris-taste, strategy |
| `.claude/skills/project/` | Same project skills for Claude discovery |
| `.claude/skills/figma-plugin/` | Full Figma MCP skill pack |
| `.claude/skills/mobbin/` + `.claude/mcp/mobbin/` | **Mobbin** skill + official MCP config (`api.mobbin.com/mcp`) |
| `.specify/` + `specs/` | SpecKit templates + existing specs |

**Excluded:** `node_modules`, `.next`, `.git`, `.env` / secrets, Vercel link cache.

## Quick start

```bash
# 1. Unzip / open this folder in Claude Code

# 2. Live site
cd apps/live-site
npm install
npm run dev          # http://localhost:3000

# 3. Storybook (repo root)
cd ../..
npm install
npm run storybook
```

## Wire MCPs

Follow `docs/CLAUDE_MCP_SETUP.md` for **Figma** and **Mobbin** before asking Claude to invent competitor-like flows or sync Figma.

## What to tell Claude

> Follow `CLAUDE.md`. For any live-site feature, load `lumen-build` first. Use Mobbin for peers; Lumen only; never clone Rainbet/Winna.

## Gaps vs Cursor (known)

- Mobbin requires a paid plan or peer research falls back to markdown/screenshots.  
- Figma auth must be completed in Claude’s MCP UI.  
- Cursor cloud desk kicks are Cursor-specific; Claude can still build prototypes locally and follow the same Design Agent process.  
