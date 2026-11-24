#!/bin/bash
# Pushes the CLEAN copy in _designagent/ (brand name removed, logos neutral, PDFs left out, fresh history)
# to github.com/ft-unified-platform/DesignAgent over HTTPS, using your GitHub login on this Mac.
# Your working folder and the DAGENT repo are not touched. Never force-pushes.
cd "$(dirname "$0")/_designagent" || { echo "  The clean copy (_designagent) is missing — ask Claude to rebuild it."; read -r -p "  Press Enter to close."; exit 1; }
echo ""
echo "  Which GitHub account has access to ft-unified-platform/DesignAgent?"
echo "  (Open github.com/ft-unified-platform/DesignAgent in your browser — the account that can see it.)"
read -r -p "  GitHub username: " GHUSER
GHUSER="${GHUSER// /}"
if [ -n "$GHUSER" ]; then REMOTE="https://${GHUSER}@github.com/ft-unified-platform/DesignAgent.git"; else REMOTE="https://github.com/ft-unified-platform/DesignAgent.git"; fi
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "$REMOTE" || git remote add origin "$REMOTE"
echo ""
echo "  Push the Design Studio (clean copy) to ft-unified-platform/DesignAgent"
echo ""
if git ls-remote --heads origin 2>/dev/null | grep -q .; then BRANCH=work; else BRANCH=main; fi
echo "  Pushing to ${BRANCH} ..."
if git push origin "HEAD:refs/heads/${BRANCH}"; then
  echo ""
  if [ "$BRANCH" = main ]; then echo "  Done → https://github.com/ft-unified-platform/DesignAgent"
  else echo "  Done → https://github.com/ft-unified-platform/DesignAgent/tree/work  (open a pull request into main)"; fi
else
  echo ""
  echo "  Push failed. Usually one of:"
  echo "   • GitHub asked you to sign in: finish it in the window/browser that opened, then double-click this again."
  echo "   • It asked for a password: use a token — github.com → Settings → Developer settings → Personal access tokens →"
  echo "     Fine-grained → Resource owner: ft-unified-platform → repo DesignAgent → Contents: Read and write. Paste it as the password."
  echo "   • Your account doesn't have write access to DesignAgent — ask an ft-unified-platform org owner."
fi
read -r -p "  Press Enter to close."
