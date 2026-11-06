# Feature Specification: Fast join → deposit → first game

**Feature Branch**: `build-an-new-registration-form-the-goal-is-to-ge` (studio folder, no git branch)
**Created**: 2026-11-06
**Status**: Draft — clarify (3 questions with Chris)
**Input**: User description: "build an new registration form, the goal is to get users to sign up, deposit and play a casino game as fast as possible, you can look at research, rainbet.com, winna.com for reference will need the journey, must haves, email, name, OTP, create password. tick box to say im over 18" (`brd.md`)

## Strategy alignment *(mandatory — BetOnline)*

- **Core bet / enabler**: **Activate** (casino-first activation) — `BRIEF.md` › Two core bets.
- **Initiative + feature #**: 01 Frictionless Join & Welcome · #1 Join/Login Modal, #3 Fast Registration, #5 Welcome Offer in Registration, #6 Post-Sign-Up Welcome Moment; 02 Funding & First-Bet Activation · #8 Auto-Open Deposit Wallet, #9 Offer Inside Deposit Widget, #10 Live Deposit Status Toast, #15 Instant Welcome Free Spins — `BRIEF.md` › Feature index.
- **Needles**:
  - Time to first casino bet: **~8 min → <2 min** (`BRIEF.md` › Needles).
  - Sign-up: **~1:30 / 6 fields → peers 45–55s, 2–3 fields** (`BRIEF.md` › Evidence; `Journey_Audits_2026.pdf` p.2: BOL ~1 min / 7 clicks / 6 fields; Winna 3 fields, Whale 2, Rainbet 3, Stake 3).
  - Cleared deposit → first bet: **~8 min / 8 clicks → peers 30s–1:30 / 3–5 clicks** (audit p.4; Winna ~30s / 3 clicks).
  - BTC funds arrival: BOL **~6 min** (audit p.3) — this is outside design control and dominates total journey time (BOL total ~9 min, Winna/Whale/FanDuel ~7 min, audit p.4).
