#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW (RESET MEMORY) ================="
cat <<'PROMPT'
RESET MEMORY
Reload all /docs/ai/* and /docs/ai/state.json; summarize in 5 bullets; propose today’s 3-task plan; WAIT.
PROMPT
echo "================= END COPY ================="
