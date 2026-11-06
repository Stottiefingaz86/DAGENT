#!/bin/bash
# Pushes two NEW preview branches to GitHub; Vercel builds each one as a private preview.
# The live site is not touched: only the main branch goes live, and nothing here pushes to main.
#   lumen-fixes  — today's exact Lumen fixes (should look identical to live)
#   lumen-snap   — same + off-scale font sizes / card shadow snapped to Lumen (to compare)
cd "$(dirname "$0")" || exit 1
# Commits must carry your GitHub identity, or Vercel blocks builds from a private repo.
git config user.name "Chris Hunt"
git config user.email "218967618+Stottiefingaz86@users.noreply.github.com"
echo ""; echo "  1/2 Pushing lumen-fixes…"
git add -A
git commit -q -m "Lumen fixes: exact token swaps, sub-nav thumb on primary, token confetti, lint corrections" || echo "  (nothing new to commit)"
git push origin HEAD:refs/heads/lumen-fixes || { echo "  Push failed."; read -r -p "  Press Enter to close."; exit 1; }
echo ""; echo "  2/2 Pushing lumen-snap…"
WT="$(mktemp -d)/snap"
git worktree add -q --detach "$WT" HEAD
rsync -a --exclude .vercel --exclude node_modules --exclude '.next*' .studio-preview/live-site-snap/ "$WT/apps/live-site/"
( cd "$WT" && git add -A && git commit -q -m "Preview only: snap off-scale font sizes and card shadow to Lumen" && git push -q origin HEAD:refs/heads/lumen-snap )
git worktree remove "$WT"
echo ""; echo "  Done. Vercel is building both previews. Tell Claude: \"previews are up\"."
read -r -p "  Press Enter to close."
