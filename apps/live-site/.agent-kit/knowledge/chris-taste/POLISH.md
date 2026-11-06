# Polish — celebration, sound, glass, motion

**Source:** Chris, Nov 2026 — "we like confetti on claiming and celebration with sound, how sub navs are displayed with slight glass, everything is refined and polished." Recipes below are read from the live site (`apps/live-site`), not invented. Reuse them; never start a new celebration, sound or glass language.

The bar: every interaction feels finished. Rewards feel like a moment. Chrome stays quiet. Nothing is decorative for its own sake.

## 1. Claim = a moment (confetti + sound + toast + balance roll)

Any time the player **gets something** (cash claim, rakeback, mission, free spins, spin win, level-up), it celebrates. Route it through the shell — never a one-off.

- **Entry point:** `useShell()` → `claimVipReward(id, button)` / `claimMissionReward(amount, button)` → `runCashClaimCelebration` in `components/site/shell-context.tsx`. Pass the **clicked button** so confetti bursts from it.
- **The beat (keep these timings):**
  1. Button goes to claiming state — `CLAIM_PRELOAD_MS = 1400`
  2. `celebrateVipClaim(button)` (`lib/lumen/vip-celebrate.ts`) → **redeem sound** (`/sound/redeem.mp3`, vol 0.85) + **confetti from the button**
  3. Toast after `CLAIM_TOAST_AFTER_CELEBRATE_MS = 1100` → `VipClaimToast` (`components/lumen/vip-claim-toast.tsx`, own host with a draining timer bar `vip-claim-toast-timer`) — not a second Sonner toast
  4. Balance rolls up with **NumberFlow** in the header (`shell-ubc.tsx`) at `BALANCE_ROLL_MS = 3000`
  5. VIP crown does `vip-crown-wobble` (0.55s × 2) when there's something claimable
- **Confetti recipe (`fireVipConfetti`):** main burst 64 particles, velocity 36, spread 68, gravity 0.95, squares + circles, colours `--primary` + white + warm golds (`#fef3c7 #fde68a #fbbf24`) + soft red; then 100ms later two side bursts (28 each, angles 60° / 120°, ±0.12 from origin). `disableForReducedMotion: true`. Origin clamped inside the viewport (x 0.08–0.92, y 0.12–0.85).
- **Big wins (jackpot / wheel):** layered `fireConfetti` bursts (`lib/confetti.ts`, canvas above drawers) + the jackpot sound set. Reserve for genuinely big moments — a normal claim never gets jackpot treatment.
- **Scale it to the moment:** small/expected (favourite saved, settings saved) = Sonner toast only, no confetti, no sound. Real reward = full beat. Big win = jackpot layer.
- Success screens use the join success glyph (filled `bg-primary` disc, white check, spring in) — see `CONFIRMATION_STATES.md`.

## 2. Sound — short, soft, earned

- Files live in `public/sound/`; play them through `playSound(name, { volume })` in `lib/sounds.ts` (cached, rewinds, swallows autoplay blocks). Names: `redeem`, `button-click`, `spin`, `spin-now`, `highlight`, `highlight-2`, `jackpot-*`, `final-selection-win`.
- Sound only on **rewards, wins and reveal moments** (claim, spin, jackpot, inbox pop). Never on navigation, hovers, tabs or ordinary buttons.
- Volumes sit under 1: claim 0.85, wins ~0.9, transitions ~0.5, roll-up numbers 0.5 with a 420ms fade after ~1s. Long clips are trimmed + faded, never cut.
- Soft UI cues (e.g. messenger pop) are generated with Web Audio (two quiet sine tones) rather than new assets.
- Sound must never block or break the UI — always fire-and-forget inside try/catch.

## 3. Glass — slight, on chrome only

- **Sub-nav bar:** `[data-name='sub-menu'][data-glass='true']` → `background: color-mix(in srgb, var(--container) 72%, transparent)` + `backdrop-filter: blur(24px) saturate(1.2)` (dark: `--header-inverted` at 72%). Content must visibly blur through as it scrolls under. Don't strip `glass`, don't make it opaque.
- **Pill track + thumb:** track `h-12 rounded-full bg-[var(--surface-muted-5)] p-0.5`; active thumb slides with `transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`. Inactive pills `text-muted-foreground`, hover `bg-[var(--surface-muted-3)]`.
- **Desktop edge chevrons:** glass chips `border-border/60 bg-background/55 backdrop-blur-md`, only when the track is clipped and only on `(hover: hover) and (pointer: fine)`. Never on mobile.
- **Auth modal:** frost glass, page reads through — `color-mix(var(--background) 38%)` + `blur(28px) saturate(1.25)`.
- Glass is for **floating chrome** (sub-nav, sticky chrome, modals, edge arrows). Content cards stay solid (`bg-card` recipe). No glass panels in page content.

## 4. Motion — one family

- **Ease:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) is the house curve — CSS and framer (`ease: [0.22, 1, 0.36, 1]`). Standard UI fallback `[0.4, 0, 0.2, 1]`.
- **Durations:** micro 180–250ms, standard 300–350ms, reveals ≤ 500ms. Anything longer is a deliberate moment (jackpot, roll-up).
- **Springs (framer-motion):** panels/sheets `stiffness 260, damping 28, mass 0.85`; snappy pops `stiffness 420, damping 28`; success glyph a bouncier `stiffness 400, damping 16`.
- **Press/hover:** buttons `active:scale-[0.97]` (small icons `active:scale-95`); tiles lift `whileHover={{ scale: 1.02, y: -4 }}`. Colour hovers `transition-colors duration-200`.
- **Numbers that change animate:** balance, progress %, jackpots, counts → `@number-flow/react`. Never snap a money value.
- **Loading:** skeleton/shimmer shaped like the destination (`tile-shimmer`, `lm-shimmer`), `TileSpinner` on the tapped tile before soft-nav. No blank flashes, no generic spinners in the middle of a page.
- **Reduced motion:** every new animation respects it (`useReducedMotion` / `@media (prefers-reduced-motion: reduce)`; confetti `disableForReducedMotion`). Sound is not motion — keep it.

## 5. Refined = restraint

- Shapes: `rounded-full` pills/avatars/chips, `rounded-lg` buttons and sheet close, `rounded-[10px]` content cards.
- Tokens only (`--primary`, `--surface-muted-*`, `--border`, `*-inverted` in the header). The few raw hex values in the site (e.g. sub-nav thumb `#ee3536`) are legacy — new work uses `var(--primary)`.
- When choosing between "more" and "less", choose less. Celebration lives in the moment of reward, not in permanent decoration.

## Never

- A claim with no celebration, or a celebration built from scratch (own confetti call, own toast, new sound file) instead of the shell beat.
- Confetti or sound on ordinary actions (save, copy, navigate, filter).
- Opaque sub-navs, heavy blur (> 32px), glass on content cards, glass chevrons on mobile.
- Linear easing, bouncy springs on chrome, animations over ~500ms outside a reward moment, snapping balances.
