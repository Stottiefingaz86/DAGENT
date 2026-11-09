---
name: Performance KPIs
description: The numbers Product and Design must hit (department KPIs and Design unit metrics). Every spec, proposal, idea and handover maps to one of these. Read with BRIEF.md.
---

# Performance KPIs — the numbers we have to hit

**Source:** Product Management performance sprint (Sept–Dec 2026). Numbers only, no people.
**Use with:** `BRIEF.md` (strategy 2026–2028). The strategy says *where* we're going; these say *what moves this period*.

## How agents use this

1. **Every spec and proposal names the KPI it moves** (Strategy alignment section), with the expected direction and how it will be measured (control group or same-period comparison).
2. **Casino first.** Casino is 70% of the department scorecard. When a BRD could go either way, favour the casino outcome.
3. **Friction removed, never urgency added.** For deposit-to-play work: fewer steps, faster verification, return the player where they came from. No countdown pressure or dark patterns.
4. **Recommendations (Ideas) rank by KPI weight**: an idea that moves a 30% metric beats one that moves a 5% metric, all else equal.
5. **Design handover quality is a KPI:** specs must hold after handoff (every state designed, every interaction unambiguous, every component exists). That's why unhappy paths, states and the dev-questions loop matter.

---

## Department KPIs (40% of every scorecard)

| # | Metric | Direction | Weight | Target | Stretch | Feeds |
|---|---|---|---|---|---|---|
| 1 | Uplift in **casino net revenue per active player** from Product releases, vs control | Higher | **30%** | **+5.0%** | +6.0% | Casino net revenue |
| 2 | Growth in **casino play days per active player** (vs same 4 months last year) | Higher | 15% | **+8.0%** | +9.6% | Casino active player days |
| 3 | Growth in **distinct casino games played per active player** | Higher | 10% | **+8.0%** | +9.6% | Casino active player days |
| 4 | **Median time from first deposit to first casino stake** | Lower | 15% | **12 min** | 10 min | Funding conversion, time to play (baseline not yet provided) |
| 5 | Uplift in **30-day return rate** from Product releases, vs control | Higher | 15% | **+5.0%** (provisional) | +6.0% | 90-day player retention |
| 6 | Growth in **net revenue per active player outside casino** | Higher | 10% | **+5.0%** | +6.0% | Rest of the portfolio (sportsbook, poker…) |
| 7 | **Operating cost removed per month** by shipped product change | Higher | 5% | **$84k** | $167k | Company operating cost |

What they mean for design:
- **#1 Casino value per player:** casino games, screens and journeys we release, measured against a control group. Designs must be releasable to a test group.
- **#2 Come back more often:** stickiness; moves for high-value players who return to a few favourite games (last played, favourites, quick re-entry).
- **#3 Find more:** discovery; moves with new content and better search, lobby and surfacing.
- **#4 Deposit to first stake:** activation into casino. Most delay after a deposit is navigation, not payment: return the player where they were.
- **#5 30-day return:** of players who touch what we release, how many come back within 30 days.
- **#6 Outside casino:** protect sportsbook and the wider portfolio while casino accelerates.
- **#7 Cost:** recurring cost removed by a change that actually shipped.

## Design unit metrics (how Design is measured)

| Metric | Direction | Target | What it means for the agent |
|---|---|---|---|
| **Design specs with no avoidable change after handoff** | Higher | **95%** (weight 30%) | Avoidable = a state nobody designed, an ambiguous interaction, or a component that doesn't exist. Cover every state; flag Lumen gaps before handoff. |
| **Median days from BRD sign-off to design handoff** | Lower | **5 days** (25%) | Move from BRD to signed-off handover fast: ask few questions, decide defaults, don't stall. |
| **Median days blocked awaiting a design decision** | Lower | **1 day** (20%) | Dev questions answered within a day: answer from the handover, escalate only real decisions. |
| **Journeys validated with real players before build** | Higher | **90%** (15%) | A documented session with real players before build. The handover should say how it was (or will be) validated. |
| **Scheduled reporting on cadence** | Higher | **100%** (10%) | Read-back after release: weekly for the first month, twice a month for six months, then monthly to a year. |

Note: the sheet's guidance says percentage targets sit at 78% and validation at 70% so the stretch stays reachable; the table lists 95% and 90%. Treat 95% / 90% as the bar until confirmed.

## Team goals this period (Sept–Dec 2026) that design work feeds

**Design & experience**
- Redesign the **three highest drop-off casino journeys**, each validated with **at least 5 real players** before build, all live by **30 Nov**, lifting conversion on them **+15%** vs the September baseline. → KPI #1
- Ship a redesigned **post-deposit return path** by **31 Oct** so the player lands back where they were, worth **at least 4 of the 12 minutes**. → KPI #4

**Casino**
- **+150 live casino titles** vs September by 30 Nov; **lobby search and personalised surfacing** by 15 Oct, live to 100% of casino players by 30 Nov. → KPIs #2, #3
- **+12% money per active casino player** on surfaces personalised surfacing touches, by 31 Dec. → KPI #1

**Loyalty & rewards**
- A casino-relevant **personalised offer in front of 90% of eligible players every week** from 31 Oct. → KPIs #2, #5
- **Casino-led reactivation journeys** for lapsed players by 15 Oct; **+10% 90-day active retention** by 31 Dec. → KPI #5

**Payments & player operations**
- **Median deposit → first stake: 12 min** by 31 Dec, **removing at least three steps** from the post-deposit path. → KPI #4
- **Two new payment methods** and **automatic retry on failed deposits** by 30 Nov, recovering **15%** of failing deposits. → KPIs #6, #7

**Sportsbook**
- **Sportsbook → casino cross-sell** in the live bet slip and in-play screens by 31 Oct; **25%** of monthly active sportsbook players placing at least one casino stake by 31 Dec. → KPIs #1, #2, #3
- **+12 market types** by 30 Nov and **3 taps or fewer** from selection to bet confirmation by 31 Dec, lifting sportsbook engagement days **+5%**. → KPI #6

**Delivery & data (process the design flow must respect)**
- Every initiative enters build with **tracking defined and signed off** (events, properties, success measure), a **baseline, a target and a control**. The handover's analytics section must make this possible.
- **First readable result within 10 days** of release.
- BRDs with **no avoidable scope change after sign-off: 95%**; BRD signed off within **5 days** of approval; first player-facing release within **31 days** of build start.

## Quick map: surface → KPI

| If the BRD touches… | Name this KPI |
|---|---|
| Casino lobby, search, surfacing, game tiles | #3 distinct games, #2 play days |
| Casino journeys, game pages, launch | #1 casino value per player |
| Cashier, deposit, post-deposit return | #4 deposit → first stake |
| Rewards, VIP, offers, reactivation | #5 30-day return, #2 play days |
| Sportsbook bet slip, in-play, cross-sell | #6 outside casino, #1 (cross-sell) |
| Back-office, automation, support deflection | #7 cost removed |
