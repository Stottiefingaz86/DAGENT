# Setup

## Requirements

| | |
|---|---|
| Node | 22 or newer (`.nvmrc` in `apps/live-site`) |
| Browser | Google Chrome. The agent takes screenshots with it through `playwright-core`; nothing extra is downloaded. Use another Chromium by setting `STUDIO_CHROME_PATH`. |
| Anthropic API key | Added in the studio, not in files |

## Run the Design Studio

```bash
npm --prefix apps/studio install
npm run studio                      # http://localhost:4100
```

On macOS, **`Start Design Studio.command`** does the same with a double-click.

On first open:
1. Create the **Owner** account (only possible on the machine running the studio).
2. **Settings → API keys:** add a key. Several keys can be stored, for example Personal and Business; one is active.
3. **Settings → People:** add designers as Requesters, and other approvers as Owners.

## The prototype lane

The studio starts `apps/live-site` on **:3001** itself, installing its packages the first time, and shows "Starting the prototype…" in the chat while it boots. The log is in `apps/studio/prototype-lane.log`. To run it by hand: `npm --prefix apps/live-site run dev:3001`.

## Configuration (`apps/studio/.env`, optional)

| Variable | Default | Purpose |
|---|---|---|
| `STUDIO_PORT` | `4100` | Studio port |
| `STUDIO_HOST` | `127.0.0.1` | `0.0.0.0` to open it to your network. Everyone still signs in |
| `STUDIO_SECURE_COOKIE` | off | Set `1` when served over https |
| `STUDIO_INTAKE_TOKEN` | — | Required for `/api/intake` from other machines |
| `STUDIO_MODEL` | SDK default | Claude model for the agent |
| `STUDIO_PROTOTYPE_ORIGIN` | `http://127.0.0.1:3001` | Where prototypes run |
| `STUDIO_LANE_AUTOSTART` | on | `0` to start the lane yourself |
| `STUDIO_CHROME_PATH` | Chrome | Browser used for screenshots |

## Running it for a team

The studio is a long-running worker: an agent run lasts 10–30 minutes and edits a checkout of this repo, so it doesn't fit serverless hosting. For a shared instance, use an always-on machine with a disk (a Mac mini or a small VM on Railway, Fly.io or Render), serve it over https, set `STUDIO_HOST=0.0.0.0` and `STUDIO_SECURE_COOKIE=1`, and give the machine a GitHub token that can push branches only. Vercel hosts `apps/live-site` and a preview per branch.

## Deploying the live site

Vercel project **design-request-app**, root directory **`apps/live-site`**, production branch **`main`**.
- Push a branch → a private preview URL.
- Merge into `main` → production.
- Commits that don't touch `apps/live-site` (BRDs, specs, docs) don't trigger a build (`ignoreCommand` in `vercel.json`).
- Commit authors must match a GitHub account on the Vercel team, or Vercel blocks the build.
