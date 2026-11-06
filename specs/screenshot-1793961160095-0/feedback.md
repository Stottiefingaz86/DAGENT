# Feedback — screenshot-1793961160095-0 (Shell side-nav refresh)

## Direction approved — 2026-11-06 (Chris)

> Approved (no further note).

**What changed:** prototype built at `/prototype/screenshot-1793961160095-0`. Open board questions had no answer, so I used my recommendations: a single $25k Daily Race widget (no placeholder Weekly/Monthly), and the mobile chip row (`CHIP_NAV`) stays.
**Classification:** nothing durable. No new rule.

## Round 1 — 2026-11-06 — proposal direction (Chris)

> "remove links in header to be more like rain bet,  we also do have orginals, you can see in the casino we have a carousel called orginals"

Screenshot: none (refers to the casino lobby Originals shelf).

**What changed**
- Header: product links removed at every breakpoint. That's `HEADER_NAV` (Casino · Sports · Poker · Promotions), the Other menu (`OTHER_NAV`) and the tablet `TABLET_NAV`. The header bar is now menu · wordmark/lettermark on the left and search · VIP · Login/Join or balance on the right. This replaces the earlier clarify answer B ("keep header tabs too"). The sidebar/drawer Casino | Sports switch is now the only product switch on desktop and tablet.
- Live Betting, Racebook, Esports (were in Other) → Sports group. Contests (was in Other) → Promotions group.
- Originals added back as its own collapsible group. Rows launch Originals games (thumbnail as `iconSrc`), plus "All Originals" → `/casino/category/originals`. Sources: `components/site/casino-subnav.tsx:18,32`, the lobby shelf at `components/lumen/casino-lobby-page.tsx:1037` and `homepage-lobby-page.tsx:426`, and the games list in `lib/lumen/casino-lobby-catalog.ts` (ORIGINALS).
- While checking Originals I found `/casino/category/new` already exists (`casino-subnav.tsx:38`). So the quick link is **New Releases → `/casino/category/new`**, not Trends.
- Open question "doubled product nav on desktop" is now moot. Removed from the board.

**Classification**
- Durable (surface fact + process): BetOnline **does** have Originals. Before dropping a peer nav item as "we don't have it", check the live-site sub-navs and lobby shelves, not the strategy phasing. → `SURFACES.md`.
- Durable (shell direction): the header bar carries no product links; product switching lives in the sidebar / drawer. → `SHELL_HEADER_WIDE.md`.


## Round 2 — 2026-11-06 14:27

> prototype not building in the chat

- Screenshot: `specs/screenshot-1793961160095-0/feedback/mw52jtvo-screenshot-1793975249356-0.png`

**What the screenshot shows:** the chat preview iframe reads "The prototype lane isn't running. Double-click Start Prototype Lane.command, then reload." So nothing was served on `:3001`; this isn't a page-level crash.

**Cause:** I submitted the prototype while `capture_site` was already failing because the lane was down. The studio only allows read-only shell, so I can't run `npm run dev:3001` or `tsc` myself. I shipped it to the chat unverified instead of stopping.

**What changed:**
- Re-tried `capture_site` (desktop): still "isn't running at http://127.0.0.1:3001". Can't start it from here.
- Static re-check of the new code for compile risk (imports, `useShell` fields, `ShellIcon` names, Accordion props, `gameForNavAction` signature). Found nothing to fix.
- I did **not** resubmit. I've asked for the lane to be started so I can capture desktop and 390, then fix what the screenshots show and resubmit.

**Classification:** durable (process). Never submit a prototype to the chat unless `capture_site` returns desktop + mobile screenshots. If the lane is down, stop and ask. → `PIPELINE.md`.
