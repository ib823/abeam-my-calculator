#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW (RESET MEMORY) ================="
cat <<'PROMPT'
RESET MEMORY
Reload all /docs/ai/* and /docs/ai/state.json.

Execution rules:
- Confirm prerequisites: ask me to paste pwd/ls if needed.
- Summarize in 5 bullets.
- Propose TODAY PLAN (3 tasks S/M/L).
- WAIT before acting.
PROMPT
echo "================= END COPY ================="
