#!/bin/bash
# Terminal helper: send screenshots and print JSON (or CSV).
# Usage:
#   ./excel/send-screenshots.sh ~/Desktop/pnl.png ~/Desktop/bs.png
# CSV instead of JSON:
#   FINVISTA_FORMAT=csv ./excel/send-screenshots.sh ~/Desktop/pnl.png

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 screenshot.png [more.png ...]"
  exit 1
fi

BASE_URL="${FINVISTA_URL:-https://finvista-app-lemon.vercel.app}"
API_KEY="${FINVISTA_API_KEY:-}"
FORMAT="${FINVISTA_FORMAT:-json}"

ARGS=(-sS -X POST "$BASE_URL/api/extract")
if [ -n "$API_KEY" ]; then
  ARGS+=(-H "X-Api-Key: $API_KEY")
fi
if [ "$FORMAT" = "csv" ]; then
  ARGS+=(-F "format=csv")
fi

for path in "$@"; do
  ARGS+=(-F "files=@${path}")
done

curl "${ARGS[@]}"
echo
