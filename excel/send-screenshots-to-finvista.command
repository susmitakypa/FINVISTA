#!/bin/bash
# Double-click this file on a Mac, or run it from Terminal.
# It asks you to pick Screener screenshots, sends them to FinVista, then opens CSV in Excel.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SCRIPT_DIR/output"
mkdir -p "$OUT_DIR"

BASE_URL="${FINVISTA_URL:-http://localhost:3000}"
API_KEY="${FINVISTA_API_KEY:-}"

FILE_LIST="$(osascript <<'APPLESCRIPT'
try
  set theFiles to choose file with prompt "Select Screener screenshots for FinVista" of type {"public.png", "public.jpeg", "public.webp"} with multiple selections allowed
on error
  return ""
end try
set output to ""
repeat with f in theFiles
  set output to output & POSIX path of f & linefeed
end repeat
return output
APPLESCRIPT
)"

if [ -z "${FILE_LIST//[[:space:]]/}" ]; then
  osascript -e 'display dialog "No screenshots selected." buttons {"OK"} default button 1'
  exit 0
fi

CURL_ARGS=(-sS -X POST "$BASE_URL/api/extract?format=csv")
if [ -n "$API_KEY" ]; then
  CURL_ARGS+=(-H "X-Api-Key: $API_KEY")
fi

while IFS= read -r path; do
  [ -z "$path" ] && continue
  CURL_ARGS+=(-F "files=@${path}")
done <<< "$FILE_LIST"

CSV_PATH="$OUT_DIR/finvista-extract.csv"

HTTP_CSV="$(mktemp)"
trap 'rm -f "$HTTP_CSV"' EXIT

if ! curl "${CURL_ARGS[@]}" -o "$HTTP_CSV" -w "%{http_code}" > "$OUT_DIR/last-status.txt"; then
  osascript -e 'display dialog "Could not reach FinVista. Start the app with npm run dev, then try again." buttons {"OK"} default button 1'
  exit 1
fi

STATUS="$(cat "$OUT_DIR/last-status.txt")"
if [ "$STATUS" != "200" ]; then
  osascript -e "display dialog \"FinVista returned HTTP $STATUS. Check Terminal or excel/output.\" buttons {\"OK\"} default button 1"
  cp "$HTTP_CSV" "$CSV_PATH"
  exit 1
fi

cp "$HTTP_CSV" "$CSV_PATH"

if [ -d "/Applications/Microsoft Excel.app" ]; then
  open -a "Microsoft Excel" "$CSV_PATH"
else
  open "$CSV_PATH"
fi
