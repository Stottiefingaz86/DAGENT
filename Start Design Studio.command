#!/bin/bash
# Double-click to start the Design Studio (http://localhost:4100).
cd "$(dirname "$0")/apps/studio" || exit 1
echo ""
echo "  Design Studio"
echo "  -------------"
if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js isn't installed. Get the LTS version from https://nodejs.org, then double-click this again."
  read -n 1 -s -r -p "  Press any key to close."; exit 1
fi
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  echo "  Installing / updating (takes a minute)…"
  npm install || { echo "  Install failed — copy the lines above to Claude."; read -n 1 -s -r -p "  Press any key to close."; exit 1; }
fi
[ -f .env ] || cp .env.example .env
( sleep 2; open "http://localhost:4100" ) &
npm start
