# PROJECT_STATE — read this first

Hand-off from Chris's previous Claude account (17 Nov 2026). The chat history did not move to this account, so this file holds everything needed to carry on. Read it fully before doing any work, then read `CLAUDE.md`.

---

## 1. Who you're working with

- **Chris (CH)**, Head of Design at BetOnline (iGaming: sportsbook, casino, poker, rewards, cashier, account). Leads 6 designers. Signs off all design.
- Frontend/design-engineering background. Comfortable with JavaScript, frontend tooling and REST APIs. Used to Cursor, newer to Claude.
- Prefers short, plain answers. Wants things done, not offered.

## 2. Standing rules (never break these)

**Design**
1. **Lumen only.** Use only Lumen tokens and components. No raw hex, no parallel primitives, never make things up. Ignore all MUI libraries.
2. **Record every piece of design feedback** in `knowledge/chris-taste/FEEDBACK_LOG.md` and learn from it. Don't name vendors or previous employers in the log.
3. **Figma must match prod exactly, in situ.** Show the whole prod page (header, glass sub-nav, tiles, boards, Live Wins, SEO, footer), not pieces. Check every screen in **Light and Dark** against prod.
   - The **betslip is always dark** (prod root has `class="dark"`).
   - The **sub-nav follows the page mode**: light glass is `--container` @72%, dark is `--header-inverted` @72%.
   - The header bar and the footer are always dark.
4. **Every Figma handover has a ★ Feature focus frame** right after the Read me. It covers only what is new or updated: numbered anatomy with tokens and NEW/UPDATED tags, before → after, all states, and placement redlines.
5. **Every handover carries three links together:** prod reference, Figma page, repo handover folder.
6. **Mobbin is for journey inspiration only.** Never copy layouts; they don't fit iGaming. Mobbin has no iGaming apps (bet365 etc. aren't in it). The plan is paid.
7. Mobile carousels: **swipe only**, never edge chevrons on touch.

**Figma**
8. Only write to the **Design Agent** file (below). Never edit other existing Figma files or folders. Use only the Lumen library.

**Git and secrets**
9. **Never commit, push or deploy unless Chris asks.** `main` is production; never force-push.
10. Never put secrets in git: `.env`, `.env.keys`, and the `apps/studio/.studio-*` files.
11. Never use a token Chris pastes in chat; tell him to revoke it.
12. The **DesignAgent repo must not contain the word "BetOnline"** (text, file or folder names). Logos are fine. Use "Brand" / `example.com`. Keep repos private.
13. No real people's names in demos, decks or the KPIs skill (use CH, Lilly, Sam, NEK, Victor, Mai). No brand names in benchmarks.

## 3. Where things live

| What | Where |
|---|---|
| Main working repo (this folder) | `~/Desktop/BetOnline_Claude_Handoff` · remote `github.com/Stottiefingaz86/DAGENT` (private) |
| Clean company copy (no brand name) | `_designagent/` in this folder (git-ignored) → `github.com/ft-unified-platform/DesignAgent`. Pushed with **GitHub Desktop** as account **ch86-d** (not Stottiefingaz86). Last push: `948f9e7` (11 Nov, "Run the Design Studio on AWS + Mobbin journey rule"), clean. |
| Prod reference site | https://design-request-app-one.vercel.app (e.g. `/sports/soccer`) |
| Lumen design system | Figma library "Lumen_Desing System" in Chris's main (BetOnline) Figma account. **Not** stottiefingaz@gmail.com. |
| Design Agent Figma file | https://www.figma.com/design/MYeELetKW9xye1shSpm8Fn (file key `MYeELetKW9xye1shSpm8Fn`) |
| Team research folder (Figma) | https://www.figma.com/files/1304356510223900444/folder/653184570 (always updated; check it for competitor changes) |
| Design Studio app | `apps/studio/` (dashboard + agent). `npm` scripts and `.command` launchers in the repo root. |
| Prototype lane | `apps/live-site` (`npm run dev:3001`) · demo on `:3000` |
| AWS hosting (DevOps) | `deploy/` + `docs/DEPLOY_AWS.md` (Docker, ALB, `/healthz`, `studio-work` branch auto-push, env-only secrets) |
| Handover convention | `docs/HANDOVER.md` → `specs/<slug>/handover/` |

## 4. Current work: Sportsbook · Alternate lines (spread/total arrows)

**Figma page** `45:649`: "Sportsbook · Alternate lines (spread & total arrows)".

| Section | Node | What |
|---|---|---|
| 00 Read me | `59:5758` | Has the links block (prod, Figma, handover) |
| ★ Feature focus | `91:15545` (frame `91:15546`) | Anatomy, delta, states, placement |
| 05 Motion | `59:5823` | |
| 06 Dev notes | `59:5898` | |
| 01 In situ | `69:5959` | Full prod pages: desktop 1440 `69:5960`, 1280 overflow `69:6948`, mobile 375 `72:10842` |
| 02 Journey · Desktop | `70:7879` | D1–D5 |
| 03 Journey · Mobile | `72:11597` | M1–M5 |
| 04 Components | `48:654` | |
| 07 Theme & brand | `58:4621` | |
| 08 Prod assets | `65:5758` | |

