#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW (DRIFT CHECK) ================="
cat <<'PROMPT'
DRIFT CHECK
Compare implementation vs:
- /docs/ai/ux-contract.md
- /docs/ai/definition-of-done.md
- Lighthouse budgets

Execution rules:
- Never assume. Confirm file paths with me first.
- Output exact violations.
- Propose full diffs or complete file bodies to fix, with effort S/M/L.
- WAIT for me to confirm before proceeding.
PROMPT
echo "================= END COPY ================="
