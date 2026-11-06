---
name: mobbin
description: >-
  Search Mobbin for real production UI/UX screens and flows (web + iOS).
  REQUIRED before inventing peer-like journeys (join/signup like
  Rainbet, rewards chrome, live wins, cashier, lobby). Use with
  lumen-build + COMPETITOR_RESEARCH — inspire, never clone.
---

# Mobbin — competitor & production UI references

**Always use** when designing or advising on flows peers already ship (join, verify, deposit, rewards claim, lobby activity, onboarding). Guessing peer UX from memory is worse than looking.

MCP server: `https://api.mobbin.com/mcp` (Streamable HTTP). Config copy: `.claude/mcp/mobbin/mcp.json`. Docs: https://docs.mobbin.com/mcp

**Paid Mobbin plan required.** If the MCP returns a plan/auth error: say so once, then fall back to `.cursor/knowledge/product-strategy/COMPETITOR_RESEARCH.md` + `competitors/` screenshots. Do not invent fake peer UI.

## Tools (typical)

| Tool | Use |
|------|-----|
| `search_screens` | Find screens by natural language |
| `search_flows` | Multi-step flows (signup, checkout, …) |
| `search_sections` | Section-level patterns |
| `list_collections` / `get_collection_contents` | Saved collections |
| `save_content` / `add_comment` | Optional library notes |

Prefer **web** for casino/betting peers; **ios** when mobile chrome matters.

## How

1. Query like a screen: `"crypto casino signup"`, `"Rainbet signup"`, `"gambling app rewards claim dropdown"`, `"casino live wins activity carousel"`.
2. **Read the returned images** — do not decide from metadata alone.
3. Cite Mobbin URLs when discussing options with Chris.
4. Cross-check Chris-liked notes in `COMPETITOR_RESEARCH.md` + local `competitors/`.
5. **Translate into Lumen + our shell** — AuthModal, VIP/claims, cashier, tokens. Inspiration only — **never clone** peer brand, gems, purple chrome, or copy.

## When to call (with lumen-build)

- New/reworked join, login, verify, OTP/SMS  
- Rewards-in-chrome, claim popovers, Bonus Center–style hubs  
- Live Wins / activity carousels, lobby discovery  
- Cashier / deposit trust patterns  
- Chris says “like Rainbet / Winna / Stake…”

## Example

Rainbet-style short join → Mobbin signup/verify screens → BOL AuthModal Email → Password → Verify in Lumen frost — **not** a Rainbet skin.
