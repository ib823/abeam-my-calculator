#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW INTO NEW Chat 2 ================="
cat <<'PROMPT'
LOAD SETUP (do not act yet)
Read:
- /docs/ai/ai-setup.md
- /docs/ai/product-context.md
- /docs/ai/ux-contract.md
- /docs/ai/definition-of-done.md
- /docs/ai/backlog.md
- /docs/ai/decisions.md
- /docs/ai/state.json

Protocol:
1) Only reply: “Setup v<setupVersion> loaded.” + 5-bullet summary of state.json.
2) Propose TODAY PLAN: exactly 3 tasks (S/M/L) with acceptance criteria.
3) WAIT. Do not act until I say: BEGIN.

Phase control:
- I will say “BEGIN: PLAN”, “BEGIN: IMPLEMENT”, “BEGIN: TEST”, “BEGIN: PR_PACKAGE”, “BEGIN: STATE_SYNC”.
- If I say “PAUSE”, stop and summarize last completed phase in 5 bullets.
- If blocked, list assumptions (A1..), 3 options table (pros/cons/impact), pick safest, WAIT.

Strict execution rules (override defaults):
- Never assume a file or folder exists. Always confirm prerequisites: ask me to run pwd/ls/grep before acting.
- Never output placeholders. Always provide full, copy-pasteable code blocks for terminal, or the complete file body if editing.
- Always state the expected success criteria (what output/log I should see) before moving forward.
- Do not continue until I confirm the step succeeded.
PROMPT
echo "================= END COPY ================="
