#!/bin/bash
# FinVista → Excel on Mac (no VBA, no macros).
# Double-click this file, pick a Screener screenshot, Excel opens the CSV.

set -euo pipefail

BASE_URL="${FINVISTA_URL:-https://finvista-app-lemon.vercel.app}"
API_KEY="${FINVISTA_API_KEY:-}"
OUT_DIR="${HOME}/Downloads/FinVista"
mkdir -p "$OUT_DIR"

FILE_LIST="$(osascript <<'APPLESCRIPT'
try
  set theFiles to choose file with prompt "Select Screener screenshot(s) for FinVista" of type {"public.png", "public.jpeg", "public.webp"} with multiple selections allowed
on error
  return ""
end try
if class of theFiles is not list then set theFiles to {theFiles}
set output to ""
repeat with f in theFiles
  set output to output & POSIX path of f & linefeed
end repeat
return output
APPLESCRIPT
)"

if [ -z "${FILE_LIST//[[:space:]]/}" ]; then
  osascript -e 'display dialog "No screenshots selected." buttons {"OK"} default button 1 with title "FinVista"'
  exit 0
fi

if [ -z "$API_KEY" ]; then
  API_KEY="$(osascript -e 'text returned of (display dialog "Enter FINVISTA_API_KEY (same as Vercel)" default answer "" with hidden answer with title "FinVista")' 2>/dev/null || true)"
fi
if [ -z "$API_KEY" ]; then
  osascript -e 'display dialog "FINVISTA_API_KEY is required." buttons {"OK"} default button 1 with title "FinVista"'
  exit 1
fi

CSV_PATH="$OUT_DIR/extract.csv"
HTTP_CSV="$(mktemp)"
STATUS_FILE="$(mktemp)"
trap 'rm -f "$HTTP_CSV" "$STATUS_FILE"' EXIT

CURL_ARGS=(-sS --max-time 180 -X POST "${BASE_URL}/api/extract" -F "format=csv" -H "X-Api-Key: ${API_KEY}")
while IFS= read -r path; do
  path="${path%$'\r'}"
  [ -z "$path" ] && continue
  CURL_ARGS+=(-F "files=@${path}")
done <<< "$FILE_LIST"

set +e
curl "${CURL_ARGS[@]}" -o "$HTTP_CSV" -w "%{http_code}" > "$STATUS_FILE"
CURL_EXIT=$?
set -e
STATUS="$(tr -d '[:space:]' < "$STATUS_FILE")"

if [ "$CURL_EXIT" -ne 0 ]; then
  osascript -e 'display dialog "Could not reach FinVista. Check your internet connection." buttons {"OK"} default button 1 with title "FinVista"'
  exit 1
fi

cp "$HTTP_CSV" "$CSV_PATH"

if [ "$STATUS" != "200" ]; then
  osascript -e "display dialog \"FinVista returned HTTP ${STATUS}. The response is in Downloads/FinVista/extract.csv\" buttons {\"OK\"} default button 1 with title \"FinVista\""
  exit 1
fi

if [ -d "/Applications/Microsoft Excel.app" ]; then
  open -a "Microsoft Excel" "$CSV_PATH"
else
  open "$CSV_PATH"
fi
