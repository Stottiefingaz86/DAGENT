#!/bin/bash
# One-time: connect the studio's design agent to Figma (official Figma MCP), so "Build in Figma" and
# "Check Lumen in Figma" work. Uses the Claude Code program that ships with the studio.
cd "$(dirname "$0")/apps/studio" || exit 1
CLAUDE="$(ls node_modules/@anthropic-ai/claude-agent-sdk-*/claude 2>/dev/null | head -1)"
if [ -z "$CLAUDE" ]; then
  echo ""; echo "  Start the Design Studio once first (it installs what this needs), then run this again."
  read -r -p "  Press Enter to close."; exit 1
fi
# Use the studio's active API key for this one session (it never leaves this Mac).
export ANTHROPIC_API_KEY="$(node -e "try{const k=JSON.parse(require('fs').readFileSync('.env.keys','utf8'));const a=k.keys.find(x=>x.id===k.active);process.stdout.write(a?a.key:'')}catch{}")"
echo ""
echo "  1/2 Adding Figma to Claude Code…"
"$CLAUDE" mcp add --scope user --transport http figma https://mcp.figma.com/mcp 2>&1 | sed 's/^/      /' || true
echo ""
echo "  2/2 Sign in to Figma (one time):"
echo "      • Claude Code opens below. If it asks about the API key, choose Yes."
echo "      • Type  /mcp  and press Enter → choose  figma  → Authenticate."
echo "      • Your browser opens: sign in with the Figma account that sees the Lumen library, and Allow."
echo "      • Back here, type  /exit"
echo ""
read -r -p "  Press Enter to open Claude Code… " _
"$CLAUDE"
echo ""
echo "  Checking the Figma connection…"
STATUS="$("$CLAUDE" mcp list 2>&1 | grep -i figma)"
echo "      $STATUS"
if echo "$STATUS" | grep -qiE "connected|✓"; then
  echo ""; echo "  ✓ Figma is connected. Restart the Design Studio (close its Terminal window, double-click Start Design Studio), then Build in Figma."
else
  echo ""; echo "  ✗ Not connected yet. Run this again and in Claude Code type /mcp → figma → Authenticate, and finish the sign-in in the browser."
fi
read -r -p "  Press Enter to close."
