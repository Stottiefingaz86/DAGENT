# Feature Specification: Shell side-nav refresh (Rainbet structure, Lumen skin)

**Feature Branch**: n/a (studio job `screenshot-1793961160095-0`)
**Created**: 2026-11-06
**Status**: Clarified — proposal
**Input**: BRD (`brd.md`): "update our side navigation to be the same as rainbet.com, update our shell to match." Attachment: `attachments/mw4u5u4s-screenshot-1793961160095-0.png` (Rainbet homepage, logged out, desktop).

**Surfaces touched** (`.cursor/knowledge/chris-taste/SURFACES.md`): **Shell & navigation** — `components/site/shell-sidebar.tsx`, `shell-nav.ts`, `shell-header.tsx`, `shell-drawer.tsx`, `shell-mobile-nav.tsx`, `shell-product-chips.tsx`. Secondary: **Rewards & VIP** (widget + VIP Hub row) and **Promotions / races** (race-pot widget data, `lumen/daily-races-panel.tsx`, `lib/lumen/daily-races`).

## What we read in the reference (screenshot + `competitors/rainbet-homepage-live-wins-sidebar.jpg`)

Rainbet sidebar, top → bottom:
1. Hamburger + **Casino | Sports segmented toggle** sitting above the sidebar column (product switch lives in the sidebar, not the header).
2. **Reward widget**: "$20,000 Weekly Raffle" with countdown chip, then a 3-up row of race pots (Daily $25K · Weekly $100K · Monthly $1M).
3. **Quick links**: Home (active, filled), Favorites, Recently Played, New Releases.
4. **Collapsible groups** as bordered rows with a chevron: Casino, Originals, Promotions (Promotions expands to VIP Exclusive + race rows with timers, Challenges, Promotions).
5. **Utility footer**: Rewards, Blog, Live Support, Language selector.

Header: logo in the content column; right side = search, gift (rewards), Login, Register, chat. No product tabs in the header.

## What ships today (current state)

- **Header** (`shell-header.tsx`): 68px bar capped at `max-w-[1440px]` (`SHELL_HEADER_WIDE.md`); menu toggle + lettermark; desktop product tabs from `HEADER_NAV` (Casino · Sports · Poker · Promotions) + **Other** menu (`OTHER_NAV`: Live Betting, Racebook, Contests, Esports); right side VIP button + Login/Join or `ShellUbc` (balance / VIP / UB).
- **Sidebar** (`shell-sidebar.tsx`): fixed, `bg-[var(--sidebar-inverted)]`, 96px collapsed rail ↔ 256px expanded, logo morph. Contents are **product-scoped** (`navForProduct`): casino = Casino Lobby · Favorite · Play Random · Last Game Played, then 9 category rows; sports = Sports Home, My Bets, Live Betting…, Top Leagues, Top Sports, A–Z; poker / promotions / account have their own sets. `VIP Hub` is always the last row (`VIP_HUB_NAV_ITEM`).
- **Mobile**: drawer (`shell-drawer.tsx`) mirrors sidebar groups; floating dock (`shell-mobile-nav.tsx`) is product-scoped; product chips row (`CHIP_NAV`).
- No reward/race widget anywhere in the chrome. Daily Races exists only on the prototype lane (`PROTOTYPE_LANE.md`).

## Strategy alignment *(mandatory — BetOnline)*

