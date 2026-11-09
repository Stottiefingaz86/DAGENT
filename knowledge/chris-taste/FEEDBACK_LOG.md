---
name: Chris feedback log
description: Likes vs dislikes from 6 months of design reviews, by surface. Read before designing any surface; every Don't is a hard reject.
---

# Chris feedback log — likes vs dislikes

**Purpose:** Positive / negative product taste for Design Agent and live-site builds. Not a chat dump.  
**Read by:** the Design Agent playbook (`.claude/skills/design-agent/SKILL.md`) before every design, next to the learned rules on the Taste page.  
**Hard rules also live in:** `lumen-build` skill + `patterns.md` + other notes in this folder.

**Rule:** On every correction or “love this / hate this,” append here **and** update the matching chris-taste note the same turn. No vendor / prior-employer brand names in this file — describe the pattern, not the company.

Format for new chronological entries (bottom of file):

```
### YYYY-MM-DD — short topic
- **Sentiment:** positive | negative | mixed
- **Surface:** …
- **Signal:** what Chris said (paraphrase OK)
- **Do:** …
- **Don't:** …
```

---

## How Design Agent must use this

1. Before inventing UI, grep this file for the **surface** (sub-nav, carousel, OTP, toast, …).  
2. Treat every **Don't** as a hard reject — do not retry with a small tweak.  
3. Prefer shipped neighbors + Lumen over invention.  
4. After Chris corrects you, append + promote into the taste note / skill.

---

## Settled Do / Don't by surface

### Sub-nav (repeated heavily — do not re-litigate)

| | |
|--|--|
| **Do** | Match design-tool frame pixel-for-pixel before inventing. Glass frost bar (token `--container`), no invented divider. White / high-contrast **icon chip** + category **pills** with soft card shadow on the glass field. Semibold/medium pills; animated **glide** thumb on select (not hard on/off). Sub-nav sits in the **sticky chrome stack**; content scrolls underneath. Mobile: pills **full-bleed**, track scrolls with the grey field (not text clipped inside). Desktop may keep glass edge arrows when fine pointer. |
| **Don't** | Invent a different sub-nav. Light-hardcoded glass in dark mode. Extra `border-b` when Figma is blur-only. Faint icons on muted capsule instead of the white chip. Flat inactive chips with no shadow. Mobile **crop** so pills don't flow off the right. Mobile arrows on the sub-nav track. Search / Favourites chrome on mobile when those live in the dock. Late-loading sub-nav after the rest of the page. Ship without checking the design-tool source. |

### Shell / sticky chrome

| | |
|--|--|
| **Do** | One sticky chrome block (chips + header + glass sub-nav). Scroll in `#shell-scroll`. Soft-nav: spinner on tile **before** route change. Destination skeletons. Sidebar/dock active = real route. Ultra-wide: brand bar inner `max-w-[1440px]` aligned to content. Sidebar open/close: smooth ease; closed state persists across pages. Mobile dock: Search / Play Random / Favourites; hide on scroll up, show on scroll down (opposite of top tabs). Drawers: drag-to-dismiss with centered handle; don't dismiss on every content swipe. |
| **Don't** | Invent wordmark headers or a second shell. Sticky with `top: 0 !important`. Full-page boot loader on soft top-nav. Broken hover/active on VIP / UBC / logout. Side-nav that doesn't match design-tool. Intercom-style chat bubble on mobile product chrome. |

### Carousels / shelves / arrows

| | |
|--|--|
| **Do** | **Mobile + touch = swipe only.** Desktop glass arrows only when `(hover: hover) and (pointer: fine)`. Separate scrollport from flex row so overflow is swipeable. See More + arrows readable on the shelf background. Align Top 10 / shelves with sibling rows (same gutters). Live Wins: shelf h4, play/pause beside title, primary live dot, tile spring hover — see `LIVE_WINS_CAROUSEL.md`. |
| **Don't** | Overlay chevrons on mobile “for discoverability.” `touch-pan-x` on odds rails (kills vertical scroll). Numbers / rank badges more behind cards after being told to fix depth. Broken See More. Indent one shelf differently from the rest. |

