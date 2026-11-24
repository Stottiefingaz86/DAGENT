#!/usr/bin/env bash
# Server only (Linux / Docker): one-time sign-in of the design agent to Figma and Mobbin.
# The sign-ins are kept in CLAUDE_CONFIG_DIR (on the server's permanent disk) and renew themselves.
#
# The sign-in page redirects to a fixed port on the server (53682 Figma, 53683 Mobbin). Forward both ports
# from your laptop first, e.g.
#   ssh -L 53682:127.0.0.1:53682 -L 53683:127.0.0.1:53683 ec2-user@<server>
# or with SSM:  aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSession \
#                 --parameters '{"portNumber":["53682"],"localPortNumber":["53682"]}'   (and again for 53683)
# then run:  docker compose exec -it studio apps/studio/scripts/connect-tools.sh
set -u
cd "$(dirname "$0")/.." || exit 1
CLAUDE="$(ls node_modules/@anthropic-ai/claude-agent-sdk-*/claude 2>/dev/null | head -1)"
if [ -z "$CLAUDE" ]; then echo "Claude Code not found: run npm ci in apps/studio first."; exit 1; fi
CLAUDE="$PWD/$CLAUDE"
cd ../.. || exit 1
FIGMA_PORT="${FIGMA_CALLBACK_PORT:-53682}"
MOBBIN_PORT="${MOBBIN_CALLBACK_PORT:-53683}"
LIST="$("$CLAUDE" mcp list 2>&1 || true)"
echo "$LIST" | grep -qi "^figma" || "$CLAUDE" mcp add --scope user --transport http --callback-port "$FIGMA_PORT" figma https://mcp.figma.com/mcp
echo "$LIST" | grep -qi "^mobbin" || "$CLAUDE" mcp add --scope user --transport http --callback-port "$MOBBIN_PORT" mobbin https://api.mobbin.com/mcp
cat <<MSG

  Sign in (one time each). Ports $FIGMA_PORT and $MOBBIN_PORT must be forwarded from your laptop (see the top of this file).
   • Claude Code opens below. Type  /mcp  → figma → Authenticate.
     Open the link it prints in YOUR laptop's browser, sign in with the design team's Figma account → Allow.
   • /mcp again → mobbin → Authenticate → sign in to the team's paid Mobbin account → Allow.
   • Type  /exit  when both say connected.

MSG
"$CLAUDE"
echo ""
"$CLAUDE" mcp list 2>&1 | grep -iE "^(figma|mobbin)" || true
echo ""
echo "  Then in the studio: Home → Check again."
