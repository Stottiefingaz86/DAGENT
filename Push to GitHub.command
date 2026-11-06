#!/bin/bash
# Pushes this folder to github.com/Stottiefingaz86/DAGENT using YOUR git login on this Mac.
# Secrets (.env, API keys, studio passwords), installed packages and build files are never pushed (.gitignore).
cd "$(dirname "$0")" || exit 1
REMOTE="https://github.com/Stottiefingaz86/DAGENT.git"
echo ""
echo "  Push the design repo to GitHub (DAGENT)"
echo ""
if [ ! -d .git ]; then
  git init -q -b main
  git remote add origin "$REMOTE"
fi
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REMOTE" || git remote add origin "$REMOTE"

read -r -p "  Is DAGENT set to PRIVATE on GitHub? (y/n) " PRIV
mkdir -p .git/info
if [ "$PRIV" = "y" ] || [ "$PRIV" = "Y" ]; then
  : > .git/info/exclude
  echo "  Private → including strategy, research and BRDs (specs/)."
else
  printf 'specs/\n.cursor/knowledge/product-strategy/\ninbox/processed/\n' > .git/info/exclude
  echo "  Public → leaving out strategy, research and BRDs (specs/)."
fi

# Last safety check: never push an API key.
if git add -A --dry-run | sed 's/^add .//; s/.$//' | xargs -I{} grep -IlE "sk-ant-[A-Za-z0-9_-]{20,}" "{}" 2>/dev/null | grep -q .; then
  echo ""; echo "  STOPPED: a file contains an Anthropic API key. Nothing was pushed."; read -r -p "  Press Enter to close."; exit 1
fi

git add -A
git -c user.name="Chris Hunt" commit -q -m "Design Studio + design repo update $(date '+%Y-%m-%d %H:%M')" || echo "  Nothing new to commit."
echo "  Pushing…"
if git push -u origin main; then
  echo ""; echo "  Done → https://github.com/Stottiefingaz86/DAGENT"
else
  echo ""
  echo "  Push failed. GitHub needs you to sign in once:"
  echo "   • If a GitHub sign-in window or browser opened, finish it and double-click this again."
  echo "   • If it asked for a password: use a token, not your password — github.com → Settings → Developer settings → Personal access tokens → Fine-grained → access to DAGENT, Contents: Read and write. Paste it as the password."
  echo "   • Or open GitHub Desktop → File → Add local repository → this folder → Publish/Push."
fi
read -r -p "  Press Enter to close."
