# Connectors

Project connectors are declared in **`.mcp.json`**, so Claude Code offers them when you open the repo. Each person signs in with their own account; no credentials are stored in the repo.

## Anthropic (required)
Runs the design agent. Add the key in **Studio → Settings → API keys**. It's stored in `apps/studio/.env.keys`, which git ignores, and can only be changed by an Owner on the machine running the studio. Use a business key with a spend limit for team use.

## Figma (MCP)
`https://mcp.figma.com/mcp`, the official server. Sign in with the account that can see the **Lumen** library.

- Library: Lumen (file `vCPe93hNKDWWcpu49Vo0kU`). Pass the library key in `knowledge/chris-taste/FIGMA.md` as `includeLibraryKeys` on every search.
- The agent writes **only** to the "Design Agent" file in the Lumen folder, one page per project. It never edits existing files. Ignore the MUI and other libraries in the org.
- Skills: `figma-use` (before any write), `figma-generate-design`, `figma-design-to-code`, `figma-code-connect` and the rest of `figma-*`.
- **Studio worker:** double-click **`Connect Figma.command`** once on the machine that runs the studio. It adds the Figma MCP to Claude Code and walks you through the Figma sign-in (`/mcp` → figma → Authenticate). Restart the studio afterwards. (Connecting Figma in the Claude app doesn't connect the studio; they're separate.) The studio shows whether the agent is signed in to Figma on the Home screen and on each handover.
- **Writes are locked to one file:** the studio refuses any Figma write outside the Design Agent file (`STUDIO_FIGMA_FILE`, default `MYeELetKW9xye1shSpm8Fn`).

## Research folder (Figma REST, read-only)

- Folder: https://www.figma.com/files/1304356510223900444/folder/653184570 (listed in `knowledge/product-strategy/RESEARCH_SOURCES.md`).
- Add `FIGMA_TOKEN=` to `apps/studio/.env`: a Figma personal access token with read-only scopes (File content: read, Projects: read).
- Every 6 hours the studio runs `scripts/research-watch.mjs`, which writes `knowledge/research/CHANGELOG.md` with new and updated research files. Agents open those first in every research step and in Recommendations.
- Run it by hand: `npm run research:watch`.

## Mobbin (MCP, paid plan)
`https://api.mobbin.com/mcp`. Real production screens from peer products. Without a paid plan the agent says so once and falls back to `knowledge/product-strategy/COMPETITOR_RESEARCH.md` and `competitors/`. Skill: `mobbin`. Inspiration only; the agent never clones peer brands.

## GitHub
- **BRDs in:** copy `apps/studio/examples/send-brd-to-design-repo.yml` into the product repo and add a `DESIGN_REPO_TOKEN` secret (a fine-grained token with Contents: read & write on this repo).
- **Work out:** branches plus pull requests. `main` is production.
- **Commit identity:** use an email linked to your GitHub account (the noreply address works) or Vercel blocks the build.

## Vercel
Hosts `apps/live-site`. Root directory `apps/live-site`, production branch `main`, preview per branch. Turn on Deployment Protection so previews stay private. See `docs/SETUP.md`.

## Optional live-site services
Only needed for the older desk features in `apps/live-site` (not for prototypes): `OPENAI_API_KEY`, `GOOGLE_API_KEY`/`GOOGLE_CSE_ID`, `GEOAPIFY_API_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `BLOB_READ_WRITE_TOKEN`, `MATTERMOST_WEBHOOK_URL`. Set them in Vercel → Environment Variables, never in files.
