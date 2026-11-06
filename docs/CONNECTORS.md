# Connectors

Project connectors are declared in **`.mcp.json`**, so Claude Code offers them when you open the repo. Each person signs in with their own account; no credentials are stored in the repo.

## Anthropic (required)
Runs the design agent. Add the key in **Studio → Settings → API keys**. It's stored in `apps/studio/.env.keys`, which git ignores, and can only be changed by an Owner on the machine running the studio. Use a business key with a spend limit for team use.

## Figma (MCP) — required
`https://mcp.figma.com/mcp`, the official server. Sign in with the account that can see the **Lumen** library.

- Library: Lumen (file `vCPe93hNKDWWcpu49Vo0kU`). Pass the library key in `knowledge/chris-taste/FIGMA.md` as `includeLibraryKeys` on every search.
- The agent writes **only** to the "Design Agent" file in the Lumen folder, one page per project. It never edits existing files. Ignore the MUI and other libraries in the org.
- Skills: `figma-use` (before any write), `figma-generate-design`, `figma-design-to-code`, `figma-code-connect` and the rest of `figma-*`.
- **Studio worker:** double-click **`Connect Tools.command`** once on the machine that runs the studio. It adds the Figma MCP to Claude Code and walks you through the Figma sign-in (`/mcp` → figma → Authenticate). Restart the studio afterwards. (Connecting Figma in the Claude app doesn't connect the studio; they're separate.) The studio shows whether the agent is signed in to Figma on the Home screen and on each handover.
- **Writes are locked to one file:** the studio refuses any Figma write outside the Design Agent file (`STUDIO_FIGMA_FILE`, default `MYeELetKW9xye1shSpm8Fn`).

## Research folder (Figma REST, read-only)

- Folder: https://www.figma.com/files/1304356510223900444/folder/653184570 (listed in `knowledge/product-strategy/RESEARCH_SOURCES.md`).
- Add `FIGMA_TOKEN=` to `apps/studio/.env`: a Figma personal access token with read-only scopes (Folders: read, File content: read; Figma tokens expire, so pick the longest expiry and renew it).
- Every 6 hours the studio runs `scripts/research-watch.mjs`, which writes `knowledge/research/CHANGELOG.md` with new and updated research files. Agents open those first in every research step and in Recommendations.
- Run it by hand: `npm run research:watch`.

## Mobbin (MCP, paid plan) — required

- Endpoint `https://api.mobbin.com/mcp` (also in `.mcp.json`). Skill: `.claude/skills/mobbin/`.
- **Studio worker:** `Connect Tools.command` adds it and walks you through `/mcp` → mobbin → Authenticate. The studio stays off until it shows connected.
- Without a paid Mobbin plan the sign-in fails; the agent would otherwise fall back to `COMPETITOR_RESEARCH.md`, but the setup gate requires Mobbin by default (`STUDIO_SETUP_REQUIRED` changes that if the team agrees).

## GitHub
- **BRDs in:** copy `apps/studio/examples/send-brd-to-design-repo.yml` into the product repo and add a `DESIGN_REPO_TOKEN` secret (a fine-grained token with Contents: read & write on this repo).
- **Work out:** branches plus pull requests. `main` is production.
- **Commit identity:** use an email linked to your GitHub account (the noreply address works) or Vercel blocks the build.

## Vercel
Hosts `apps/live-site`. Root directory `apps/live-site`, production branch `main`, preview per branch. Turn on Deployment Protection so previews stay private. See `docs/SETUP.md`.

## Optional live-site services
Only needed for the older desk features in `apps/live-site` (not for prototypes): `OPENAI_API_KEY`, `GOOGLE_API_KEY`/`GOOGLE_CSE_ID`, `GEOAPIFY_API_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `BLOB_READ_WRITE_TOKEN`, `MATTERMOST_WEBHOOK_URL`. Set them in Vercel → Environment Variables, never in files.

## Chat: Slack, Mattermost, Microsoft Teams (optional)

Studio → account menu → **Notifications** (Owner).
- **Out:** add an incoming-webhook URL per channel (Slack, Mattermost, Teams Workflows, or any https webhook) and pick what it hears: a project needs someone, handover ready, a dev question needs design, setup broke/completed, run errors. Links in messages use `STUDIO_PUBLIC_URL`.
- **In (answer the agent from chat):** a Mattermost outgoing webhook (trigger word `design`) or a Slack slash command (`/design`) pointed at `/api/notify/inbound` with the token from that page. Send `<project> <message>`; `list` shows what needs you. Needs the studio reachable from the chat service (hosted).
- Webhook URLs and the token are stored in `apps/studio/.studio-notify.json` (git-ignored).
- Sounds and desktop alerts are per person, in their own browser.
