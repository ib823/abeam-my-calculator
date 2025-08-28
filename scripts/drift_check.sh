#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW (DRIFT CHECK) ================="
cat <<'PROMPT'
DRIFT CHECK
Compare implementation vs:
- /docs/ai/ux-contract.md
- /docs/ai/definition-of-done.md
- Lighthouse budgets
List violations and output diffs to fix (with effort S/M/L).
PROMPT
echo "================= END COPY ================="
