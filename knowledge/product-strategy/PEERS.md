---
name: Peer benchmark
description: The growing set of peers we benchmark against, by area (casino, rewards, sportsbook…), with what we borrow and avoid. Read before any research step.
---

# Peer benchmark — who we learn from, and what

**Started Nov 2026. This list grows.** New peers are added as research expands (for example a sportsbook leader for sports, or a specialist crypto casino for one feature). Peers can be benchmarked for the whole product or for a single piece.

**Adding a peer:** add a row to the table below, then a section with the same shape (What we like · Product facts with a confidence label · Borrow · Avoid · sources). New captures go in the research Figma folder; the watcher picks them up and logs them in `knowledge/research/CHANGELOG.md`.

| Area | Peers | Role |
|---|---|---|
| Casino, rewards, community | **Rainbet**, **Winna** | Patterns we like and have already studied (see `COMPETITOR_RESEARCH.md`) |
| Whole product | **Stake** | Our main influence: the benchmark for polish, density and scale |
| Sportsbook | **Kalshi**, **Polymarket** | Where we're aiming: sports as simple, market-style trading |
| *(next)* | *added as research expands* | *whole product or a single piece* |

**How agents use this file**
1. Check our live site first (`capture_site`). We may already have the thing (e.g. Originals).
2. Look at how these peers solve it: this file, the research Figma folder, `competitors/` screenshots, Mobbin when connected.
3. **Translate into Lumen. Never clone** a peer's look, art, colours, gems, mascots or copy.
4. Cite the peer pattern in the proposal ("Pattern: Winna Bonus Center tabs → our VIP Hub rewards").

Confidence labels: **Verified** = seen in our own captures or audits · **Reported** = from independent reviews (dates below) · **Check** = needs a fresh capture before relying on it.

---

## Rainbet — casino, rewards, live wins

**What we like (Verified, our captures + journey audits)**
- **Live Wins** activity carousel on the homepage: social proof that the site is alive. → `LIVE_WINS_CAROUSEL.md`
- **Left nav with reward widgets** and a **header gift** that opens a list of claimable rewards.

**Product facts (Reported, casino.org review, 2026)**
- Rewards stack: **rakeback** (incl. a first-hour rakeback boost), **daily / weekly / monthly races** on amount wagered, **challenges** (first to hit a multiplier on a named game wins cash), a **weekly raffle** with tickets earned by play, and a VIP programme with daily bonuses.
- Originals (crash-style Chicken Cross with risk settings, Plinko, Dice, Keno…) plus a **Provably Fair** page; **Fun Mode** demo play on most slots.
- Lobby: favourites, recently played, new releases, **Random Game** button, provider filter, sort by popularity/date.
- Social / Google login; quick registration. Mobile web, no native app.

**Borrow** · one place that lists everything claimable · races + challenges as always-on reasons to come back · random-game shortcut (we have Play Random in the dock).
**Avoid** · reviewers find the homepage wins feed distracting when it's loud: keep ours calm (shelf, play/pause, see `LIVE_WINS_CAROUSEL.md`).

## Winna — bonus center, VIP, challenges

**What we like (Verified, our captures)**
- **Bonus Center** modal with tabs; **Promotions** header dropdown (races + challenges); **Challenges grid** next to a social chat sidebar.

**Product facts (Reported, CryptoSlate review, 2026)**
- **Instant rakeback** credited every few minutes at every tier; reloads and lossback from Platinum.
- **VIP: 30 levels in 6 tiers** (Bronze → Nebula) by amount wagered; level-up **prize spin**; personal host from Platinum; **status match** from another casino.
- **Daily ($10k) and Weekly ($50k) races**, automatic entry, points weighted by game type; challenges with no opt-in.
- 16 provably fair Originals with an on-site verification tool.
- Casino and sportsbook on **one account and wallet**; live odds on 30+ sports; monthly free bet from Gold.
- Lobby shelves: Slots, Live Casino, Table Games, Game Shows, New, Originals; search, sort, provider filter.

**Borrow** · rewards gathered in one Bonus Center with tabs · automatic entry (no opt-in friction) · visible level-up moment (we celebrate with confetti + sound, `POLISH.md`).
**Avoid** · gem/space theming and purple chrome (peer brand) · 30 levels shown at once: show the next step, not the whole ladder.

## Stake — our main influence

**What we take from Stake** · confident density without clutter · one wallet across casino and sports · rewards that feel like a system (races, raffles, challenges, VIP) rather than one-off promos · trust signals inside the product (Provably Fair, per-game stats).