- **Player job**: Get to casino faster.
- **Competitor reference**: Journey audit (Winna, Rainbet, Stake, Whale — email + password + 18+ checkbox on one screen, referral collapsed, email verify afterwards). Take: ≤3 fields on screen one, 18+ as one checkbox with T&C link, one primary CTA. Don't take: peer art, purple chrome, social sign-in rows (feature #4 not requested). Mobbin MCP is not connected in this studio, so peer evidence is the audit PDF only.
- **Existing surfaces reused**: `components/site/auth-modal.tsx` (Join → Verify → Welcome), `components/site/cashier-sheet.tsx` (crypto deposit, `CryptoDepositTracker`, `DepositConfirmedActions` "Use Free Spins"), `components/lumen/game-launcher.tsx` (free-spins launch), `lib/lumen/vip-hub.ts` (`WELCOME_FREE_SPINS`), shell toasts.
- **Out of scope per strategy**: Alternative sign-in (#4), welcome email sync (#7), KYC levels (journey 3), username (journey 4 lab), sportsbook name gate (journey 2), card cashier, cashier widget re-platform (in flight → 2027, audit p.3).

## Current state (what ships today)

The demo already has every BRD must-have (`auth-modal.tsx`, journey 1 / 5 in `AUTH_JOIN.md`):
1. **Join** — Email, Password (5-rule checklist), optional Referral, 18+ / T&C checkbox ("I acknowledge that I am over the age of 18 and agree to the Terms and Conditions"), CTA **Next**.
2. **Verify** — Full Name + 5-box OTP sent to email, optional SMS, Resend, CTA **Complete**. Closing here does not create the account.
3. **Welcome** — "Welcome, {first}! Your account is ready." + welcome offer card ("$250 in Free Sports Bets + 100 Free Spins · On your first deposit") + **Let's Go** → `completeJoin` → cashier opens.
4. **Cashier** — pick coin → copy address → tracker (waiting → detected → confirming 2/2 → confirmed).
5. **Confirmed** — **Use Free Spins** launches Chicken with 100 free spins (`WELCOME_FREE_SPINS`), or **Discover** → `/casino`.

So the work is **not** new fields; it is removing time and taps between those steps, and making step 5 reachable even when the player closed the wallet while waiting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join in under a minute (Priority: P1)

A new player taps **Join**, enters email + password, ticks 18+, enters name + email code, and lands on a welcome screen with one obvious next action: deposit.

**Why this priority**: Sign-up is the top of the activation funnel; audit shows BOL is on the high end of fields and time.

**Independent Test**: Time a fresh join on 390 and 1440 from Join tap to Welcome; count taps and fields.

**Acceptance Scenarios**:
1. **Given** a logged-out player on any route, **When** they tap Join, **Then** the modal shows Email, Password, 18+ checkbox and one CTA (Referral collapsed) — 2 fields + 1 tick.
2. **Given** a valid email, password and ticked 18+, **When** they tap Next, **Then** Verify opens with Full Name focused and the OTP sent to their email.
3. **Given** a correct code and First Name, Last Name, **When** they tap Complete, **Then** the account is created and Welcome greets them by first name.
4. **Given** the 18+ box is unticked, **When** they tap Next, **Then** the error "Confirm you are 18+ and agree to the terms" shows and nothing submits.

### User Story 2 - Deposit with no extra decisions (Priority: P1)

From Welcome, the player goes straight into the deposit address for the default coin with the welcome offer visible in the wallet.

**Why this priority**: Every tap between welcome and a copied address delays the ~6 min chain wait (audit p.3: "preselect currency").

**Independent Test**: From Welcome, count taps to a copyable deposit address.

**Acceptance Scenarios**:
1. **Given** Welcome, **When** the player taps the deposit CTA, **Then** the cashier opens on the BTC deposit address (preselected) with the welcome offer row — ≤1 tap to copy.
2. **Given** the player copies the address, **Then** the tracker starts and says they can close the wallet and will be told next to their balance.

### User Story 3 - Play the first game in one tap (Priority: P1)

The moment the deposit confirms, wherever the player is, one tap launches the welcome free spins game.

**Why this priority**: This is the needle (cleared deposit → first casino bet, ~8 min / 8 clicks today).

**Independent Test**: Confirm a demo deposit with the wallet open and with it closed; count taps to a running game.

**Acceptance Scenarios**:
1. **Given** the wallet is open on the tracker, **When** the deposit confirms, **Then** the success glyph + "Deposit confirmed" + **Use Free Spins** show, and one tap launches the game.
2. **Given** the wallet was closed, **When** the deposit confirms, **Then** a toast next to the balance offers the same one-tap Play action.

### Edge Cases

- Email already taken → inline "taken" on Email (live check, `TAKEN_EMAILS` demo).
- Wrong / expired OTP → "Enter the 5-digit code" error; Resend available; SMS option.
- Single-token name ("chris") → "Enter First Name, Last Name" (`AUTH_JOIN.md`).
- Player closes Verify → no account created (`AUTH_JOIN.md`).
- Player closes the wallet before depositing → logged in, $0; tapping any game opens the wallet (`LAST_GAME_AND_FAVOURITES.md` › Launch with $0).
- Deposit under minimum / wrong network → existing cashier warnings (unchanged).
- Slow chain (> few minutes) → tracker stays honest; no fake progress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Join MUST collect Email and Password on step one, with an 18+ / T&C checkbox and Referral collapsed; Full Name MUST NOT be on step one (`AUTH_JOIN.md` › Do not).
- **FR-002**: Verify MUST collect Full Name (placeholder "First Name, Last Name") and a 5-digit OTP sent to email, with SMS as an optional alternative.
- **FR-003**: The account MUST NOT be created until the OTP is verified (current journey 5 rule) — *subject to Q2*.
- **FR-004**: Welcome MUST have one primary CTA that opens the cashier directly on the default coin's deposit address.
- **FR-005**: The cashier MUST preselect BTC for a brand-new account (audit p.3 opportunity).
- **FR-006**: On deposit confirm, the player MUST be one tap from a running casino game, both in the wallet and via a balance toast when the wallet is closed.
- **FR-007**: All UI MUST use Lumen tokens/components and the shipped AuthModal glass; success glyph follows `CONFIRMATION_STATES.md`.
- **FR-008**: The flow MUST emit timing events for each step (join open, join submit, verify complete, cashier open, address copied, deposit confirmed, game launched) to measure the needle.
- **FR-009**: Free spins availability before / after confirm and the per-session spin count — *see Q1 and Q3*.

### Key Entities

- **Player profile**: email, fullName, ageConfirmed (18+ + T&C version), verified (email/SMS), createdAt.
- **Deposit tracker**: coin, address, stage (waiting/detected/confirming/confirmed), confirmations, amount.
- **Welcome free spins**: game (Chicken), spins available, schedule (see Q3).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Join tap → Welcome in **≤45s** median at 390 (peer bar 45–55s, `BRIEF.md`), with 2 fields + 1 tick on step one.
- **SC-002**: Welcome → copyable deposit address in **≤1 tap**.
- **SC-003**: Deposit confirmed → game running in **1 tap / <10s** (baseline ~8 min / 8 clicks, audit p.4).
- **SC-004**: Total time to first casino bet tracks toward **<2 min** excluding chain time (`BRIEF.md` needle).

## Assumptions

- The registration lives in the shipped AuthModal (Join on any route), not a new page — `SURFACES.md` › Join row. The prototype shows it on the real shell.
- Crypto is the default funding path for new accounts (art + cashier default); card deposits stay gated (journey 3 levels, out of scope).
- Welcome free spins game is Chicken (Originals) per `WELCOME_FREE_SPINS`.
- Offer amounts are business-owned; we reuse the shipped copy and do not invent new offers.

## Clarifications

### Session 2026-11-06

Answered from sources (no human needed):
- Q: Where does the form live — new page or modal? → A: Evolve the shipped AuthModal; Join opens from header / hero / gates on any route (`SURFACES.md` Join row; `shell-header.tsx` `openAuth('join')`).
- Q: Which fields where? → A: Email + Password + 18+ on step one; Full Name + OTP on Verify (`AUTH_JOIN.md` journey 1/5 + "Do not put Full Name on the join form").
- Q: 18+ copy? → A: Keep shipped "I acknowledge that I am over the age of 18 and agree to the Terms and Conditions" (`auth-modal.tsx` ~L1865).
- Q: Password rules? → A: Shipped 5-rule checklist (`auth-modal.tsx` `PASSWORD_RULES`).
- Q: OTP format? → A: 5 square boxes, paste-friendly, "We sent a code to {email}.", Resend + optional SMS (`AUTH_JOIN.md` journey 5).
- Q: Success screen language? → A: Join welcome glyph + "Welcome, {first}!" (`CONFIRMATION_STATES.md`).
- Q: First game? → A: Welcome free spins on Chicken via "Use Free Spins" (`cashier-sheet.tsx` `DepositConfirmedActions`; `vip-hub.ts`).
- Q: Deposit currency? → A: Preselect BTC for new accounts (audit p.3 "currency pre-selected would speed up the process").
- Q: States? → A: Join idle/error, Verify sending/error, Welcome, cashier waiting/detected/confirming/confirmed, closed-wallet toast; 390 + 1440.
- Q: Peer research? → A: Mobbin MCP not connected in this studio; using `Journey_Audits_2026.pdf` (registration, BTC deposit, total journey pages).

Open (asked to Chris, see dashboard):
- Q1: Can welcome free spins unlock when the deposit is detected (before 2/2 confirmations)?
- Q2: Does the OTP stay a gate before the account exists, or move after the first game?
- Q3: Welcome art says "10 free spins a day for 10 days" but code grants 100 spins on Chicken at once — which is true?
