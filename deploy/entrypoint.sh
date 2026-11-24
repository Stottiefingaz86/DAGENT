#!/usr/bin/env bash
# Starts the Design Studio on a server. First start: clones the repo onto the permanent disk.
# Every start: merges the latest main into the server's working branch (studio-work), installs packages
# when they changed, then runs the studio (which starts the prototype site itself).
set -euo pipefail
REPO_DIR="${STUDIO_REPO_DIR:-/data/repo}"
REPO_URL="${STUDIO_GIT_URL:-https://github.com/ft-unified-platform/DesignAgent.git}"
BASE="${STUDIO_GIT_BASE_BRANCH:-main}"
WORK="${STUDIO_GIT_SYNC_BRANCH:-studio-work}"
export STUDIO_GIT_SYNC_BRANCH="$WORK"
mkdir -p "${CLAUDE_CONFIG_DIR:-/data/claude}"
chmod 700 "${CLAUDE_CONFIG_DIR:-/data/claude}"

# Git: a GitHub token (read + write on the repo) from the environment, never written to the disk.
if [ -n "${GITHUB_TOKEN:-}" ]; then
  git config --global credential.helper '!f() { echo username=x-access-token; echo "password=${GITHUB_TOKEN}"; }; f'
fi
git config --global user.name "${STUDIO_GIT_NAME:-Design Studio}"
git config --global user.email "${STUDIO_GIT_EMAIL:-design-studio@users.noreply.github.com}"
git config --global --add safe.directory "$REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "[studio] First start: cloning $REPO_URL"
  git clone "$REPO_URL" "$REPO_DIR"
  cd "$REPO_DIR"
  if git ls-remote --exit-code --heads origin "$WORK" >/dev/null 2>&1; then git checkout -B "$WORK" "origin/$WORK"; else git checkout -B "$WORK" --no-track "origin/$BASE"; fi
else
  cd "$REPO_DIR"
  git checkout -q "$WORK" 2>/dev/null || git checkout -q -B "$WORK"
  if git fetch -q origin; then
    # Bring in the team's latest main. On a conflict nothing changes and the studio runs as it was.
    git merge -q --no-edit "origin/$BASE" || { git merge --abort || true; echo "[studio] Could not merge origin/$BASE into $WORK (conflict). Running the current version; see docs/DEPLOY_AWS.md → Updating."; }
  else
    echo "[studio] git fetch failed; running the current version."
  fi
fi

install_if_changed() {
  local dir="$1"
  local stamp="$dir/node_modules/.lock-stamp"
  local lock="$dir/package-lock.json"
  if [ ! -d "$dir/node_modules" ] || [ ! -f "$stamp" ] || ! cmp -s "$lock" "$stamp"; then
    echo "[studio] Installing packages in ${dir#$REPO_DIR/}"
    (cd "$dir" && if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi)
    [ -f "$lock" ] && cp "$lock" "$stamp" || true
  fi
}
install_if_changed "$REPO_DIR/apps/studio"
install_if_changed "$REPO_DIR/apps/live-site"

cd "$REPO_DIR/apps/studio"
exec node server.mjs
