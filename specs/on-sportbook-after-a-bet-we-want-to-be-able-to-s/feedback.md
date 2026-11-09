# Feedback: Share my bet (sportsbook)

## 2026-11-09 · Round 0 (clarify answers)

- Chris: amounts on the card → "Always show amounts" (I recommended off by default with a toggle). Change: card always shows Stake + To win/Won; toggle removed. Classified one-off for this feature (sportsbook share card), not a durable taste rule.
- Chris: RAF code on the link → "Yes, attach the RAF code" (recommended). Change: link carries ?RAF=, counts as a RAF share.
- Chris: recipient → "Public bet page with Add to betslip" (recommended). Change: new public bet page in scope.

## 2026-11-09 · Round 1 (proposal direction)

- Chris (pin #1 on refs/p-public-settled-desktop.png, annotated copy feedback/pins-p-public-settled-desktop-mw9ftu5p.png): "I dont like how a player lands on this screen, they should land on sports with the bets already in the slip"
- Change: public shared-bet page removed. The link opens /sports/<sport> with the shared picks in the betslip and the slip open. Legs that started or settled are dropped and the slip says so in one line. Logged-out players see Join only at Place Bet (existing betslip behaviour).
- Durable → SPORTSBOOK.md: dont rule 4179a534 (no in-between landing page for bet links), do rule a9a5ef57 (land on sportsbook with picks in the slip).

## 2026-11-09 · Internal review (design-reviewer, 2 rounds, before Chris)

- Fixed: real SoccerBetslip instead of a redraw (optional props initialConfirmed / onShare / shareStep); each view now renders in its real section via prototype-only ShellNavPathProvider; history card built from the row; Copy gets the RAF icon + "Copied" state.
- Open for Chris: card recipe in lumen-build says the 0 0 16px shadow, but that arbitrary value fails `npm run tokens:lint`, so the draft uses Lumen `shadow-sm`. Decide whether to update the recipe.


## Round 1 — 2026-11-09 15:50

> [Direction] Pinned comments on the screenshots (1). Numbered pins are drawn on the annotated copies — Read them first; x/y are % from the image's left/top edge.
> 
> On `specs/on-sportbook-after-a-bet-we-want-to-be-able-to-s/refs/p-public-settled-desktop.png`:
> - #1 at (x 64%, y 33%) — CH: "I dont like how a player lands on this screen, they should land on sports with the bets already in the slip"

- Screenshot: `specs/on-sportbook-after-a-bet-we-want-to-be-able-to-s/feedback/pins-p-public-settled-desktop-mw9ftu5p.png`
