#!/bin/bash
# Double-click to start the prototype lane (http://127.0.0.1:3001/prototype/<slug>).
cd "$(dirname "$0")/apps/live-site" || exit 1
if [ ! -d node_modules ]; then echo "First run: installing the live site (a few minutes)…"; npm install || { read -n 1 -s -r -p "Install failed. Press any key."; exit 1; }; fi
npm run dev:3001
