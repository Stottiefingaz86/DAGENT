# Feature Specification: Share my bet (sportsbook)

**Feature Branch**: n/a (studio job `on-sportbook-after-a-bet-we-want-to-be-able-to-s`)
**Created**: 2026-11-09
**Status**: Draft (clarify)
**Input**: BRD: "on sportbook, after a bet we want to be able to share my bet via socials. on the betslip success page and the bet history page." (`brd.md`)

**Surfaces (SURFACES.md):** Sportsbook (betslip success in `components/lumen/soccer-betslip.tsx`) · My Account (bet history in `components/lumen/bet-history-page.tsx`). Neighbour reused for share chrome: Promotions › Refer a Friend (`components/lumen/refer-a-friend-page.tsx` › `ShareLinkCard`, `StickyShareColumn`).

## Strategy alignment *(mandatory)*

- **KPI it moves** (KPIS.md): **#6 net revenue per active player outside casino** (+5.0% target, weight 10%), read same-period vs last year; secondary **#5 30-day return rate** (+5.0% provisional) for players who open a shared bet. Sportsbook team goal: engagement days +5% (KPIS.md › Sportsbook).
- **Core bet / enabler**: **Convert** (win new bettors; a shared bet is word-of-mouth acquisition) with **Reward** heartbeat ("every wager is creating excitement", BRIEF north star).
- **Initiative + feature #**: 09 Sports-to-Casino Ecosystem · **#41 Back My Picks** (adjacent) and BRIEF phasing "Later — live wins feed / **shareable receipts**". BRIEF lists shareable receipts as *Later*; this BRD pulls a thin slice forward. Flagged, not blocking.
- **Needle**: no BRIEF needle covers sharing directly. Proxy: share rate per placed bet (baseline 0, feature doesn't exist) and sign-ups attributed to shared links (baseline 0). Both need tracking defined at handoff (KPIS.md › Delivery & data).
- **Player job**: Make every wager do more.
- **Competitor reference**: Sportsbook direction is Kalshi / Polymarket (PEERS.md › Sportsbook): clear market card, price, one action. Peer share flows to be pulled from the research Figma folder + Mobbin in the research step; nothing described from memory.
- **Existing surfaces reused**: betslip success state (`Bets placed`, My Bets primary, Reuse selection link), bet history expanded row (`BetExpanded`, Print button), RAF share actions (Copy link, Share on X via intent URL, `earnReferShare`), Sonner toast for "Link copied" (POLISH.md §1: small actions = toast only, no confetti/sound).
- **Out of scope per strategy**: tailing / copy-betting other players' picks as a product (#41 full), public leaderboards, social feed, in-app chat, casino bet sharing (BRD is sportsbook only).

## Clarifications

### Session 2026-11-09 (answered from sources)

- Q: Where does Share sit on the success screen? → A: As a quiet icon button beside the **My Bets** primary, not a second text button. Sources: CONFIRMATION_STATES.md (one primary, "Reuse selection" stays a quiet link, no competing button); POLISH.md learned rule rule:2b6feb20 (secondary actions become icon buttons).
- Q: Where does Share sit in bet history? → A: In the expanded row (`BetExpanded`), next to Print as an icon+label secondary button on desktop and an icon button on mobile. The table row itself stays unchanged (mobile shows Description | Status only, bet-history-page.tsx:478). Source: bet-history-page.tsx:432.
- Q: Which bets can be shared from history? → A: Pending, Won and Lost. Cancelled hides Share (nothing to show). Source: statuses in `lib/lumen/bet-history.ts`.
- Q: Which channels? → A: Mobile/touch: the device's native share sheet first (it already lists the player's social apps), fallback to our share menu. Desktop: a small popover menu with X, Telegram, WhatsApp, Copy link, Download image. X uses the intent URL pattern RAF already ships (refer-a-friend-page.tsx:428).
- Q: Feedback after sharing? → A: Copy → in-place "Copied" state (RAF pattern). Native share / external apps → nothing. No confetti, no sound (POLISH.md §1 "Scale it to the moment", §Never "Confetti or sound on ordinary actions").
- Q: Logged-out? → A: Share only appears for logged-in players (both surfaces are behind login: betslip places only when logged in, soccer-betslip.tsx:315; bet history is /account).
- Q: Failure? → A: If the share card/link can't be generated: inline error in the menu "Couldn't create the share link." + Retry; Copy falls back to selecting the URL text. Source: PIPELINE.md › Unhappy paths.

