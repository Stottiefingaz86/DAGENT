# MCP setup for Claude Code / Claude Design

Connect these MCPs so the agent can match Cursor’s Figma + Mobbin workflow.

## 1. Figma MCP (required for design ↔ code)

**What it unlocks**

- Read Figma frames → implement in `apps/live-site` with Lumen tokens  
- Push approved prototypes → Figma (post sign-off)  
- Design system / Code Connect workflows  

**Skills in this pack** (read before tool calls):

`.claude/skills/figma-plugin/`

| Skill | When |
|-------|------|
| `figma-design-to-code` | **Mandatory** before `get_design_context` |
| `figma-use` | **Mandatory** before `use_figma` writes |
| `figma-generate-design` | Code / page → Figma |
| `figma-generate-library` | Tokens / components → Figma library |
| `figma-code-connect` | Map Figma ↔ code |
| Others | Motion, FigJam, Slides, shaders as needed |

**Claude Code**

1. Install / enable the official **Figma MCP** server (Claude Desktop or Claude Code MCP config).  
2. Authenticate with a Figma account that can access the **Lumen** library + BetOnline files.  
3. Point the agent at this repo; tell it to follow `CLAUDE.md` + Figma skills above.  

Example MCP snippet (adjust to your Claude MCP config format):

```json
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp",
      "note": "Use official Figma MCP; auth via Figma OAuth / token as documented by Figma + Claude"
    }
  }
}
```

Exact URL/auth may differ by Figma’s current Claude integration — use Figma’s latest MCP docs.

**Workflow reminder**

1. `create_session` with fileKey  
2. Design → code: load `figma-design-to-code` → `get_design_context` + screenshot → rebuild with shell/Lumen (never paste MCP temp asset URLs)  
3. Code → Figma: load `figma-generate-design` → `search_design_system` → `use_figma`  

## 2. Mobbin MCP (competitor screens) — INCLUDED IN THIS PACK

**What it unlocks**

- Real production screens for peers (Rainbet join, Winna rewards, casino lobby, etc.)  
- Required by `lumen-build` before inventing peer-like flows  

**Files in this handoff**

| Path | What |
|------|------|
| `.claude/skills/mobbin/SKILL.md` | When/how to search; BetOnline translation rules |
| `.claude/mcp/mobbin/mcp.json` | Official server: `https://api.mobbin.com/mcp` |
| `.claude/mcp/mobbin/server.json` | MCP server metadata |
| `.claude/mcp/mobbin/README.md` | Mobbin MCP readme |
| `.claude/rules/mobbin-usage.mdc` | Always-on: use Mobbin for UI/UX pattern questions |
| `.mcp.json.example` | Ready-to-copy Claude MCP entry |

**Plan:** Mobbin MCP needs a **paid Mobbin plan**. Without it, searches fail — fall back to:

- `.cursor/knowledge/product-strategy/COMPETITOR_RESEARCH.md`  
- `.cursor/knowledge/product-strategy/competitors/` screenshots  

**Claude Code — add this MCP**

```json
{
  "mcpServers": {
    "mobbin": {
      "url": "https://api.mobbin.com/mcp"
    }
  }
}
```

Transport: Streamable HTTP. Auth / setup: https://docs.mobbin.com/mcp and https://mobbin.com/mcp  

Then tell Claude: *Follow `.claude/skills/mobbin/SKILL.md` before inventing peer UX.*

## 3. Optional: browser / deploy

- Local preview: `apps/live-site` on `:3000` (demo) and `:3001` (prototype lane)  
- Deploy: from `apps/live-site`, `npx vercel --prod` (project `design-request-app` → `design-request-app-one.vercel.app`) when Chris asks  

## 4. Env files

This handoff **excludes** `.env` / `.env.local`. Copy:

- Root: `.env.example` → `.env` (if using Astro/studio tooling)  
- `apps/live-site/.env.example` if present → `.env.local`  

Do not commit secrets into Claude projects or zips.

## 5. Quick verify

After MCP connect, ask Claude:

1. “Read `CLAUDE.md` and summarize the build stack.”  
2. “Search Mobbin for crypto casino signup (web).”  
3. “List Figma skills under `.claude/skills/figma-plugin`.”  
