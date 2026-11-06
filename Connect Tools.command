#!/bin/bash
# One-time (per machine): connect the design agent to Figma and Mobbin (official MCP servers).
# The studio stays switched off until both are connected. Uses the Claude Code program that ships with the studio.
cd "$(dirname "$0")/apps/studio" || exit 1
CLAUDE="$(ls node_modules/@anthropic-ai/claude-agent-sdk-*/claude 2>/dev/null | head -1)"
if [ -z "$CLAUDE" ]; then
  echo ""; echo "  Run Setup.command first (it installs what this needs), then run this again."
  read -r -p "  Press Enter to close."; exit 1
fi
# Use the studio's active API key for this one session (it never leaves this machine).
export ANTHROPIC_API_KEY="$(node scripts/active-key.cjs)"
cd ../.. || exit 1
echo ""
echo "  1/2 Adding Figma and Mobbin to Claude Code…"
"apps/studio/$CLAUDE" mcp add --scope user --transport http figma https://mcp.figma.com/mcp 2>&1 | sed 's/^/      /' || true
"apps/studio/$CLAUDE" mcp add --scope user --transport http mobbin https://api.mobbin.com/mcp 2>&1 | sed 's/^/      /' || true
echo ""
echo "  2/2 Sign in (one time each):"
echo "      • Claude Code opens below. If it asks about the API key, choose Yes."
echo "      • Type  /mcp  and press Enter → choose  figma  → Authenticate → sign in with the Figma account that sees Lumen → Allow."
echo "      • Type  /mcp  again → choose  mobbin  → Authenticate → sign in to Mobbin (paid plan) → Allow."
echo "      • Back here, type  /exit"
echo ""
echo "  Note: \"already exists\" above just means Figma/Mobbin are added. They still need the sign-in below."
echo ""
read -r -p "  Press Enter to open Claude Code (wait for its screen, THEN type /mcp)… " _
"apps/studio/$CLAUDE"
echo ""
echo "  Checking…"
LIST="$("apps/studio/$CLAUDE" mcp list 2>&1)"
for T in figma mobbin; do
  LINE="$(echo "$LIST" | grep -i "^$T")"
  if echo "$LINE" | grep -qiE "✓|connected" && ! echo "$LINE" | grep -qiE "✗|failed|needs auth"; then echo "      ✓ $T connected"; else echo "      ✗ $T not connected — run this again and Authenticate $T in /mcp"; fi
done
echo ""
echo "  Then in the studio: Home → Check again."
read -r -p "  Press Enter to close."