### Cards / surfaces / hover

| | |
|--|--|
| **Do** | Default card: `rounded-lg border border-border bg-card` (Lumen radius token; same as the old 10px) + soft `0 0 16px` shadow. Hover/active/focus on interactive chrome. Tooltips on icon hits. Casino tiles: smooth spring hover. Sheet close: `rounded-lg` + `hover:bg-accent`. |
| **Don't** | Decorative cards for static logos/marketing. Missing hover/active states. White heart / faded icons when neighbors use proper token states. Random shimmer skeletons that aren't Lumen. Hamburger when the product icon already exists. Desktop drawer when the pattern is **sheet**. |

### Inputs / fields

| | |
|--|--|
| **Do** | Match cashier BTC converter: `rounded-lg border border-input bg-popover`. Text `text-foreground`; placeholders muted. One frost field — dial/prefix inside the country dropdown, not a second tone. |
| **Don't** | `bg-card` / plain `bg-background` fields that disappear on dark secondary washes. Nested Select backgrounds / two-tone grey phone fields. |

### Join / verify / OTP / SMS

| | |
|--|--|
| **Do** | Join CTA **Next**; verify CTA **Complete**. Full Name only on Verify. OTP = **5** bare square boxes, full width, paste OK. SMS optional like Referral expand (chevron); collapse dismisses. Country from IP; flag + dial in dropdown; **Send SMS** beside field. Hover wash centered on prefix. |
| **Don't** | Full Name on first join form (journeys 1/5). Trap in required phone. OTP as grey stripe, dashed groups, 6 boxes, or boxes inside a card “block.” Off-center hover pill. AI sports-gate copy — see `AUTH_JOIN.md` / `COPY.md`. |

### Copy

| | |
|--|--|
| **Do** | One concrete fact. Match shipped neighbors. Login CTA = **Login**. |
| **Don't** | AI-slop filler, em-dash pitches, “You’re in” as body copy, explaining the product in three clauses. See `COPY.md`. |

### Claims / toasts / tooltips

| | |
|--|--|
| **Do** | Claim → toast under balance (readable, correct tokens, centered on mobile). Tooltips on info icons. Confetti/celebrate via shared VIP path. |
| **Don't** | Transparent unreadable toasts. Toast stuck left / wrong colour. Shipping claim UI with no toast. Ignoring tooltip requests across turns. |

### Lumen / design-tool / component gallery

| | |
|--|--|
| **Do** | Lumen only. Pull from design-tool MCP before coding. Reuse gallery components (confetti, shimmer, tiles). Exact tokens — no parallel system. Skeletons that match real layout. |
| **Don't** | Invent outside the system. “Looks live” with no link. Fake peer UI from memory when peer-screen library / research exists. Skip MCP then invent pages. |

### Design Agent / process

| | |
|--|--|
| **Do** | One clear master Design Agent flow. BRD → skills + research → build → human gates → learn from this log → package. Always load lumen-build (+ patterns) every request. Separate back-office styling from the demo site. Show what needs attention, screens, and what’s going to engineering. |
| **Don't** | Confusing multi-agent soup. Clunky back office shared with live demo. Approve with no artifact. Pause with no explanation. Handoffs missing peer-screen / research tooling when competitor flows matter. |

### Responsive / large screens

| | |
|--|--|
| **Do** | Center content on large desktops (`max-w` alignment). Mobile product tabs: don’t double-highlight Casino + Live Casino. Smooth lobby scroll (no snap hitch). |
| **Don't** | Left-jammed ultra-wide layouts. Mobile casino sub-nav with desktop chrome leftovers. |

---

## Chronological entries (append below)

## Session: Join verify + Design Agent + handoff (Nov 2026)

### 2026-11-04 — Join CTAs
- **Sentiment:** positive (after fix)
- **Surface:** join/auth
- **Signal:** First page CTA **Next**, verify CTA **Complete**.
- **Do:** Journey 1/5 join = **Next**; verify = **Complete**.
- **Don't:** Full Name on the first join form for journeys 1/5.

