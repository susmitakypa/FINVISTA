#!/bin/bash
# Double-click this file on a Mac, or run it from Terminal.
# Picks Screener screenshots and sends them to the live FinVista extract API.

set -euo pipefail

BASE_URL="${FINVISTA_URL:-https://finvista-app-lemon.vercel.app}"
API_KEY="${FINVISTA_API_KEY:-}"
OUT_DIR="${HOME}/Downloads/FinVista"
mkdir -p "$OUT_DIR"

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

if [ -z "$API_KEY" ]; then
  API_KEY="$(osascript -e 'text returned of (display dialog "Enter FINVISTA_API_KEY (same as Vercel)" default answer "" with hidden answer)' 2>/dev/null || true)"
fi
if [ -z "$API_KEY" ]; then
  osascript -e 'display dialog "FINVISTA_API_KEY is required for the live site." buttons {"OK"} default button 1'
  exit 1
fi

CURL_ARGS=(-sS -X POST "${BASE_URL}/api/extract" -F "format=csv" -H "X-Api-Key: ${API_KEY}")

while IFS= read -r path; do
  [ -z "$path" ] && continue
  CURL_ARGS+=(-F "files=@${path}")
done <<< "$FILE_LIST"

CSV_PATH="$OUT_DIR/extract.csv"
HTTP_CSV="$(mktemp)"
trap 'rm -f "$HTTP_CSV"' EXIT

if ! curl "${CURL_ARGS[@]}" -o "$HTTP_CSV" -w "%{http_code}" > "$OUT_DIR/last-status.txt"; then
  osascript -e 'display dialog "Could not reach FinVista. Check your internet connection." buttons {"OK"} default button 1'
  exit 1
fi

STATUS="$(cat "$OUT_DIR/last-status.txt")"
if [ "$STATUS" != "200" ]; then
  osascript -e "display dialog \"FinVista returned HTTP $STATUS. See ~/Downloads/FinVista.\" buttons {\"OK\"} default button 1"
  cp "$HTTP_CSV" "$CSV_PATH"
  exit 1
fi

cp "$HTTP_CSV" "$CSV_PATH"

if [ -d "/Applications/Microsoft Excel.app" ]; then
  open -a "Microsoft Excel" "$CSV_PATH"
else
  open "$CSV_PATH"
fi
