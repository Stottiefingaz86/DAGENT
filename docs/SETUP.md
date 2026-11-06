# Setup

**Fastest:** double-click `Setup.command` (macOS) or run `npm run setup`. The wizard checks Node 22+, git and Chrome; installs `apps/studio` and `apps/live-site`; creates `apps/studio/.env` with a generated `STUDIO_INTAKE_TOKEN`; offers to connect Figma; runs `skills:check`; and opens the studio, whose Home screen shows a setup checklist (Owner, API key, Figma, research token, team, prototype site). It never asks for keys in the terminal. The manual steps below do the same thing.

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

## The setup gate

The studio refuses to run anything until the full setup works. Home shows a **Finish setup** screen instead of the composer, and the API answers `423 Setup isn't finished` for new BRDs, intake, dev questions, recommendations and every agent action. BRDs that arrive in `inbox/` meanwhile wait and start by themselves once setup is complete.

| Required | How | Checked by |
|---|---|---|
| Anthropic API key | Settings → API keys | key present |
| Figma connected to the agent | `Connect Tools.command` → `/mcp` → figma → Authenticate | `claude mcp list` shows figma ✓ |
| Mobbin connected to the agent (paid plan) | `Connect Tools.command` → `/mcp` → mobbin → Authenticate | `claude mcp list` shows mobbin ✓ |
| Figma research folder | Settings → Figma research folder (read-only token) | the folder lists without error |
| Google Chrome | installed on the machine (or `STUDIO_CHROME_PATH`) | executable found |

After fixing something, click **Check again** on Home (Owner). The studio also re-checks every 30 minutes, so if a Figma or Mobbin sign-in expires, it switches itself off and shows what to fix.
`STUDIO_SETUP_REQUIRED` (comma list) can change what's required; leave it unset unless the team agreed.

## Hosting the studio for the team

The **live site** (`apps/live-site`) deploys to Vercel. The **studio cannot run on Vercel**: it is a long-running server that keeps files on disk (`specs/`, `knowledge/`, sign-ins), runs Chrome for screenshots and starts the prototype site on :3001. Host it on a machine that stays on, e.g. a small cloud VM (AWS EC2 / Lightsail, Google Compute, Azure VM), a container platform with a persistent volume, or an office Mac mini.

On that machine:
1. Install Node 22+, git and Google Chrome. Clone the repo onto the persistent disk.
2. Run `npm run setup` (it installs both apps and writes `apps/studio/.env` with an intake token).
3. In `apps/studio/.env` add: `STUDIO_HOST=0.0.0.0` and `STUDIO_SECURE_COOKIE=1`.
4. Put it behind HTTPS (e.g. Caddy or nginx with a certificate, or your company's load balancer) pointing at port 4100. Only expose 4100 through that proxy, never directly.
5. Connect Figma and Mobbin **on the server** (`Connect Tools.command`, or the same `claude mcp add …` + `/mcp` steps in a terminal). The sign-in opens a browser and returns to the server, so do it in a remote-desktop session on the server, or over SSH with port forwarding of the callback port Claude Code shows. Sign-ins are stored for the server's user account.
6. Open the studio URL, create the Owner, add the API key and the Figma research token, then **Check again** until setup is complete.
7. Run it as a service so it restarts on reboot (e.g. `pm2 start "npm run studio" --name design-studio` or a systemd unit).
8. Give the intake token to the product and dev repos (BRD intake, handover download, dev questions — see `docs/HANDOVER.md`).
9. The agent writes specs, prototypes and taste notes into the repo on that machine. Give the server a GitHub deploy key or bot account, and commit/push from it on a schedule or with `Push to GitHub.command`, so the work lands on `work` → pull request → `main`.