**Key components**
- odds-button `48:678`
- alt-lines-trigger `48:710`
- alt-line-row `48:742` (two exposed odds-button chips; Row = Default / Main line)
- alt-lines-popover `48:867`
- betslip-leg `51:784`
- betslip `51:879` (pinned Dark)
- event-row `53:1097`
- open-event-button `79:14958`
- shell-footer `80:855`
- sports-sub-nav `67:6045` (glass) and its mobile version `72:10808`

**Variable modes**
- Mode collection `…/16984:14`: Light `82:0`, Dark `3686:0`.
- Themes collection `…/43041:235`: BetOnline `39514:0`, SportsBetting `39556:0`, LowVig `39642:0`.

**Latest behaviour (alt-line picker v2, Chris, 12 Nov)**
- **Popover contents:** all 7 lines, **high → low**, no scroll. The main (default) line is the **centre row** and sits exactly on top of the board chips.
- **Popover position:**
  - left = chips.left − 9
  - top = chips.top − 9 − 32 − 3 × (rowH + 4)
- **Styling:** chips use OddsButton styling. There is **no row stroke and no red ring**. A chip is Selected when that pick is on the betslip.
- **Tapping a chip:**
  - the pair moves onto the board (both teams);
  - only the tapped chip goes on the slip, with one leg per event market, replaced in place;
  - tapping a chip that's already on the slip removes it.
- **Reopening:** the list never re-centres on the picked line.
- **Code** (deployed to prod; *not* yet in this local repo copy):
  - `soccer-sport-page.tsx`: `AlternateLinePicker`, `onPickAltLine`
  - `lib/lumen/soccer-sport.ts`: `picksWithActiveLines`
  - taste note `.cursor/knowledge/chris-taste/SOCCER_ALT_LINES.md`

**Handover folder:** `specs/sportsbook-alternate-lines/handover/`
- README, SKILL.md, tokens.md/json, components, journeys, interactions, dev-delivery (AC-01…AC-18), decisions, figma.md, manifest.json.
- Status: **ready for review**, sign-off CH.

## 5. Open items

- **Main repo has ~40 uncommitted changes** (AWS deploy files, studio changes, Mobbin rules, the alt-lines handover folder). Commit or push only when Chris asks.
- **Copy the alt-lines handover into `_designagent/`** with the brand name removed, so it reaches DesignAgent. Offered, not done.
- **Pull Chris's alt-line v2 code** into this local repo (it's only on the deployed site right now).
- **Not built yet:**
  - "Split BRD" feature (for large BRDs with many design requests): offered.
  - Amazon Bedrock as a model option for the server: offered.
- **Journey maps:** parked ("forget journey maps for now").

## 6. Reconnect in this account

- **Figma:** sign into the BetOnline Figma account that has the Lumen library.
- **Mobbin:** the team's paid plan.
- **Vercel** and **GitHub** connectors.
- **Desktop app:** link `~/Desktop/BetOnline_Claude_Handoff` as a connected folder.
- **Memory:** paste section 7 into Settings → Your Claude → Start import, or just let Claude read this file.

## 7. Memory to import (paste into the new account)

```
- Chris is Head of Design at BetOnline (iGaming); leads 6 designers; signs off design mocks before refinement.
- Works in frontend/design engineering; comfortable with JavaScript, frontend tooling and REST APIs; beginner C++; used to Cursor, newer to Claude.
- Preference: every time Claude designs something and Chris gives feedback, record that feedback and learn from it.
- Preference: design work must never go outside the Lumen design system or make things up.
- Building an agentic design flow: a BRD/PRD comes from the product repo → design agent (Lumen-only, SpecKit, Mobbin for journeys) → prototype on design-request-app-one.vercel.app → Figma build after approval → dev handover package (mocks, prototype, Figma, spec, tokens, motion, happy + unhappy paths) to a dev agent repo he doesn't control.
- Design Studio (dashboard + agent) repo: github.com/Stottiefingaz86/DAGENT (private); company copy github.com/ft-unified-platform/DesignAgent (pushed as GitHub account ch86-d; no "BetOnline" text in that repo).
- DevOps will host the Design Studio on AWS; it must work without his Mac.
- Figma: only the Lumen library; never edit existing files/folders; work goes in the "Design Agent" file in his main BetOnline Figma account (not stottiefingaz@gmail.com). Research folder: figma.com/files/1304356510223900444/folder/653184570.
- Mobbin plan is paid; use it for journey inspiration only, never copy layouts.
- Taste: confetti + sound on claims, sub-navs with slight glass, everything refined; benchmarks Stake (main), Rainbet, Winna; sportsbook aims for Kalshi/Polymarket feel.
- Wants agent questions specific (with screenshots), short messages, no demo mode; agent aligned to Product KPIs/OKRs (numbers only, no names); track cost per BRD.
- Future: Recommendations section, own research tool (e.g. a Browserbase agent visiting competitor sites).
```
