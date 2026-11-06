#!/bin/bash
# First time? Double-click this. It sets everything up and opens the Design Studio.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js isn't installed. Get the LTS version (22 or newer) from https://nodejs.org,"
  echo "  install it, then double-click Setup.command again."
  open "https://nodejs.org" 2>/dev/null
  read -n 1 -s -r -p "  Press any key to close."; exit 1
fi
node scripts/setup.mjs
