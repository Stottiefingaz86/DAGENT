# Roadmap

| Next | Why |
|---|---|
| **Research agent on competitor sites** (e.g. Browserbase) | A scheduled browser agent visits competitor sites (join, cashier, rewards, lobby), takes screenshots and notes what changed, and files them into the research Figma folder. The research watch then picks them up for every design and recommendation. |
| **Recommendations on a schedule** | Run Ideas monthly against the strategy KPIs; post new ideas to the team channel. |
| **Dev questions from GitHub** | A GitHub Action in dev repos turns issues labelled `design-question` into calls to `/api/jobs/<slug>/dev-questions` and comments the answer back. |
| **Studio hosted for the team** | Run the studio on a shared machine/VM with HTTPS (`STUDIO_HOST=0.0.0.0`, `STUDIO_SECURE_COOKIE=1`) so designers and PMs don't need it locally. |
| **Lumen gap → library PR** | When Chris approves a proposed component, open a PR in the Lumen repo with the component and a Figma component in the library file (by the DS team). |
