# Journey maps

Account menu → **Journey maps**. One map per player journey (onboarding, deposit, playing a game, claiming a reward…), stored in `knowledge/journeys/journeys.json` so every design agent reads the same maps.

Each map shows:
- **Today**: the journey on the live site, step by step, with a real screenshot per step and the friction marked where it happens.
- **Proposed**: the improved journey. Each step is tagged Same, Changed, New or Removed, with the reason and the KPI it moves.
- **KPI** from `KPIS.md`, **how peers do it** (with sources), the **biggest opportunities** and the expected impact.

What you can do:
- **New journey**: name it, say what the player is trying to do, and list the steps you have in mind (one per line).
- **Edit the proposed journey**: `+` adds a step, `‹ ›` reorder, `✎` edits, `×` removes. "Start from today" copies the current journey to change it. Admins, Leads and Designers can edit; Viewers can read.
- **Map with agent** (Admin or Lead): the agent walks the live site and captures each step, reads the code for things a screenshot can't show (polling, redirects, messages), checks the research folder, PEERS and Mobbin, and proposes a better journey tied to the KPIs. Steps people added are kept. It runs as its own project on the Ideas model.
- **Prototype this journey** (Admin or Lead): starts a normal project whose brief is the map. The agent builds a click-through prototype of the whole proposed journey, then it goes through direction review, feedback and sign-off like any BRD.

When a BRD touches a mapped journey, the agent reads the map and names the journey and steps it changes in the spec.
