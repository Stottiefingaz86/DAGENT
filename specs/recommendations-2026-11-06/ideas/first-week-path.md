# Idea: First-week path

**Status:** recommendation (draft mock), 2026-11-06
**Mock:** `/prototype/idea-first-week-path` · source `apps/live-site/app/prototype/idea-first-week-path/page.tsx`
**Screens:** `refs/idea-first-week-path-1440.png`, `refs/idea-first-week-path-390-390.png`

## Gap

- **New players have no plan for days 2–7.**
  - After join we run welcome → cashier Activate, and Daily Spin on later logins.
  - Missions exist (`components/lumen/missions-panel.tsx`, `lib/lumen/missions.ts`), but they are a generic list inside the VIP Hub sheet. They are not time-boxed, not ordered and not shown where a new player lands.
  - The only onboarding ladder is the Journey-3 account-levels panel (`account-progress-panel.tsx`), and it is about profile fields, not play.
- **Peers create a reason to come back every day:**
  - Rainbet ties claiming the Daily Bonus to a timed 10% rakeback boost; the team noted it "connects reward claiming with immediate re-engagement." [Reward Economics 82:612](https://www.figma.com/design/Jh2lavvDqyBtpYrdwQ70RM?node-id=82-612)
  - Whale shows daily cashback in the lobby with a countdown to the next cycle. [28:258](https://www.figma.com/design/Jh2lavvDqyBtpYrdwQ70RM?node-id=28-258)
  - Rainbet surfaces missions in-game. [28:37](https://www.figma.com/design/Jh2lavvDqyBtpYrdwQ70RM?node-id=28-37)
  - The team's open hypothesis is that more frequent, smaller rewards beat big promos at the same cost.
- **Only some peers prompt the first deposit early.** Stake and Whale prompt it before friction. [Competitor Benchmarking 70:4277](https://www.figma.com/design/tUaL195Qe7Ie8kuWmxL8Bi?node-id=70-4277)
- **Mobbin:** blocked (paid plan required).

## Strategy

- **Bet:** 01 Activate ("win first casino bet, then first 7 days"), with 02 Reward ("frequency beats size; expiry creates return").
- **Initiatives and features:**
  - 01 Frictionless Join & Welcome: #6 Post-Sign-Up Welcome Moment, #15 Instant Welcome Free Spins.
  - 04 Always-On Mechanics: #18 Missions System.
  - 05 Retention: #25 Behavioural Reward Messages.
- **Phasing:** BRIEF "Now" lists a **starter checklist**.
- **Needle:** week-one retention of fast starters, 50% drop-off → **65% retained**.
  - Day 1's step is "Place your first casino bet", which also pushes **time to first casino bet** (~8 min → <2 min).

## Business case

| | Estimate | Assumption behind it |
|---|---|---|
| Week-one retention | +3 to +6 pts on fast starters (about a fifth to two-fifths of the 15-pt goal) | A daily, expiring step with a visible reward brings a share of day-2 to day-4 leavers back. Range taken from the team's frequency hypothesis; **must be proven with a holdout (#49)**, not assumed. |
| Reward cost | ≤ $35 cash + 50 spins per player who finishes the week | Every step is wager-gated. We assume 20–30% finish all 7 days and most stop at day 2–4, so blended cost is roughly $8–12 per new player. |
| Time to first casino bet | Supports the <2 min goal | Day 1 points straight at one game with one CTA (Play), which removes the lobby search step. |

- **Effort: M.**
  - The UI is composed from the Missions card pieces and the existing claim beat (`claimMissionReward` → confetti, sound, toast, NumberFlow).
  - The MVP can run a fixed 7-step script on the existing missions model.
  - Making it personal later needs journey state (#47) and the rules engine (#46).
- **Risk:**
  - Bonus abuse: wager gates, one path per player, KYC level before cash steps.
  - Homepage noise: show it only for days 1–7, collapse it once today's step is claimed, and remove it after day 7.
  - Players who miss a day: the path pauses rather than resets. **Product decision.**
- **Measure:**
  - D2 / D4 / D7 return rate vs holdout (primary).
  - Steps completed.
  - Day-1 time to first casino bet.
  - Blended reward cost per retained player.

## Scope

- **MVP:**
  - The module at the top of the logged-in homepage for new players (as mocked).
  - 7 fixed steps, today's step live, later days locked with their reward visible, plus a countdown to the end of today.
  - Claims run the shell beat.
  - The same steps appear as a "First week" tab in VIP Hub → Missions, so there is one source of truth.
- **Later:**
  - Steps chosen per persona (sports-first players get "Try a casino game at half-time", #31).
  - An in-game step chip.
  - A push or email nudge before the day expires (#25).
- **Surfaces:** Casino lobby & discovery (homepage), Rewards & VIP (VIP Hub › Missions), Join (post-welcome hand-off).
- **Lumen reused:**
  - `HomepageLobby` and the game art from the Originals catalog.
  - `Button`, the card recipe and the mission progress bar pattern.
  - `formatRaceCountdown`.
  - `useShell().launchGame` and `claimMissionReward`.
- **Lumen gaps:** none for the MVP. The day strip uses swipe on touch with no edge chevrons (MOBILE_CAROUSELS.md). It shares the composed Stepper idea with the payout tracker.

## States to design if picked

- Day 1 before deposit (step = "Fund your account")
- Today in progress
- Today claimable (full claim beat)
- Today claimed (collapsed)
- Missed day
- Path complete (day 7 celebration)
- Logged out (hidden; join banner instead)
