# Idea: Live payout tracker

**Status:** recommendation (draft mock), 2026-11-06
**Mock:** `/prototype/idea-payout-tracker` · source `apps/live-site/app/prototype/idea-payout-tracker/page.tsx`
**Screens:** `refs/idea-payout-tracker-1440.png`, `refs/idea-payout-tracker-390-390.png` · today: `refs/today-transactions.png`

## Gap

- **We promise speed and show nothing.** The homepage hero says "Fastest payouts · Payouts within minutes" (see `refs/idea-first-week-path-1440.png`, hero footer). After a withdrawal is requested there is no status anywhere:
  - Cashier → Withdraw opens a "Redirecting to Cashier…" dialog (`components/site/cashier-sheet.tsx` `WithdrawRedirectDialog`).
  - `/account/transactions` lists a withdrawal as a plain row with an amount. The model has no status field (`lib/lumen/transactions.ts` `TransactionRow`).
- **We already do this for money coming in.** Deposits have a live tracker (`DepositTracker` stages waiting → detected → confirming → confirmed in `shell-context.tsx`), plus a confirm poll and toast. Money going out gets nothing.
- **Peers keep money status visible.** Stake and Rainbet show an alert, then keep a persistent notification-centre entry that moves from Pending to Confirmed with amount and coin. The team's note recommends doing both. Source: Research Figma › Competitor Benchmarking, [node 122:5410](https://www.figma.com/design/tUaL195Qe7Ie8kuWmxL8Bi?node-id=122-5410).
  - That evidence is about deposits. Applying it to withdrawals is our inference; the research files have no withdrawal screens.
- **Mobbin:** blocked (paid plan required), so there are no peer screens from Mobbin.

## Strategy

- **Enabler:** Trust ("trust as a product, every screen, especially cashier & withdrawals").
- **Initiative:** 08 Player Dashboard & Transparency. Related features: #10 Live Deposit Status Toast (the mirror of this), #50 Unified Notification Centre.
- **Phasing:** BRIEF "Now — lay the rails" names **live payout status/time** explicitly.
- **Needle:** trust contacts (unpaid-win + fairness), ~27.6K per 6 months → half.

## Business case

| | Estimate | Assumption behind it |
|---|---|---|
| Contacts removed | ~4–5.5K per 6 months (15–20% of the trust baseline) | 30–40% of the 27.6K trust contacts are "where is my withdrawal" / unpaid-win chasers, and a visible tracker with ETA deflects about half of them. **CX tag data needed to confirm.** |
| Cost saved | ~$20–40K per 6 months | $5–7 fully-loaded cost per contact (assumption; finance to confirm). |
| Re-deposit lift | Small but positive | Players who see a payout land on time trust the next deposit. Not sized until we have a baseline. |

- **Effort: M.** The UI is small: one card plus a status pill in the table, composed from what we ship. The work is the payments status feed (requested / approved / sent / arrived, with timestamps and ETA) and a notification event.
- **Risk:** a wrong ETA is worse than none. Show the ETA only when payments returns one. Manual review gets its own honest state ("In review · usually under 2 h"), never a spinner.
- **Measure:**
  - Withdrawal-status contacts per 1,000 withdrawals (primary).
  - Tracker views and "Notify me" opt-ins.
  - Time from request to arrival (makes the "minutes" promise auditable).
  - 7-day re-deposit rate after a payout.

## Scope

- **MVP:**
  - Status card at the top of `/account/transactions` while any withdrawal is open (as mocked).
  - Status pill on withdrawal rows: Processing (`warning`) / Paid (`success`) / Failed (`destructive`).
  - One toast when the payout arrives, using the existing toast host. It is not a reward, so no confetti or sound (POLISH.md).
- **Later:**
  - The same card in the cashier Withdraw tab after submit.
  - A persistent notification-centre entry (#50).
  - A tracker chip under the balance in the header while a payout is open (mirrors the deposit poll).
- **Surfaces:** My Account (`/account/transactions`), Cashier sheet, Notifications (SURFACES.md rows).
- **Lumen reused:** `TransactionsPage`, `Button` (outline, sm), card recipe, `success` / `warning` tokens, Tabler icons as used across the shell.
- **Lumen gaps:** none for the MVP. The 4-step stepper is composed from tokens. If this becomes a project and the first-week path also ships, propose a shared Lumen **Stepper** (both use one).

## States to design if picked

- Requested
- In review
- Approved
- Sent (crypto with confirmations / bank)
- Arrived
- Failed with retry or support
- Multiple open withdrawals
- Logged out (hidden)
