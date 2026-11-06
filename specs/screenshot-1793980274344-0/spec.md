# Feature Specification: Casino expanding hover banners

**Feature Branch**: `screenshot-1793980274344-0` (studio folder, no git branch)
**Created**: 2026-11-06
**Status**: Draft (clarify)
**Input**: BRD `brd.md`: "Looking at the banners that are around the site, focus on casino first, lets create new behaviour something like winna.com where they expand on hover and show more info." Attachment `attachments/mw55jyyi-screenshot-1793980274344-0.png`: peer banner row, one wide card (tag, headline, subline, CTA, full art) beside three narrow collapsed cards (tag + 2-line headline, art cropped), pagination dots below.

## Strategy alignment *(mandatory — BetOnline)*

- **Core bet / enabler**: Discover (enabler), supporting Reward. Source: `knowledge/product-strategy/BRIEF.md` (bets table).
- **Initiative + feature #**: 06 Personalised Casino Discovery (features 27–31) · Discover. Also "rewards in the lobby" from Now phasing. Source: BRIEF.md › Initiatives + Phasing; SURFACES.md › Casino lobby & discovery row.
- **Needle**: Time to first casino bet — ~8 min / 8 clicks after cleared deposit → **< 2 min** (BRIEF.md › Needles; journey audits via COMPETITOR_RESEARCH.md › Journey audit takeaways). Banner CTA reach is the lever: today at 1440 only 2 of 4 lobby promos are visible and their body copy is clipped (`refs/casino-banners-today-desktop.png`). Secondary: promo click-through from lobby (baseline not yet set; BRIEF.md says activation baselines are "being set with finance").
- **Player job**: Get to casino faster (land on the right game/promo in one click).
- **Competitor reference**: BRD screenshot (peer accordion row) + BRD-named Winna. Take: one expanded card + collapsed siblings so every promo is visible in one row; hover reveals body + CTA. Don't take: peer art, purple/blue chrome, brand partner marks, autoplay dots (see Clarifications). Mobbin connector not authorised in this session, so no Mobbin links; COMPETITOR_RESEARCH.md has no Winna banner entry (only Bonus Center, Promotions dropdown, Challenges).
- **Existing surfaces reused**: `CasinoLobbyBannerRow`, `PromoLobbyBanner`, `VipProgressBanner`, `DailyRacesBanner` (`apps/live-site/components/lumen/casino-lobby-banners.tsx`), data `CASINO_LOBBY_PROMO_BANNERS` (`lib/lumen/casino-lobby-promos.ts`), `Carousel` (`components/ui/carousel.tsx`), `Button`, `Typography`, shell `launchGame` / `setCashierOpen` / `startNavigating`.
- **Out of scope per strategy**: homepage (`HOMEPAGE_PROMO_BANNERS`), promotions lobby and account desk banner rows (they inherit the component later; BRD says "casino first"); the full-bleed `CasinoThemeBanner` and `JackpotRotatingBanner` sections lower in the lobby; personalisation of which promo shows (feature 27).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every lobby promo and expand one on hover (Priority: P1)

A desktop player lands on `/casino`. The banner row shows all promos at once: one card expanded (tag, title, full body, CTA, full art), the rest collapsed to a narrow strip (tag + title over cropped art). Hovering or keyboard-focusing a collapsed card expands it and collapses the previous one, with house motion.

**Why this priority**: Today 2 of 4 promos are off-screen behind an edge chevron and body copy is clipped at 3 lines. This is the whole BRD.

**Independent Test**: Load `/prototype/screenshot-1793980274344-0` at 1440; all promos visible without scrolling; hover each, it expands within ~300ms and shows its CTA.

**Acceptance Scenarios**:

1. **Given** the lobby at 1440, **When** it loads, **Then** every promo card is visible in one row with the first promo expanded and no edge chevrons.
2. **Given** a collapsed card, **When** the pointer enters it (or it receives focus via Tab), **Then** it widens to the expanded width and the previously expanded card collapses, using `cubic-bezier(0.22,1,0.36,1)` at 300–350ms.
3. **Given** the pointer leaves the row, **When** nothing is hovered, **Then** the last hovered card stays expanded (no snap back, no flicker).
4. **Given** an expanded card, **When** the player clicks the card or its CTA, **Then** the existing action runs (launch Chicken Fire, soft-nav to Halloween category, open cashier, etc.) with the existing 2.2s launching spinner.

---

### User Story 2 - Mobile/touch keeps swipe, full info per card (Priority: P1)

On 390 (touch, no hover), banners stay a swipe-only rail; each card shows its full info (title, body, CTA) at once so nothing needs a tap-to-expand.

**Why this priority**: No hover on touch; a tap-to-expand step adds a click against the Activate needle.

**Independent Test**: Load at 390; swipe the row; no chevrons; every card shows CTA.

**Acceptance Scenarios**:

1. **Given** a coarse pointer, **When** the row renders, **Then** cards render in their expanded layout at a fixed mobile width and the rail scrolls by swipe only (MOBILE_CAROUSELS.md).

---

### User Story 3 - Player widgets in the row (Priority: P2)

VIP Progress and $25k Daily Race sit in the same row for logged-in players. Their behaviour inside the new row is an open question (Clarifications Q1).

---

### Edge Cases

