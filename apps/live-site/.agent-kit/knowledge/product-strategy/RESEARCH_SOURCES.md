# Research sources

Where design research comes from. Agents check these in this order, every research step, and never rely on memory for what competitors do.

1. **Research Figma folder** (the team's competitor and market research, updated all the time)
   - https://www.figma.com/files/1304356510223900444/folder/653184570
   - figma-project: 653184570
   - `scripts/research-watch.mjs` lists it (needs `FIGMA_TOKEN`, a read-only Figma personal access token) every 6 hours from the studio and writes `knowledge/research/CHANGELOG.md` (new / updated files with links) and `knowledge/research/figma-index.json`.
   - Agents open the New / Updated files with the Figma MCP (`get_metadata`, `get_screenshot`) — **read only, never edit**.
2. **Peer benchmark** — `PEERS.md`: Rainbet and Winna (patterns we like), Stake (main influence), Kalshi and Polymarket (sportsbook direction).
3. **Product strategy** — `KPIS.md` (the numbers to hit this period), `BRIEF.md`, the journey audits in `research/`, `COMPETITOR_RESEARCH.md`.
4. **Mobbin** — real peer screens and flows (`.claude/skills/mobbin/`).
5. **Our live site** — `studio.capture_site` before calling anything a gap.

Later: a browser research agent (e.g. Browserbase) that visits competitor sites on a schedule and files screenshots + notes into the research folder. See `docs/ROADMAP.md`.
