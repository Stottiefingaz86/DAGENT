# Idea: Casino Tournaments

**Status:** recommendation (draft mock), 2026-11-06
**Mock:** `/prototype/idea-casino-tournaments` · source `apps/live-site/app/prototype/idea-casino-tournaments/page.tsx`
**Screens:** `refs/idea-casino-tournaments-1440.png`, `refs/idea-casino-tournaments-390-390.png` · today: `refs/today-casino.png`, `refs/today-races.png`

## Gap

- **The nav promises Tournaments and dead-ends.**
  - The casino sidebar lists **Tournaments**, but it links to `/casino` (`components/site/shell-nav.ts`, line ~377).
  - Game tiles can carry a `Tournament` tag (`lib/lumen/casino-lobby-catalog.ts`), but there is no place to join, rank or see a prize.
- **What we have today:** one competitive mechanic, the $25k Daily Race (`/promotions/races`). It is wager-volume based, so whoever bets most wins. Small players see a ladder they can't climb.
- **Peers, from the research Figma folder (new this week):**
  - In the tournament benchmark, 85% of peers put a tournament banner or card in the lobby header and 60% have a sidebar section. Cards lead with prize pool, timer, min bet and status. [Competitor Benchmarking 163:1711](https://www.figma.com/design/tUaL195Qe7Ie8kuWmxL8Bi?node-id=163-1711), [163:1631](https://www.figma.com/design/tUaL195Qe7Ie8kuWmxL8Bi?node-id=163-1631)
  - The team's Casino Tournaments research compares today's BOL tourney landing (a plain card grid) with a new "Cash Tournaments" lobby carousel. It recommends real-time updates, a seamless join and thumb-friendly CTAs. [Casino Tournaments UI Research 136:5351](https://www.figma.com/design/LttPy3eTdWV2ffBcTI2NB3?node-id=136-5351)
  - Whale prompts tournament joins inside the game (prize, time left, Join). [Reward Economics 27:117](https://www.figma.com/design/Jh2lavvDqyBtpYrdwQ70RM?node-id=27-117)
  - Rainbet shows "amount needed to reach the leaderboard". [84:658](https://www.figma.com/design/Jh2lavvDqyBtpYrdwQ70RM?node-id=84-658)
- **Mobbin:** blocked (paid plan required).

## Strategy

- **Bet:** 02 Reward ("make it rain": claim moments in minutes or hours, not weeks), with the Discover enabler.
- **Initiative:** 04 Always-On Reward Mechanics, #19 Race/Mission/Jackpot Side Rail and #20 Always-Something-Happening Widget.
- **Corporate priority:** "Casino Discovery & Engagement" is already in flight.
- **Needles:**
  - Primary: **casino churn window**, ~30 → 60 days.
  - Secondary: reward moments per day.

## Why tournaments and not more races

- Skill or luck formats (best multiplier, longest streak, points in 60 minutes) let a $0.20 player win. Races reward volume only.
- Short events (1–9 h) create the "every few hours" heartbeat the BRIEF asks for.
- Each event is tied to one game, so it also routes discovery (Originals first).

## Business case

| | Estimate | Assumption behind it |
|---|---|---|
| Participation | 8–12% of weekly active casino players join one or more events a week | Peer pattern plus lobby placement (85% of peers). Our Daily Race participation is the baseline to beat. **Pull it before committing.** |
| Churn window | Joiners' 30-day casino retention +5–10 pts vs matched non-joiners | Short recurring events with a visible rank give a return reason within hours. Validate with a holdout (#49). |
| Prize cost | Funded from the existing promo budget (move a share of the Daily Race pot into shorter events) | Same cost envelope; more winners, smaller prizes ("frequency beats size"). |

- **Effort: M to L.**
  - MVP on Originals only is M: we own the round data, so scoring by multiplier or streak is in-house.
  - Third-party slots is L: it needs provider tournament APIs or round feeds, plus a prize-ops back office.
- **Risk:**
  - Empty leaderboards look dead. Show an event only above a minimum number of players, and lead with the prize and timer.
  - Regulatory and terms copy differs per format.
  - It could cannibalise the Daily Race. Keep the race as the volume event and make tournaments the skill and short events.
- **Measure:**
  - Weekly participation rate.
  - Sessions per week, joiners vs non-joiners.
  - 30- and 60-day casino retention (primary).
  - Events joined from the lobby card vs the nav.
  - Prize cost per retained player.

## Scope

- **MVP:**
  - `/casino/tournaments` page (as mocked):
    - Live / Upcoming / Finished tabs.
    - A featured event with prize pool, countdown, your rank and best score, a mini leaderboard with a "you" row and the gap to top 10, and a Play CTA through the shell launcher.
    - Cards for the other events, each with pot, timer, min bet and Join & Play.
  - Fix the sidebar link.
  - One lobby card or row on `/casino` (the peer norm).
  - Prize payout through the existing claim beat.
- **Later:**
  - Join prompt and rank chip inside the game launcher.
  - A rewards-in-chrome sidebar module (COMPETITOR_RESEARCH #2).
  - Third-party slot events.
  - Finished-event recap with a shareable result.
- **Surfaces:**
  - Casino lobby & discovery (`/casino`, new `/casino/tournaments`).
  - Promotions, races and missions (shares the race leaderboard recipe).
  - Game launch & in-game (later).
  - Shell & navigation (sidebar link).
- **Lumen reused:**
  - `ShellFrame`, `Typography`, `Button` (default, secondary, sm).
  - Tab underline pattern from `MissionsPanel`.
  - Leaderboard row recipe from `DailyRacesPanel` (whisper row hover, you-row).
  - Countdown via `formatRaceCountdown`.
  - Originals art from the catalog.
  - `useShell().launchGame`.
- **Lumen gaps:** none for the MVP. If it is picked, extract a shared `Leaderboard` component from `daily-races-panel.tsx` rather than keeping two copies.

## States to design if picked

- Upcoming (with reminder)
- Live, not joined
- Live, joined (rank moving)
- Ending soon (last 10 min)
- Finished and won (claim beat)
- Finished, no prize
- Empty tab
- Loading skeleton
- Logged out (Join to play)
