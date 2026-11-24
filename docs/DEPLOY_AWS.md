# Running the Design Studio on AWS

For DevOps. This runs the Design Studio (dashboard + Claude design agent + prototype site) on one AWS server,
so nothing depends on a designer's laptop. Everything here is in the repo: `deploy/` and `apps/studio/`.

## What runs

One container on one EC2 instance:

| Port | What | Who reaches it |
|------|------|----------------|
| 4100 | The studio (dashboard, API, live updates) | Load balancer → `https://studio.<domain>` |
| 4101 | The prototype site, behind the studio login | Load balancer → `https://proto.<domain>` |
| 3001 | The prototype site itself (Next.js dev server the agent edits) | Only the instance (never open it) |
| 53682, 53683 | One-time Figma / Mobbin sign-in callbacks | Only `127.0.0.1`, through an SSH/SSM tunnel |

The repo lives on the instance's disk (`/srv/design-studio/repo`), not in the image, because the agent
writes to it: prototypes, specs, taste notes. Every 15 minutes the studio commits that work and pushes it to
the `studio-work` branch (never `main`, never with force). The team merges `studio-work` into `main` with a
pull request.

Why not Fargate / Lambda / Vercel: the studio keeps its data in files, runs a Next.js dev server and Chromium,
and runs agent jobs that last many minutes. It needs one long-lived machine with a normal disk.

## 1. The instance

- **EC2:** 4 vCPU / 16 GB (e.g. `m7i.xlarge`), Amazon Linux 2023 or Ubuntu 24.04, in a private subnet.
- **Disk:** 100 GB gp3 EBS mounted at `/srv/design-studio`. Turn on daily snapshots (AWS Backup); this disk
  holds the user accounts, sessions, notifications and the Figma/Mobbin sign-ins.
- **Software:** Docker with the compose plugin.
- **Access:** SSM Session Manager (preferred) or SSH, for the one-time steps below.
- **Outbound HTTPS (443)** to: `api.anthropic.com`, `github.com`, `api.github.com`, `registry.npmjs.org`,
  `mcp.figma.com`, `api.figma.com`, `www.figma.com`, `api.mobbin.com`, `mobbin.com`.

```bash
sudo mkdir -p /srv/design-studio /etc/design-studio
sudo chown 1001:1001 /srv/design-studio        # the container runs as uid 1001
```

## 2. Load balancer, HTTPS and access

- **ALB** with an ACM certificate for `studio.<domain>` and `proto.<domain>`. Both names point to the ALB.
- **Listener rules:** host `studio.<domain>` → target group on instance port **4100**; host `proto.<domain>` → port **4101**.
- **Health checks:** `GET /healthz` on both (200 = up). The first start installs packages, so give it about 10 minutes.
- **Idle timeout:** 300 seconds. The dashboard keeps a live connection open (server-sent events), and so does the prototype's live reload (websocket).
- **Stickiness:** not needed; there is one instance.
- **Security group on the instance:** 4100 and 4101 from the ALB only. Nothing else inbound.
- **Recommended:** keep the ALB internal (VPN / company network) or put company SSO in front with ALB OIDC
  authentication. The studio has its own logins too (invites, roles, sign-off), so people sign in once more inside.

## 3. Settings and secrets

Copy `deploy/studio.env.example` to `/etc/design-studio/studio.env` (`chmod 600`, owned by root) and fill it
in, or load the same names from Secrets Manager / Parameter Store.

| Setting | What |
|---------|------|
| `ANTHROPIC_API_KEY` | Company Anthropic API key. All agent runs are billed to it (Settings → Models & cost shows the cost per project). |
| `FIGMA_TOKEN` | Read-only Figma personal access token for the research folder (from a design-team Figma account). |
| `GITHUB_TOKEN` | Fine-grained token on `ft-unified-platform/DesignAgent` with **Contents: read and write**. Used to clone, merge `main`, and push `studio-work`. Kept in memory only. |
| `STUDIO_PUBLIC_URL` | `https://studio.<domain>` |
| `STUDIO_PROTOTYPE_PUBLIC_URL` | `https://proto.<domain>` |
| `STUDIO_COOKIE_DOMAIN` | `.<domain>`, so the studio login also opens the prototype address |
| `STUDIO_GIT_SYNC_MINUTES` | `15` (0 turns the push off) |
| `STUDIO_INTAKE_TOKEN` | Optional: lets other systems send BRDs to `POST /api/intake` with `Authorization: Bearer …` |

