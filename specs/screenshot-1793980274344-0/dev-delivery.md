# Casino expanding hover banners — Dev delivery
Status: Final sign-off by Chris on 2026-11-06
Prototype: http://127.0.0.1:3001/prototype/screenshot-1793980274344-0 (hosted: `/prototype/screenshot-1793980274344-0`)   Spec: `specs/screenshot-1793980274344-0/spec.md`   Figma: https://www.figma.com/design/MYeELetKW9xye1shSpm8Fn?node-id=23-157 (all states, components with variants, journeys, motion)
Strategy: Discover · 06 Personalised Casino Discovery (features 27–31) + "rewards in the lobby" (Now phase) · time to first casino bet ~8 min / 8 clicks → < 2 min
Surfaces: Casino lobby & discovery (`/casino` lobby banner row). Rewards & VIP (VIP Progress widget) and Promotions (Daily Race widget) only as cards inside that row. No new surface.

## Summary & scope

The `/casino` lobby banner row becomes an **accordion**. On desktop, one card is open and the rest are narrow strips, so every banner is visible at once. Hover or keyboard focus opens a card and closes the previous one. On mobile it stays a swipe-only rail where every card shows its full info.

Today at 1440 only 2 of 4 promos are visible and the body copy is clipped at 3 lines. After this change every card is visible and the open card shows its full copy plus the CTA.

**In:** casino lobby banner row (logged in: VIP Progress + $25k Daily Race + 4 promos; logged out: 4 promos), desktop accordion, mobile swipe rail, loading / image error / single promo / logged-out states.
**Out:** homepage, promotions lobby and account-desk banner rows (they adopt the same component later), the full-bleed theme banners and jackpot banner lower in the lobby, autoplay or rotation, personalised banner ordering.

## User journey

1. Player lands on `/casino` (header Casino → Lobby). The banner row is the first block under the casino sub-nav.
2. At rest the **first promo** is open (today: Chicken Fire). VIP and Race are collapsed on the left (logged in only).
3. **Desktop, fine pointer:** pointer enters a collapsed card, or Tab focuses it → it opens and the previously open card collapses. When the pointer leaves the row, the last opened card stays open (no snap back).
4. **Desktop, touch (md+ tablet):** first tap on a collapsed card opens it. A tap on an open card runs its action.
5. Click or Enter/Space on an open card, or click its CTA, runs the action:
   - Chicken Fire (Play Now) → launch game (production: `launchGame`, as today in `CasinoLobby`)
   - Halloween Games (See games) → `startNavigating('/casino/category/halloween')` then `router.push`
   - Casino Rakeback (Learn More) → open VIP Hub
   - 100 Welcome Free Spins (Deposit) → open cashier (`setCashierOpen(true)`)
   - VIP Progress → open VIP Hub (`setVipHubOpen(true)`)
   - $25k Daily Race → open VIP Hub on the race (`setVipHubOpen(true, '$25k Daily Race')`)
6. **Mobile (< md / 768px):** horizontal swipe rail. Every card is in its open layout, there is no tap-to-open, and one tap runs the action.

## Screens & states

| Breakpoint | Layout |
|---|---|
| xs 375 · sm 390 | Swipe rail. Cards 288×208 (`w-72 h-52`), gap 12px, left padding 16px, `snap-x snap-mandatory`, cards `snap-start`. Next card peeks. No chevrons. Scrollport `overflow-x-auto` wrapper with inner `w-max` flex row (iOS swipe fix). Scrollbar hidden. |
| md 768 – lg 1440 – 2xl 1920 | One flex row, height 240px (`h-60`), gap 12px, padding-x 24px. Every card `basis-0 min-w-0`. Collapsed `flex-grow: 1`, open `flex-grow: 3.4`. At 1440 logged in (6 cards) the open card is ~490px and collapsed cards ~144px. Logged out (4 cards) the open card is ~690px and the others ~200px. Content max width follows the shell (1440). |

| State | What shows |
|---|---|
| Default (logged in) | VIP (collapsed) · Race (collapsed) · Chicken Fire (open) · Halloween · Casino Rakeback · 100 Free Spins |
| Logged out | Promos only (existing rule: VIP + Race are player widgets and never show logged out). First promo open. |
| Hover / focus card N | Card N open, all others collapsed |
| Loading / skeleton | Same row shape: one wide + five narrow shimmer blocks (`lm-shimmer`, `bg-card`, radius 8px), 240px tall. Mobile: two 288×208 shimmer cards. `aria-busy="true"`, label "Loading banners". |
| Image error | `<img onError>` → hide art, card shows `bg-card` and copy switches to surface tones (tag `bg-foreground text-background`, title `text-foreground`, body `text-muted-foreground`). The CTA still works. |
| Single promo | One card, always open, full row width. Hover does nothing. |
| Launching | After click: overlay `bg-background/55` + 1px backdrop blur + 32px spinner (`Loader2Icon`, `animate-spin`) for 2200ms. Repeat clicks are ignored while it shows. |
| Empty (no promos, logged out) | Row not rendered (no empty card). |