**Product facts (Reported, BitDegree review, 2026)**
- Tiered VIP with **rakeback**, weekly and monthly bonuses and level-up rewards.
- **Daily race** with a $100k pool paying the top 5,000; **weekly raffle** ($75k, a ticket per $1,000 wagered, winners drawn live); monthly single-game challenges; no classic welcome bonus.
- **Originals** with a per-round Fairness check; **Enhanced RTP** section; Fun Play; **live stats per game** (RTP, limits, recent activity).
- Sportsbook on the same wallet, incl. esports (CS2, Dota 2, LoL, Valorant).
- Trending games on home, side menu by category, wallet in the header. iOS app; Android via mobile web / PWA.

**Check** · Stake's 2026 navigation changes are only reported by low-quality sources: capture the live site before using them as evidence.

---

## Sportsbook direction: Kalshi and Polymarket

**Why them:** both turn sports into simple yes/no markets with prices that read as probabilities, and both grew fast in 2025–26. That's the direction for our sportsbook: clearer, calmer, more "trading" than "betting slip".

**Facts (Reported)**
- **Kalshi Combos** (parlay-style contracts): beta Sept 2025 on mobile with NFL, full launch about three months later adding NBA; over **$100M volume in its first week** at full launch (Rotogrinders). SportsGrid (May 2026) reports parlays at about **20% of Kalshi's trading activity**.
- Kalshi offers spreads, props and combos; Super Bowl LX winner market traded **$180M+** by Feb 7, 2026 (Front Office Sports).
- **Polymarket US app** launched Dec 3, 2025 (CFTC green light), **starting with sports**; iOS first (Finance Magnates). Super Bowl LX winner market **$699M+** by Feb 7, 2026. Multi-leg sports contracts reported as coming (SportsGrid, May 2026).

**UI patterns to translate (Avark, May 2026 · our read)**
| Pattern | Who | For us |
|---|---|---|
| Market cards: event, probability, one action | Polymarket feed | Match cards in the sportsbook lobby: teams, implied chance, one tap to add |
| Price as probability (72¢ ≈ 72%) | Kalshi / Polymarket | Show implied probability next to odds as an option (helps new users read odds) |
| Plain Yes / No buy with the payout spelled out | both | Bet slip states "Stake $10 → returns $X" in one line |
| Simple probability line for casual users; order book / depth only for pros | Polymarket vs Kalshi | Default to a clean odds-movement line; keep advanced detail behind a tap |
| One-thumb ticket: amount + confirm reachable on mobile | guide | Bottom-sheet bet slip with presets, thumb-zone confirm |
| Price changes animate (200–300 ms) with an "updated" time | guide | Odds tick animation using Lumen motion tokens; "updated 3s ago" |
| Combos as a first-class product | Kalshi | Same-game combos with a correlated-price explanation |
| Trust/regulation shown in product | Kalshi | Licensing + responsible-gaming links visible at first bet |

**Our edge** · Avark notes none of the prediction markets have built an engagement layer (streaks, celebrations). We have one: confetti + sound on wins/claims, VIP progress, races. Bring it to sports carefully: celebrate settled wins, never nag.

**Avoid** · copying exchange complexity into the default view · crypto-wallet jargon · their visual identity.

---

## Gaps (what would make this sharper)

- **Mobbin is not connected** (needs a paid Pro/Team plan), so there are no fresh peer screen captures in this pass. Once connected, the agent pulls current screens for each pattern above.
- **Fresh captures** of Stake, Kalshi and Polymarket (web + mobile) belong in the research Figma folder. A scheduled browser research agent is on the roadmap (`docs/ROADMAP.md`).
- Sources are independent reviews and trade press, not the brands' own docs. Re-check facts marked Reported before quoting numbers in a business case.

## Sources

- Rainbet review, casino.org (2026): https://www.casino.org/canada/reviews/rainbet/
- Winna casino review, CryptoSlate: https://cryptoslate.com/crypto-casinos/winna-casino-review/
- Stake casino review, BitDegree: https://www.bitdegree.org/crypto/stake-casino-review
- Prediction market design patterns, Avark (May 12, 2026): https://avark.agency/learn/prediction-market-design-patterns
- Kalshi fully launches Combos, Rotogrinders: https://rotogrinders.com/articles/kalshi-fully-launches-combos-feature-for-parlay-style-prediction-markets-4177461
- Polymarket rolls out US app, Finance Magnates (Dec 2025): https://www.financemagnates.com/forex/polymarket-rolls-out-us-mobile-app-after-cftc-green-light-starting-with-sports-events/
- Prediction market Super Bowl, Front Office Sports (Feb 2026): https://frontofficesports.com/welcome-to-the-prediction-market-super-bowl/
- Polymarket multi-leg contracts, SportsGrid (May 2026): https://www.sportsgrid.com/general/video/polymarket-launches-innovative-multi-leg-contracts-for-sports-betting
