#!/bin/bash
# Terminal helper: send screenshots to the Excel extract endpoint and print CSV.
# Usage:
#   ./excel/send-screenshots.sh ~/Desktop/pnl.png ~/Desktop/bs.png

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 screenshot.png [more.png ...]"
  exit 1
fi

BASE_URL="${FINVISTA_URL:-https://finvista-app-lemon.vercel.app}"

ARGS=(-sS --max-time 180 -X POST "$BASE_URL/api/excel/extract")
for path in "$@"; do
  ARGS+=(-F "files=@${path}")
done

curl "${ARGS[@]}"
echo
