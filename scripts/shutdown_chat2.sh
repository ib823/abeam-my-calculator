#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW TO END TODAY'S Chat 2 ================="
cat <<'PROMPT'
STATE_SYNC
1) Update /docs/ai/state.json (lastSync, next3Tasks, risks).
2) Append decisions to /docs/ai/decisions.md (DEC-YYYYMMDD-# bullets).
3) Refresh /docs/ai/backlog.md (move done items).
4) Regenerate /docs/ai/handover.md (max 1 page).

Execution rules:
- No assumptions. Confirm file paths exist before writing.
- If editing a file, output the full new content (not a diff, not a placeholder).
- End with a single PR named “state sync” containing those changes.
- STOP and WAIT for me to confirm merge before continuing.
PROMPT
echo "================= END COPY ================="