### Session 2026-11-09 (Chris)

- Q: Should the shared bet card show the stake and payout amounts? → A: **Always show amounts** (Chris). Card always shows Stake and To win / Won; no "Show amounts" toggle.
- Q: Should the shared bet link carry the player's Refer-a-Friend code? → A: **Yes, attach the RAF code** (Chris). Link = `/sports/<sport>?share=<token>&RAF=<code>`; sharing calls the same RAF share credit as `earnReferShare` (refer-a-friend-page.tsx:221); sign-ups attribute to the sharer in Refer-a-Friend.
- Q: What does a friend see when they open a shared bet link? → A: **Revised by Chris in proposal round 1:** no public bet page. "They should land on sports with the bets already in the slip." The link opens `/sports/<sport>` with the shared picks loaded and the betslip open (stakes empty, current odds). Started/settled legs are dropped with a one-line note in the slip. Logged-out visitors meet Join only at Place Bet (existing betslip behaviour, soccer-betslip.tsx onPlaceBet). (Earlier answer "Public bet page with Add to betslip" is superseded.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Share right after placing a bet (Priority: P1)

A logged-in player places a bet; on the "Bets placed" screen they tap Share and post the bet to a social app.

**Why this priority**: The BRD's first surface and the moment of highest excitement.

**Independent Test**: Place a bet on /sports/soccer, tap Share on the success screen, complete a share via native sheet (mobile) or X / Copy link (desktop).

**Acceptance Scenarios**:

1. **Given** the betslip shows "Bets placed", **When** the player taps the Share icon, **Then** mobile opens the native share sheet with the bet card image + link, and desktop opens the share menu anchored to the icon.
2. **Given** the share step is open, **When** the player picks Copy, **Then** the link is copied and the button reads "Copied" for 1.6s (no toast).
3. **Given** a parlay of 3 selections, **When** the card is generated, **Then** it lists every leg with market, pick and odds, and the combined odds.

### User Story 2 - Share a bet from Bet History (Priority: P1)

A player opens My Account › Bet History, expands a bet and shares it (e.g. a winning parlay).

**Why this priority**: BRD's second surface; settled wins are the most shared moment.

**Independent Test**: /account/bet-history → expand a Won row → Share → channel.

**Acceptance Scenarios**:

1. **Given** an expanded Won, Lost or Pending bet, **When** the player taps Share, **Then** the same share menu / native sheet opens with that bet's card.
2. **Given** a Cancelled bet, **When** expanded, **Then** no Share action shows.
3. **Given** a Won bet, **When** shared, **Then** the card shows the "Won" status badge in the same success style as bet history (`BET_STATUS_STYLE`).

### User Story 4 - Friend opens a shared bet (Priority: P1)

A friend taps the link on X/Telegram/WhatsApp and lands on the sportsbook with the same picks already in an open betslip.

**Why this priority**: Turns each share into acquisition (Convert) via RAF attribution, with no step between the link and the bet (Chris, round 1; SPORTSBOOK.md).

**Independent Test**: open `/sports/soccer?share=<token>&RAF=<code>` logged out → betslip open with 3 picks → enter stake → Place Bet → Join → back in the slip.

**Acceptance Scenarios**:

1. **Given** a pending bet whose events haven't started, **When** the friend opens the link, **Then** /sports/<sport> loads with every leg in the betslip at current odds and the slip open (desktop drawer; mobile bottom sheet), stakes empty.
2. **Given** a logged-out friend, **When** they tap Place Bet, **Then** Join opens with the RAF code applied (existing onPlaceBet → openAuth('join')), and after Join the slip still holds the picks.
3. **Given** some legs have started or settled, **When** the link opens, **Then** only open legs are added and the slip shows one muted line: "1 pick has started and wasn't added."
4. **Given** every leg has started/settled, or the token is invalid, **When** the link opens, **Then** the sportsbook loads with the betslip open and empty, with one line: "This bet has settled." / "This bet isn't available."
5. **Given** odds moved since the share, **When** legs are added, **Then** the betslip shows current odds (existing betslip behaviour).
6. **Given** the shared legs fail to load, **When** the link opens, **Then** the slip shows "Couldn't load the shared picks." with Retry.

### User Story 3 - Preview before posting (Priority: P2)

On desktop the player sees a preview of the bet card in the share menu before choosing a channel.

**Independent Test**: open share menu on desktop; preview card renders; Download image saves it.

**Acceptance Scenarios**:

1. **Given** the share menu is open, **When** the card is loading, **Then** a skeleton shaped like the card shows, then the card.
2. **Given** card generation fails, **When** the menu opens, **Then** it shows "Couldn't create the share link." with Retry; the other channels stay disabled until it succeeds.

### Edge Cases

- Long team / market names: truncate with ellipsis on the card, full text in the link preview.
- Parlay with 8+ legs: card shows first 5 legs + "+3 more".
- Native share cancelled by the player: nothing happens, no toast.
- Browser with no native share and no clipboard permission: Copy shows the URL selected in a read-only field (RAF `ShareLinkCard` pattern).
- Bet voided after sharing: the link shows the current status (decided with Q3).
- Reduced motion: menu opens without scale, opacity only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The betslip success screen MUST show a Share icon button beside the My Bets primary (icon `IconShare`, tooltip "Share bet", 40px target to match the primary).
- **FR-002**: The bet history expanded row MUST show a Share action next to Print for Pending, Won and Lost bets, and MUST hide it for Cancelled.
- **FR-003**: On touch devices with native share available, Share MUST open the native share sheet with title, text (one line: pick + odds) and link.
- **FR-004**: Otherwise Share MUST open a share menu with: X, Telegram, WhatsApp, Copy link, Download image, plus a preview of the bet card.
- **FR-005**: The bet card MUST show: selection(s), market, odds (combined odds for parlays), status badge, placed date, **stake and to-win (or won) amounts, always**, and our brand mark via `ShellWordmark`/`ShellLettermark` only.
- **FR-010**: Every share link MUST carry the sharer's RAF code and count as a RAF share (same credit as `earnReferShare`).
- **FR-011**: A share link MUST open `/sports/<sport>` with the open legs loaded into the betslip and the slip open; there is no intermediate landing page (Chris, round 1).
- **FR-012**: Dropped legs (started/settled) and invalid links MUST be explained with one muted line inside the betslip; load failure shows Retry.
- **FR-006**: Copy link MUST confirm in place like RAF's Copy (refer-a-friend-page.tsx:250): icon swaps to a check and the label reads "Copied" for 1.6s. No toast (the shell toast plays a pop sound), no confetti.
- **FR-007**: Card/link generation failure MUST show an inline error with Retry; loading MUST show a card-shaped skeleton.
- **FR-008**: Share MUST NOT appear for logged-out users.
- **FR-009**: Analytics: `bet_share_opened` (surface, bet type, status), `bet_share_channel` (channel), `bet_share_link_opened` (recipient, logged in/out), `bet_share_signup` (attributed join).

### Key Entities

- **Shared bet**: bet ID, legs (event, market, pick, odds), combined odds, status, placed date, stake, to-win/won, share token, sharer (handle only).
- **Share link**: sportsbook URL with a share token that loads the legs into the betslip, plus the sharer's RAF code (`?share=<token>&RAF=<code>`).

## Success Criteria *(mandatory)*

- **SC-001**: A player can share a bet from either surface in 2 taps or fewer on mobile (Share → app).
- **SC-002**: ≥ 3% of placed bets shared within 30 days of release (target to confirm with sportsbook).
- **SC-003**: Shared-link visits convert to joins at a rate measurable against a control (tracking signed off at handoff).
- **SC-004**: No increase in betslip time from selection to confirmation (sportsbook goal "3 taps or fewer", KPIS.md).

## Assumptions

- Social apps targeted are those our players use for betting chatter (X, Telegram, WhatsApp); native sheet covers the rest on mobile.
- The bet card image is generated server-side from bet data; design specifies layout, not rendering tech.
- Sportsbook is the only vertical in scope; casino win sharing can reuse the card later.
- The live site has no existing share component; Share menu is composed from Lumen `Popover`/`DropdownMenu` + `Button` + RAF share patterns.