The image already sets the server defaults: listen on all interfaces, trust the ALB's `X-Forwarded-For`,
secure cookies, API key from the environment (it cannot be changed or stored from the UI), Chromium for
screenshots, and the sign-ins kept on the disk.

## 4. Start it

```bash
git clone https://github.com/ft-unified-platform/DesignAgent.git /opt/design-studio-src
cd /opt/design-studio-src/deploy
sudo docker compose up -d --build
sudo docker compose logs -f studio          # first start clones the repo and installs packages
```

On first start the container clones the repo to `/srv/design-studio/repo`, creates the `studio-work` branch,
installs packages, and starts the studio and the prototype site.

## 5. One-time steps

### Create the Owner account

The setup screen only works on the machine that runs the studio, so the first account is created from the command line:

```bash
sudo docker compose exec -it studio node apps/studio/scripts/create-owner.mjs --name "CH" --username ch
sudo docker compose restart studio
```

The Owner then signs in at `https://studio.<domain>` and invites everyone else from **Settings → People**.

### Connect Figma and Mobbin

The agent uses the official Figma and Mobbin connections. Both only offer a browser sign-in, done once by a
person and then kept on the disk (`/srv/design-studio/claude`), where it renews itself. Use the
**design team's shared accounts** (Figma with access to the Lumen library and the research folder; Mobbin on the paid plan),
not someone's personal account.

1. From your laptop, forward the two callback ports to the instance:
   ```bash
   ssh -L 53682:127.0.0.1:53682 -L 53683:127.0.0.1:53683 <user>@<instance>
   # or SSM: aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSession \
   #           --parameters '{"portNumber":["53682"],"localPortNumber":["53682"]}'   (and a second one for 53683)
   ```
2. On the instance:
   ```bash
   cd /opt/design-studio-src/deploy
   sudo docker compose exec -it studio apps/studio/scripts/connect-tools.sh
   ```
3. In the Claude Code screen that opens: `/mcp` → **figma** → Authenticate. Open the printed link in your
   laptop's browser and sign in. Do the same for **mobbin**, then `/exit`.
4. In the studio: **Home → Check again**. All five setup items should be green: API key, Figma, Mobbin,
   research folder, Chromium.

If Figma or Mobbin later shows "needs auth" (a password change, or access revoked), repeat this step.

### Move the team's existing data from the Mac (once, optional)

Projects (`specs/`) are already in git. Accounts, roles, notifications and the activity log are not. To
keep them, the Head of Design copies these files from `apps/studio/` on his Mac into
`/srv/design-studio/repo/apps/studio/` (owned by uid 1001, `chmod 600`), then restart:

`.studio-users.json`, `.studio-team.json`, `.studio-inbox.json`, `.studio-audit.jsonl`, `.studio-models.json`,
`.studio-notify.json`, `.studio-tidy.json`

Leave out `.studio-sessions.json` (everyone signs in again) and `.env.keys` (the server uses its own key).
If you skip this, create the Owner as above and re-invite the team.

## Updating

Merge to `main` as usual, then `sudo docker compose restart studio`. On every start the container fetches,
merges `origin/main` into `studio-work`, installs packages if a lock file changed, and starts. If the merge
conflicts, it changes nothing, logs `Could not merge origin/main into studio-work`, and keeps running the
current version. Fix it by merging `main` into `studio-work` on GitHub (or with a pull request), then restart.

Changes to `deploy/Dockerfile` need `docker compose up -d --build`.

## Operations

- **Logs:** `docker compose logs studio`. In the repo: `apps/studio/studio.log` and `apps/studio/prototype-lane.log`.
- **Health:** `GET /healthz` on 4100 and 4101.
- **Backups:** EBS snapshots of `/srv/design-studio`. Projects are also in git (`studio-work`).
- **Cost control:** each agent run has a spending cap (Settings → Models & cost, default $10 a run).
- **Restart:** safe at any time. Running agent jobs stop and can be retried from the project.

## Security notes

- Secrets come only from the environment. The UI cannot read or replace the API key on a server.
- The data files (`apps/studio/.studio-*`) are git-ignored and written with mode 600. The git push refuses
  any change that contains something that looks like an API key.
- The prototype address only answers people signed in to the studio. Port 3001 is never exposed.
- The first Owner can only be created from the instance's shell. After that, accounts come by invite only.
- Behind the ALB, sign-in attempts are limited per real client IP (`X-Forwarded-For`).