Review links: `?open=vip`, `?open=race`, `?open=<promoId>`, `?state=loading`, `?state=error`, `?state=single`. These are prototype-only query params; don't ship them.

## Components

| Component | Source path (design repo `apps/live-site/`) | Props / variants used | New? |
|---|---|---|---|
| `ExpandingBannerRow` (prototype reference) | `components/lumen/expanding-banner-row-prototype.tsx` | Reference implementation of the row, card, slots and skeleton | Reference: production should fold it into `CasinoLobbyBannerRow` as a `variant="expanding"` prop |
| `CasinoLobbyBannerRow` | `components/lumen/casino-lobby-banners.tsx` | Add `variant?: 'carousel' \| 'expanding'` (default `carousel`, so other rows don't change) | Extend |
| `PromoLobbyBannerItem` data | `lib/lumen/casino-lobby-promos.ts` (`CASINO_LOBBY_PROMO_BANNERS`) | `id, tag, title, body, buttonLabel, imageSrc, imageClassName, bleedScrim` | No |
| `CasinoLobby` | `components/lumen/casino-lobby-page.tsx` | Optional `bannerRow?: ReactNode` (design-lane override; production can just pass the variant) | Extend |
| `VipProgressCrown`, `VipProgressBarFill` | `components/lumen/vip-progress-crown.tsx` | `tone` from ceremony, sizes 32 (collapsed) / 40 (open) | No |
| `useVipLevelUpCeremony` | `lib/lumen/use-vip-level-up-ceremony.ts` | `displayPercent, levelLabel, barTone, crownTone, updatedLabel` | No |
| `SILVER_LEVEL_UP_REWARD` | `lib/lumen/vip-hub.ts` | `amount` (25) for the perk line | No |
| `DAILY_RACE_STATUS`, `DAILY_RACE_LEADERBOARD`, `formatRaceCountdown`, `formatRaceMoney` | `lib/lumen/daily-races.ts` | Position / Wagered / Prize, top 3 rows, live 1s countdown | No |
| `Button` | `components/ui/button.tsx` | default variant, `h-9 px-4 text-sm font-medium`, `tabIndex={-1}` (the card owns focus) | No |
| `ShellIcon` | `components/site/shell-icons.tsx` | `name="external" tone="token"`, 14px | No |
| `useShell` | `components/site/shell-context.tsx` | `loggedIn, setVipHubOpen, setCashierOpen, startNavigating, launchGame` | No |
| `lm-shimmer` | `app/globals.css` | Skeleton | No |

## Tokens

BetOnline brand values (`[data-brand='betonline']` light / `[data-brand='betonline'].dark`, `app/lumen.css`). The lobby ships dark.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--card` | #ffffff | #fafafa0d | Card surface (no art / image error / widgets), skeleton blocks |
| `--border` | #00000014 | #ffffff14 | Card border 1px |
| `--foreground` | #000000de | #ffffffde | Widget titles + values, tag pill bg when art is off, hover border at 15% |
| `--muted-foreground` | #00000099 | #ffffff99 | Labels (Position, Wagered…), perk line, updated stamp, body when art is off |
| `--background` | #f3f4f6 | #1a1a1a | Launch overlay at 55%, tag text when art is off |
| `--primary` / `--primary-foreground` | #ee3536 / #ffffff | #ee3536 / #ffffff | CTA button |
| `--surface-muted-1` | #f9fafb | #fafafa0d | Race stat cells |
| `--surface-muted-2` | #e5e7eb | #ffffff1a | Progress track |
| `--success` | #16a34a | #4ade80 | Race top-3 prize amounts |
| `--ring` | #00000061 | #ffffff61 | Focus-visible ring 2px |
| `--height-h-60` / `--spacing-60` | 240px | 240px | Desktop row height |
| `--height-h-52` / `--width-w-72` | 208px / 288px | same | Mobile card size |
| `--width-w-64` | 256px | same | Promo copy column width (open) |
| `--min-width-min-w-sm` | 384px | same | Open-layer min width (no reflow mid-tween) |
| `--typography-font-size-xxs` | 10px | same | Tag pill, race cell labels |
| `--typography-font-size-xs` | 12px | same | Perk line, top-3 rows, updated stamp, Open VIP Hub |
| `--typography-font-size-sm` | 14px | same | Promo body, widget title (collapsed), CTA, countdown |
| `--typography-font-size-base` | 16px | same | Widget title (open) |
| `--typography-font-size-lg` | 18px | same | Promo title (collapsed), extrabold, line-height 20px |
| `--typography-font-size-2xl` | 24px | same | Promo title (open), VIP %, race position; line-height 28px |

Fixed art values (same in both themes, because they sit on photographic art, as in the existing `PromoLobbyBanner`): tag pill white bg / black text; title white; body white 75%. Scrims: open desktop `linear-gradient(to right, black 80% → black 45% → transparent)`. Open "strong" (100 Free Spins) and all mobile cards `black 35% stop → black 80% at 55% → transparent`. Collapsed `linear-gradient(to bottom, black 80% → black 40% → black 10%)`.
Radius: card 8px (`rounded-lg`), tag pill full, stat cells 6px (`rounded-md`). Font: Figtree (`--typography-font-family-font-family`).

## Motion & interaction

| Element | Trigger | Property | Duration | Easing | Delay | Reduced motion |
|---|---|---|---|---|---|---|
| Card | open / close | `flex-grow` 1 ↔ 3.4 | 300ms | cubic-bezier(0.22,1,0.36,1) | 0 | none (instant) |
| Card | hover | border-color → foreground 15% | 300ms | same | 0 | instant |
| Art | open / close | object-position 70% → right, scale 1.04 → 1 | 300ms | same | 0 | instant |
| Collapsed layer | open | opacity 1 → 0 | 200ms | same | 0 | instant |
| Collapsed layer | close | opacity 0 → 1 | 200ms | same | 75ms | instant |
| Open layer (copy + CTA) | open | opacity 0 → 1 | 200ms | same | 75ms | instant |
| Open layer | close | opacity 1 → 0 | 200ms | same | 0 | instant |
| CTA | press | scale 0.97 | 150ms | default | 0 | keep |
| Launch spinner | click | rotate (`animate-spin`) | until 2200ms | linear | 0 | keep (status) |
| Race countdown | every 1s | text | — | — | — | keep |
| Skeleton | loading | `lm-shimmer` sweep | 2.4s loop | ease-in-out | 0 | off (CSS already handles it) |

The open layer keeps a min width of 384px while the card grows, so copy never re-wraps mid-tween. The card clips with `overflow: hidden`.
Hover never plays sound. No confetti: banners are not a reward moment.

## Hover / focus / active states

- Card hover: border goes to foreground 15%; a collapsed card opens on `mouseenter` (fine pointer only, md+).
- Card focus: `focus-visible` 2px `--ring` ring, and focus also opens the card. Tab order follows the row left → right. The CTA has `tabIndex -1` (the card is the button).
- Card active: Enter/Space runs the action and shows the spinner.
- CTA hover: the existing `Button` default hover. Press: scale 0.97.
- Mobile: no hover states. Native swipe, no edge chevrons on touch (hard rule).

## Copy (exact)

Promos (from `CASINO_LOBBY_PROMO_BANNERS`; CMS-driven in production):
- Tag `Game of the Week` · Title `Chicken Fire` · Body `Chicken Fire keeps everything packed tight. Fruits sit on a bright 3×3 grid.` · CTA `Play Now`
- Tag `Promo` · Title `Halloween Games` · Body `Play a selection of halloween games` · CTA `See games`
- Tag `VIP` · Title `Casino Rakeback` · Body `All VIP levels. No catch. Just cash.` · CTA `Learn More`
- Tag `Promo` · Title `100 Welcome Free Spins` · Body `Get rewarded with 100 Free Spins when you make your first deposit.` · CTA `Deposit`

VIP card: `VIP Progress` · `Open VIP Hub` · level label from ceremony (e.g. `Bronze to Silver`) · perk line `Weekly Boost + $25 Level Up Bonus` (Bronze → Silver; `$25` = `SILVER_LEVEL_UP_REWARD.amount`; other tiers `Open VIP Hub for your next rewards`) · `{n}%` · updated stamp from ceremony (e.g. `Not started yet`).
Race card: `$25k Daily Race` · countdown `HH : MM : SS` · cells `3rd` / `Position`, `$80.000` / `Wagered`, `$160.000` / `Current Prize` · top 3 rows: rank, player name or `Hidden` when privacy-hidden, prize via `formatRaceMoney` (e.g. `$4,000.00`).
Accessible labels: `{title} — {buttonLabel}` (promos), `VIP Progress — Open VIP Hub`, `Open $25k Daily Race in VIP Hub`, `Loading banners`, progress bar `VIP tier progress`.
A collapsed tag that doesn't fit truncates with an ellipsis (e.g. `Game of the…`). Collapsed titles clamp to 3 lines and open body to 4 lines.

## Sound

None.

## Data & state dependencies

- `useShell().loggedIn` gates VIP + Race.
- VIP: `useVipLevelUpCeremony()` (percent, tier label, tones, updated label). Perk line uses the tier's unlocks (`VIP_SILVER_UNLOCKED_LABELS`, `SILVER_LEVEL_UP_REWARD` in `vip-hub.ts`).
- Race: `DAILY_RACE_STATUS` + `DAILY_RACE_LEADERBOARD` (top 3). Countdown ticks every 1s and resets at 0.
- Promos: banner CMS feed with the `PromoLobbyBannerItem` shape. Art is the existing `/banners/*.jpg`.
- Open card id is local UI state (not persisted). Default = first promo id.

## Analytics

- `lobby_banner_expand` { banner_id, position, method: hover|focus|tap, logged_in } — fires once per open (not on the default open card).
- `lobby_banner_click` { banner_id, position, was_expanded, method: card|cta|key } — existing CTA event, add `was_expanded`.
- `lobby_banner_impression` { banner_ids_visible[] } on row view. All should be visible at ≥ 1200px.
- Needle read: banner click → first casino bet time (time-to-first-casino-bet, target < 2 min) and lobby banner CTR vs the carousel baseline.

## Accessibility

- Each card is `role="button"`, `tabIndex 0`, with `aria-expanded` on desktop and `aria-busy` while launching. The hidden layer is `aria-hidden` and non-interactive.
- Focus opens the card, so keyboard users get the same info as hover.
- Contrast: white copy on art always sits on a ≥ 45% black scrim. On image error, copy switches to surface tokens (foreground on card).
- Touch targets: whole card (≥ 144×240 desktop, 288×208 mobile). CTA 36px tall.
- `prefers-reduced-motion: reduce` → no width/opacity tweens and no shimmer sweep.

## Acceptance criteria

1. At 1440 logged in, all 6 cards (VIP, Race, 4 promos) are visible in one row without horizontal scroll or chevrons, and the row is 240px tall.
2. On load the first promo is open and shows tag, title, full body (no ellipsis for the 4 current promos) and CTA.
3. Hovering a collapsed card opens it in 300ms with cubic-bezier(0.22,1,0.36,1) and closes the previous one. Exactly one card is open at any time.
4. When the pointer leaves the row, the last opened card stays open.
5. Tab moves through cards left to right, each focused card opens, a 2px ring shows, and Enter/Space runs its action.
6. Open VIP shows level label, perk line, %, progress bar, updated stamp and `Open VIP Hub`. Open Race shows countdown, 3 stat cells and the top 3 with green prizes.
7. Clicking an open card or its CTA runs the existing action and shows the 2200ms launch spinner. Repeat clicks during the spinner do nothing.
8. Logged out: VIP and Race don't render and the first promo is open.
9. Below 768px: swipe-only rail of 288×208 cards in open layout, no chevrons, vertical page scroll still works when a swipe starts on the rail.
10. Broken image URL: the card shows the plain card surface with readable surface-token copy and a working CTA.
11. Loading shows a row-shaped shimmer (1 wide + narrow blocks desktop, 2 cards mobile), then real cards with no layout shift (same 240px height).
12. With reduced motion, cards switch instantly with no tweens.
13. No raw hex outside the fixed art values listed above. All colours come from the tokens table.
14. No sound or confetti on any banner interaction.

## Known gaps / component briefs raised

- None blocking. The accordion is a behaviour on the existing banner row (no new Lumen primitive).
- Perk line for tiers above Silver needs tier-unlock data. The prototype falls back to `Open VIP Hub for your next rewards`.
- Single-promo state upscales art to full row width. Marketing should supply a ≥ 1440px-wide asset when only one banner runs.
- Figma: page "Casino expanding hover banners" in the Design Agent file — 15 frames (happy + unhappy, 1440 + 390), banner components with variants and Lumen icons, journeys and motion notes.
