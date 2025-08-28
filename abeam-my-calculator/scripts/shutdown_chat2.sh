#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW TO END TODAY'S Chat 2 ================="
cat <<'PROMPT'
STATE_SYNC
1) Update /docs/ai/state.json (lastSync, next3Tasks, risks).
2) Append decisions to /docs/ai/decisions.md (DEC-YYYYMMDD-# bullets).
3) Refresh /docs/ai/backlog.md (move done items).
4) Regenerate /docs/ai/handover.md (max 1 page).
Output: a single PR named “state sync” with the diffs. WAIT.
PROMPT
echo "================= END COPY ================="