- **Core bet / enabler**: **Reward** (rewards as chrome) + **Discover** enabler (casino-first, faster path to games).
- **Initiative + feature #**: 04 Always-On Reward Mechanics · **#19 Race/Mission/Jackpot Side Rail** (primary); 06 Personalised Casino Discovery · #28 Continue Playing (Recently Played quick link); 03 · #12 Reward/VIP Alert State (header gift/VIP). Source: `BRIEF.md` feature index; `COMPETITOR_RESEARCH.md` §2 maps this exact Rainbet pattern to 03–04 / #19.
- **Needle**: Time to first casino bet — baseline **~8 min / 8 clicks** after cleared deposit; sports-start users take **~50s just to find casino** → target **< 2 min** (`BRIEF.md` Needles; `COMPETITOR_RESEARCH.md` journey-audit table from `Journey_Audits_2026.pdf`). Secondary: reward moments seen per session (no baseline yet — "BOL has the biggest promo portfolio and the smallest spotlight", `COMPETITOR_RESEARCH.md` §2).
- **Player job**: Get to casino faster · Make every wager do more.
- **Competitor reference**: Rainbet left nav with reward widgets (`COMPETITOR_RESEARCH.md` §2, `competitors/rainbet-homepage-live-wins-sidebar.jpg`) + header gift → rewards list (§3). **Take**: IA order (switch → rewards → quick links → collapsible groups → utilities), rewards-as-chrome, always-visible product switch. **Don't take**: Rainbet colours/blue chrome, bordered-card accordion styling, gem/raffle art, Blog. **Do take** a header with no product links (Chris round 1) and an **Originals** group (we ship Originals: `/casino/category/originals`). Mobbin MCP is not connected in this studio run — fell back to COMPETITOR_RESEARCH + `competitors/` screenshots.
- **Existing surfaces reused**: `ShellSidebar`, `ShellDrawer`, `ShellHeader`, `ShellUbc`/`VipButton`, `ShellIcon`, VIP Hub sheet (`site/vip-hub-sheet.tsx`), race data (`lib/lumen/daily-races`), last-game / favourites (`LAST_GAME_AND_FAVOURITES.md`), casino search overlay.
- **Out of scope per strategy**: building Raffles, new Originals games, Blog, Missions system (#18), new race products; sportsbook A–Z redesign beyond moving it under the Sports group; any change to auth/cashier.

## Clarifications

### Session 2026-11-06

Answered from sources (no human needed):
- Q: Copy Rainbet's look (blue chrome, bordered accordion cards)? → A: No. Structure only, rendered with Lumen sidebar tokens (`--sidebar-inverted`, `--sidebar-primary`, `--surface-muted-1-inverted`, `--border-inverted`). Source: `CLAUDE.md` "Do not ship… peer brand clones"; constitution I + VI; `COMPETITOR_RESEARCH.md` "translate into Lumen — never clone".
- Q: Keep the 96px collapsed rail? → A: Yes. Collapsed rail shows switch as two stacked icons, widget collapses to a single trophy icon with a dot when a race is live, groups collapse to their icon with tooltip (`data-tip`). Source: `shell-sidebar.tsx` (Figma sidebar-container 96/256).
- Q: Header width? → A: Header controls stay on the `max-w-[1440px]` content column. Source: `SHELL_HEADER_WIDE.md`.
- Q: "Originals" group? → A: **Yes (corrected by Chris, round 1).** Originals group sits between Casino and Sports. Its rows launch Originals games, using thumbnails from `ORIGINALS` in `lib/lumen/casino-lobby-catalog.ts`. "All Originals" goes to `/casino/category/originals` (`casino-subnav.tsx:32`).
- Q: Raffle? → A: No raffle product exists at BetOnline; widget uses races (see Q2).
- Q: Mobile? → A: The drawer renders the same new sidebar tree (switch, widget, quick links, groups). Floating dock unchanged; widget is not added to the dock. Carousels in the widget (if any) swipe only. Source: `shell-drawer.tsx`, `MOBILE_CAROUSELS.md`.
- Q: Group open/closed default? → A: The group matching the current product is open; others collapsed; state persists per session. Our current casino categories (Popular, Slots, Live, Table, Video Poker, Specialty, Virtuals, Tournaments, Trends) become the Casino group's children.
- Q: Quick links? → A: Home (`/`), Favorites (`/casino/category/favourites`), Recently Played (= existing Last Game Played action, `withLastGamePlayed`), Play Random (kept — it's ours and already ships). New Releases → `/casino/category/new` (exists, `casino-subnav.tsx:38`).
- Q: Utility footer? → A: VIP Hub (existing action), Live Support (opens existing Intercom, `site/intercom-fab.tsx`), Language. Blog dropped.

Answered by Chris (2026-11-06, studio):
- Q: Should the Casino | Sports switch move into the sidebar and the header tabs go? → A: **Switch in the sidebar; header product links removed** (`HEADER_NAV`, `TABLET_NAV`, Other menu). Chris first chose B (keep the tabs), then changed it in proposal round 1: “remove links in header to be more like rain bet” (`feedback.md`). Live Betting / Racebook / Esports → Sports group; Contests → Promotions group.
- Q: What does the sidebar reward widget show? → A: **A — race pots** (Daily / Weekly / Monthly amounts + live countdowns) from `lib/lumen/daily-races`; hidden on demo `:3000` until Races merges (`PROTOTYPE_LANE.md`).

- Q (prototype round 2): The :3001 prototype lane is down and the studio can't start it. Can someone run Start Prototype Lane.command? → A: **Lane started; capture, fix and resubmit** (Chris, 2026-11-06). Process rule now in `PIPELINE.md`: no prototype in the chat without desktop + mobile screenshots.

Follow-on decisions (from the answers, no new question needed):
- The sidebar/drawer switch is the **only** product switch at every breakpoint. It's driven by `product` in `useShell`.
- Switch is 2-way (Casino | Sports) as in the reference. Poker and Promotions are sidebar groups.
- Header keeps the menu toggle + wordmark/lettermark on the left and search · VIP · Login/Join or `ShellUbc` on the right. It stays on the 1440 column (`SHELL_HEADER_WIDE.md`).
- Mobile product chips row (`shell-product-chips.tsx`, `CHIP_NAV`) is not the header bar. It stays for now; raised as an open question on the board.
- Widget gating: rendered only when the prototype lane flag is on (`PROTOTYPE_LANE=1` / `/prototype/*`); on demo the tree starts at quick links.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch product and reach a casino category from the sidebar (Priority: P1)

A sports-first player on any route opens the sidebar, taps **Casino** in the switch, and lands in the casino lobby with the Casino group expanded; one more tap reaches Slots or Live Casino.

**Why this priority**: Sports-start players take ~50s to find casino (journey audit). An always-visible switch directly attacks the Activate needle.

**Independent Test**: From `/sports/soccer`, count clicks/time to `/casino/slots` — ≤ 2 clicks.

**Acceptance Scenarios**:
1. **Given** a player on `/sports/soccer` with sidebar expanded, **When** they tap Casino in the switch, **Then** soft-nav to `/casino`, switch shows Casino active, Casino group expanded.
2. **Given** the collapsed 96px rail, **When** hovering a group icon, **Then** a right-side tooltip shows the group label.

### User Story 2 - See live reward pots in the chrome (Priority: P2)

A player sees race pots with live countdowns at the top of the sidebar and taps one to open its race view.

**Why this priority**: Feature #19 — rewards as chrome, frequency over size.

**Independent Test**: Widget renders pots + countdown on every product route; tap opens the race destination.

**Acceptance Scenarios**:
1. **Given** any shell route, **When** the sidebar is expanded, **Then** the widget shows pot amounts and ticking countdowns.
2. **Given** race data fails to load, **Then** the widget hides (no empty shell, no error in chrome) and nav below shifts up without layout jump.

### User Story 3 - Quick links and utilities (Priority: P3)

Player uses Home, Favorites, Recently Played, Play Random, VIP Hub, Live Support, Language from one sidebar on every product.

**Acceptance Scenarios**:
1. **Given** a logged-out player, **When** tapping Recently Played, **Then** the login modal opens (existing `withLastGamePlayed` behaviour).
2. **Given** a logged-in player with no history, **Then** Recently Played shows subtitle "Will show here".

### Edge Cases

- Account routes (`/account/*`): keep `ACCOUNT_NAV` override — the refreshed tree does not replace account nav.
- Poker landing hash anchors: live inside the Poker group (or header, per Q1); active-from-hash logic unchanged.
- Long sports A–Z list inside a collapsed Sports group must scroll within `#shell-scroll` region, not push the utility footer off-screen — footer sits at the bottom of the scroll, not pinned.
- Countdown hits zero → rolls to next period (existing `formatRaceCountdown` behaviour); reduced-motion = no pulse on live dot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sidebar MUST start with a Casino | Sports segmented switch (soft-nav to `/casino` / `/sports/soccer`), active state synced to `product`. Header product links (`HEADER_NAV`, `TABLET_NAV`, Other menu) MUST be removed at every breakpoint.
- **FR-002**: Sidebar MUST render one unified tree on every non-account route, in order: switch → reward widget → quick links (Home, Favorites, Recently Played, New Releases, Play Random) → collapsible groups (Casino, Originals, Sports, Poker, Promotions) → utilities (VIP Hub, Live Support, Language).
- **FR-003**: Collapsible groups MUST use Lumen nav row recipe from `shell-sidebar.tsx` (h-11, rounded-lg, `--sidebar-primary` active) with a trailing caret (`ShellIcon caretDown`) rotating 180° on open; no bordered card per group.
- **FR-004**: Reward widget MUST show Daily / Weekly / Monthly race pots with live countdowns from `lib/lumen/daily-races`, and MUST NOT render on demo `:3000` until Chris says Merge for Races.
- **FR-005**: Collapsed rail (96px) MUST keep icon-only rendering with tooltips; widget collapses to an icon.
- **FR-006**: Mobile drawer MUST render the same tree; dock unchanged.
- **FR-007**: All colours/spacing/radii MUST come from Lumen tokens; `npm run tokens:lint` passes.
- **FR-008**: Prototype MUST live at `/prototype/screenshot-1793961160095-0` on `:3001` only; demo `:3000` untouched until Merge.

### Key Entities

- **NavTree**: switch items, widget, quick links, groups (label, icon, children, defaultOpen), utilities — extends `ShellNavGroup`/`ShellNavItem` in `shell-nav.ts` with `children` + `collapsible`.
- **RacePot**: period (daily/weekly/monthly), amount, endsAt — from `lib/lumen/daily-races`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any sports route, a casino category is reachable in ≤ 2 clicks (today: header Casino → sidebar row = 2, but the switch is not visible on mobile without opening the drawer; target ≤ 2 on mobile too).
- **SC-002**: Contributes to time-to-first-casino-bet ~8 min → < 2 min (`BRIEF.md`).
- **SC-003**: Reward widget visible above the fold on 100% of non-account routes at lg (1440) when expanded.
- **SC-004**: Zero raw hex / arbitrary values introduced (token lint).

## Assumptions

- Mobbin unavailable in this run; peer evidence = `COMPETITOR_RESEARCH.md` + `competitors/` + the attached screenshot.
- "Update our shell to match" = header loses whatever moves into the sidebar and gains a search icon on desktop (existing `casino-search-overlay`); VIP button / UBC unchanged.
- Race amounts reuse prototype data in `lib/lumen/daily-races`; no new backend.