### 2026-11-04 — SMS optional / closable
- **Sentiment:** negative then fixed
- **Surface:** phone/SMS
- **Signal:** Opening mobile must be dismissible; mobile is optional.
- **Do:** SMS expand like Referral; collapse dismisses; phone never required.
- **Don't:** Trap users in a required phone step.

### 2026-11-04 — Prefer SMS UX
- **Sentiment:** mixed → settled
- **Surface:** phone/SMS
- **Signal:** Prefer SMS like the referral arrow; hover chip so it looks clickable; hover must be centered.
- **Do:** Flag + dial in dropdown; one frost Input; hover wash vertically centered on prefix.
- **Don't:** Nested Select backgrounds, two-tone field, floating dial mid-field, off-center hover.

### 2026-11-04 — OTP boxes
- **Sentiment:** strongly negative on several attempts
- **Surface:** OTP
- **Signal:** Rejected stripe, dash groups, and card wrapper; wants plain OTP squares.
- **Do:** **5** separate square OTP boxes, full width, paste-friendly.
- **Don't:** Full-width grey stripe; 6 boxes; mid dash; OTP inside a card block.

### 2026-11-04 — Phone + Send SMS
- **Sentiment:** negative → cleaner after flatten
- **Surface:** phone/SMS
- **Signal:** Patchwork field; put prefix in dropdown; country from IP; Send SMS beside field.
- **Do:** One auth Input; country popover = flag + dial ▾; IP default; primary **Send SMS** same height.
- **Don't:** Nested tones; dial duplicated outside dropdown.

### 2026-11-05 — Design Agent north star
- **Sentiment:** positive direction
- **Surface:** Design Agent / process
- **Signal:** Wants detailed flow (skills, MCPs, human gates) and a handoff pack with full skills + peer-screen tooling.
- **Do:** BRD → skills + research → build → Human#1 → refine → learn → Final sign-off → eng package.
- **Don't:** Invent peer UX without research; skip learning from negative feedback.

### 2026-11-06 — Handoff missing peer-screen tooling
- **Sentiment:** negative on omission
- **Surface:** Design Agent / process
- **Signal:** Handoff pack was missing the peer-screen library skill/MCP.
- **Do:** Always include peer-screen skill + MCP in Cursor/other-agent exports when competitor flows are in scope.
- **Don't:** Ship handoff packs with design-tool only.

### 2026-11-09 — Feedback archive purpose
- **Sentiment:** negative on wrong artifact
- **Surface:** Design Agent / process
- **Signal:** Full chat dumps (and prior-company names) are not useful; need positive/negative design feedback (e.g. sub-nav repeated many times).
- **Do:** Keep this log as the Design Agent context; consolidate repeated corrections into surface Do/Don't tables.
- **Don't:** Store raw multi-session chat or vendor/prior-employer names as “feedback.”

### 2026-11-06 — Unhappy paths are part of the design
- **Sentiment:** negative on omission
- **Surface:** every feature / Figma
- **Signal:** Don't only design happy paths; capture skeleton, logged in/out, failed API calls.
- **Do:** Every prototype and Figma page covers logged in, logged out, loading skeleton, empty, API failure + retry, image failure.
- **Don't:** Hand over happy-path-only screens.

### 2026-11-06 — Figma output
- **Sentiment:** negative
- **Surface:** Figma / handover
- **Signal:** Agent appeared in Figma and left with nothing built; icons were missing.
- **Do:** Build the full page every run; icons from the Lumen icon set; hover/pressed as variants; motion notes beside components. Figma is part of the handover.
- **Don't:** End a Figma run with an empty or half-built page; leave icons out or draw them.

### 2026-11-06 — No lane bar on prototypes
- **Sentiment:** negative
- **Surface:** prototype shell
- **Signal:** Didn't like the "Prototype · design lane" bar above the header.
- **Do:** Prototypes render the real shell only, exactly like the live site.
- **Don't:** Add any bar or chrome above the shell header.

