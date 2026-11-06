# Shell header on ultra-wide

**Source:** Chris, Oct 2026 — “lets try” aligning balance / VIP / UB with content.

## Rule

Header brand bar inner row uses the same column as page content + casino sub-nav:

`mx-auto w-full max-w-[1440px]` (+ `px-4` / `lg:px-6`)

On very large screens, balance / VIP / UB sit on the **content right edge**, not the viewport edge. Left menu + brand move with the same column so they stay locked to the lobby grid.

## No product links in the header (Chris, Nov 2026)

**Source:** Chris, Nov 2026 (job `screenshot-1793961160095-0`). Quote: “remove links in header to be more like rain bet”.

- **Do:** keep the header bar to menu + logo on the left and search · VIP · Login/Join or balance/UBC on the right. Product switching (Casino | Sports) lives at the top of the sidebar and in the mobile drawer. Poker, Promotions, Live Betting, Racebook, Esports and Contests live as sidebar groups/rows.
- **Don't:** add Casino / Sports / Poker / Promotions tabs or an “Other” menu to the header at any breakpoint. Don't duplicate the product switch in both the header and the sidebar.

Full-bleed stays on the header shell (`bg` + `border-b`); only the controls row is capped.

## Do not

- Do not pin balance/VIP/UB with absolute `right: 0` on the viewport.
- Do not invent a second max-width — keep **1440** with sub-nav / `ShellFrame` content.
