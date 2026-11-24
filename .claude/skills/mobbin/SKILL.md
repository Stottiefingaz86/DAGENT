---
name: mobbin
description: >-
  Search Mobbin for real production UI/UX screens and flows (web + iOS) from
  NON-gambling apps (fintech, crypto exchanges, trading, loyalty, games, streaming).
  Use for journey inspiration — steps, order, states, feedback — never for layouts.
  Mobbin has no casino or sportsbook apps. Use with lumen-build + COMPETITOR_RESEARCH.
---

# Mobbin — journey inspiration from outside iGaming

MCP server: `https://api.mobbin.com/mcp` (Streamable HTTP). Config copy: `.claude/mcp/mobbin/mcp.json`. Docs: https://docs.mobbin.com/mcp

**Paid plan: active (Nov 2026).** If the MCP still returns a plan/auth error, say so once and carry on with the research Figma folder + `COMPETITOR_RESEARCH.md`. Do not invent peer UI.

## What Mobbin is — and isn't (Chris, Nov 2026)

- **Mobbin has no iGaming apps.** Tested Nov 2026: "bet365 sportsbook", "sports betting bet slip", "online casino slots lobby" return no casino or sportsbook apps at all. Searching for a casino or sportsbook by name is wasted calls.
- **Real competitors** (casino, sportsbook, rewards peers) come from the **research Figma folder** (`knowledge/research/CHANGELOG.md`), `PEERS.md`, `COMPETITOR_RESEARCH.md` and `competitors/`.
- **Mobbin is for the journey, not the layout.** Take *how the journey works*: the steps and their order, what's asked when, states (pending, success, error, empty), progress and feedback, timing, how trust is built, what's skipped. **Never copy a Mobbin screen's layout, structure or visual style** — a trading app or a bank does not fit iGaming. The layout always comes from our shell, Lumen components and `SURFACES.md`.

## Search adjacent categories

| Our surface | Search Mobbin for |
|-------------|-------------------|
| Join / verify / OTP | crypto exchange or bank sign-up, email/SMS verification code |
| Cashier, deposit, withdraw | crypto wallet deposit address, transfer status tracking |
| Bet slip, stake entry | trading app order ticket, buy/sell confirmation |
| Rewards, VIP, rakeback | loyalty tiers, rewards shop, points claim, airline status |
| Missions, races, streaks | Duolingo-style quests, leaderboards, streaks |
| Lobby & discovery | streaming app browse rows, categories, search |
| Live match / odds | live sports scores, match tracker |
| Account & history | transaction history filters, security settings |

## Tools

| Tool | Use |
|------|-----|
| `search_flows` | Multi-step journeys (best fit — journeys are what we take) |
| `search_screens` | One screen state (e.g. "deposit pending status") |
| `search_sections` | Section-level patterns |

## How

1. Query the **journey in an adjacent category** (table above), not a casino.
2. **Read the returned images** — never decide from metadata.
3. Write down the *journey pattern* you're taking, in one line each ("verify code auto-submits on the 6th digit", "pending deposit shows each confirmation step"), with the Mobbin link.
4. Build it with **our** shell and Lumen — never the peer's layout, brand, chrome or copy.
5. In proposals, say what you borrowed (the journey step) and what you deliberately didn't (the layout).

## Example

Short join → Mobbin: crypto-exchange sign-up flow → take: email first, password second, code auto-submits, welcome after verify → build it in our AuthModal (Email → Password → Verify, Lumen frost) — **not** that exchange's screens.