### 2026-11-06 — Text sizes jumped
- **Sentiment:** negative
- **Surface:** banners, casino tiles
- **Signal:** Banner text and tile tags went oversized and overlapping after a token change.
- **Do:** After any typography/token change, screenshot homepage banners and casino tiles (desktop + mobile) before calling it done.
- **Don't:** Ship token changes without checking text sizes on real screens.

### 2026-11-07 — Proposal quality (review comments)
- **Sentiment:** negative (quality control)
- **Surface:** banner cards / homepage
- **Signal:** Too much empty space and content not centred; a card missing its data should show an error; the first-week strip must not sit above the hero.
- **Do:** Centre content when a card has spare height. Missing data = the card's error state with Retry. Feature strips sit in the lobby as blocks, like casino content.
- **Don't:** Large empty areas in cards; half-empty cards when data fails; anything above the hero banner.

### 2026-11-07 — Ideas mocks: simple, compact, polished
- **Sentiment:** mixed (ideas strong, designs not)
- **Surface:** ideas mocks (payout tracker, tournaments)
- **Signal:** Payout tracker takes too much space on desktop and is crowded on mobile; Notify me could be an icon; tournaments composition is messy and peers do it better.
- **Do:** Simple, compact, polished. Size status cards to their content (slim stepper). One primary action on mobile; secondary actions as icon buttons. Study the best peer compositions (peer-screen library + research folder) before designing lobbies, tournaments, leaderboards.
- **Don't:** Full-width tall status cards; rows of text buttons on mobile; busy multi-panel compositions with no focal point.

### 2026-11-08 — Studio UI polish
- **Sentiment:** negative on clutter
- **Surface:** Design Studio (back office)
- **Signal:** Sidebar links looked messy; account menu disorganised; stray hint text by the send button; ideas box misaligned.
- **Do:** Group navigation in the account menu (Ideas, Taste, Skills, Settings, Resources, Notifications); one Resources page; aligned single-row inputs with a button.
- **Don't:** Loose link rows, underlined menu items, truncated helper text.

### 2026-11-09 — Peer benchmark set
- **Sentiment:** positive (direction)
- **Surface:** research / all surfaces
- **Signal:** The peers we like are Rainbet and Winna; Stake is our main influence; for sportsbook we aim to be like Kalshi and Polymarket.
- **Do:** Research these peers first for every BRD (`knowledge/product-strategy/PEERS.md`); translate their patterns into Lumen and cite them.
- **Don't:** Clone their look; benchmark against random operators instead of this set.

### 2026-11-09 — Shared bet links land on the sportsbook
- **Sentiment:** negative
- **Surface:** sportsbook / betslip / shared links
- **Signal:** Rejected a public shared-bet landing page; the friend should land on sports with the bets already in the slip.
- **Do:** Bet deep links open /sports/<sport> with the picks in an open betslip (see `SPORTSBOOK.md`).
- **Don't:** An in-between landing page with a bet card and an Add to betslip button.

### 2026-11-09 — Don't send players to an in-between landing page (e.g. a public shared
- **Sentiment:** negative
- **Surface:** sportsbook · on-sportbook-after-a-bet-we-want-to-be-able-to-s
- **Signal:** “I dont like how a player lands on this screen, they should land on sports with the bets already in the slip”
- **Don’t:** Don't send players to an in-between landing page (e.g. a public shared-bet page with the bet card and an Add to betslip button) when a link is about betting. <!-- rule:4179a534 -->

### 2026-11-09 — Shared or deep links to a bet land on the sportsbook (/sports/<sport>)
- **Sentiment:** positive
- **Surface:** sportsbook · on-sportbook-after-a-bet-we-want-to-be-able-to-s
- **Signal:** “they should land on sports with the bets already in the slip”
- **Do:** Shared or deep links to a bet land on the sportsbook (/sports/<sport>) with the picks already in the betslip and the slip open, ready for a stake; logged-out players hit Join only at Place Bet. <!-- rule:a9a5ef57 -->