- One promo only: render expanded, no accordion behaviour.
- Logged out: VIP + Race hidden (existing rule, `casino-lobby-banners.tsx:413`); promos fill the row.
- Narrow desktop (1024–1200): collapsed width floors at a minimum; if promos still do not fit, the row scrolls with desktop glass chevrons (fine pointer only).
- Long titles: collapsed state clamps title to 2 lines; expanded shows body up to 3 lines.
- Image fails: card falls back to `bg-card` with copy, no broken-image icon.
- Reduced motion: width change is instant (no tween), content crossfade only.
- Loading: shimmer cards shaped like the row (one wide + narrow) via existing `lm-shimmer`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The casino lobby banner row MUST show all promo banners at once at ≥ 1200px, one expanded and the rest collapsed.
- **FR-002**: Hover (fine pointer) and keyboard focus MUST expand a card; only one card is expanded at a time.
- **FR-003**: Collapsed cards MUST show tag + title over cropped art; expanded cards MUST show tag, title, body (≤ 3 lines, no mid-word clip) and CTA.
- **FR-004**: Expansion MUST animate width with the house ease, 300–350ms, and respect `prefers-reduced-motion`.
- **FR-005**: On coarse pointer / < md, the row MUST be swipe-only with every card in expanded layout; no edge chevrons.
- **FR-006**: Card click / CTA MUST reuse existing `onAction` wiring and the 2.2s launch spinner.
- **FR-007**: No sound, no confetti, no glass on banners (POLISH.md: chrome stays quiet, glass only on chrome).
- **FR-008**: Desktop row height MUST be 240px (was 164px); mobile cards 300×200.
- **FR-009**: VIP Progress and Daily Race MUST join the accordion with collapsed + expanded layouts (see Clarifications Q1).
- **FR-010**: The behaviour MUST live in the shared `CasinoLobbyBannerRow` (opt-in prop) so homepage / promotions can adopt it later without a fork.

### Key Entities

- **PromoLobbyBannerItem** (existing): id, tag, title, body, buttonLabel, imageSrc, imageMode, onAction. No new fields needed for P1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1440, 100% of lobby promos are visible without horizontal scroll (today 2 of 4).
- **SC-002**: Expanded body copy shows without ellipsis for all 4 current promos.
- **SC-003**: Banner CTA click-through on `/casino` rises vs today's row (baseline to be set by analytics; event `lobby_banner_expand` + existing CTA click).
- **SC-004**: Supports the time-to-first-casino-bet needle (~8 min → < 2 min, BRIEF.md): promo → game launch stays one click.

## Assumptions

- Casino lobby (`/casino`, `CasinoLobby` in `components/lumen/casino-lobby-page.tsx:1029`) first; other rows later.
- Existing banner art (`public/banners/*.jpg`) is reused; collapsed state crops it with `object-cover`.
- No autoplay (see Clarifications).
- Mobbin unavailable this session (connector needs authorisation); peer input = BRD screenshot only.

## Clarifications

### Session 2026-11-06

- Q: Where does it live? → A: `/casino` lobby banner row, `CasinoLobbyBannerRow` (`casino-lobby-page.tsx:1029`, `casino-lobby-banners.tsx:405`). Source: BRD "focus on casino first"; SURFACES.md Casino lobby row.
- Q: Which components? → A: Extend `PromoLobbyBanner` with a `collapsed` state and add an `expandOnHover` mode to `CasinoLobbyBannerRow`; no new primitive. Source: lumen-build › Build on what exists; constitution I.
- Q: Autoplay like the peer's pagination dots? → A: No. Rest state = first promo expanded; hover drives expansion. Source: lumen-build SKILL "choose restraint" (line 124); POLISH.md §5 "chrome stays quiet". Peer dots are not adopted.
- Q: Mobile behaviour? → A: Swipe-only rail, every card in expanded layout, no tap-to-expand (adds a click against the Activate needle). Source: MOBILE_CAROUSELS.md; BRIEF.md needles.
- Q: Motion? → A: width tween 320ms `cubic-bezier(0.22,1,0.36,1)`, body/CTA fade 180ms after 80ms delay; reduced motion = instant. Source: POLISH.md §4.
- Q: Sound / celebration? → A: None; banners are not a reward moment. Source: POLISH.md §2.
- Q: Hover tint? → A: Keep `BANNER_HOVER` foreground tint (`casino-lobby-banners.tsx:34`); CTA hover unchanged.
- Q: States? → A: loading shimmer (row-shaped), image-error fallback `bg-card`, logged-out (promos only), single promo. Source: POLISH.md §4 loading; casino-lobby-banners.tsx:413.
- Q1: VIP Progress + Daily Race widgets — join the accordion or stay fixed? → A: **Widgets join the accordion.** Collapsed VIP = crown + %; expanded = level, progress bar, next level, Open VIP Hub. Collapsed Race = countdown + position; expanded = Position / Wagered / Current Prize + top 3 from `DAILY_RACE_LEADERBOARD`. Source: Chris, 2026-11-06 (studio answer). Resolves FR-009.
- Q2: Row height? → A: **Grow to ~240px** (from 164px). Continue Playing still starts above the fold at 1440×900. Mobile cards 300×200. Source: Chris, 2026-11-06 (studio answer). Resolves FR-008.
