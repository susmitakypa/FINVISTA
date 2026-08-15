#!/bin/bash
# Installs the AppleScript Excel for Mac needs (sandbox). No website/API changes.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Scripts/com.microsoft.Excel"

mkdir -p "$DEST"
cp "$SRC_DIR/FinVistaExtract.applescript" "$DEST/FinVistaExtract.applescript"

osascript <<'APPLESCRIPT'
display dialog "FinVista Excel helper installed.

Next:
1. Quit Microsoft Excel completely (Cmd+Q)
2. Reopen Excel
3. Developer → Macros → SendScreenerToFinVista
   (or Alt/Option+F8)

The macro will ask for your API key, then let you choose a Screener screenshot." buttons {"OK"} default button 1 with title "FinVista"
APPLESCRIPT
