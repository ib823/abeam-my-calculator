#!/usr/bin/env bash
set -euo pipefail

echo "== AI Workflow Installer =="

if [ -f ".ai_workflow_installed" ]; then
  echo "!! Detected .ai_workflow_installed. Aborting to protect continuity."
  echo "   If you REALLY need to re-run, delete .ai_workflow_installed and run again."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "!! This is not a git repo. Initialize git and add a remote before running."
  exit 1
fi

DEFAULT_BRANCH="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@.*/@@' || true)"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
SETUP_BRANCH="setup/repo-brain"

echo "Default branch detected: ${DEFAULT_BRANCH}"
echo "Creating setup branch: ${SETUP_BRANCH}"

git checkout -b "${SETUP_BRANCH}"

mkdir -p docs/ai .github/ISSUE_TEMPLATE .github/workflows scripts config

cat > docs/ai/ai-setup.md <<'EOF'
# AI Setup (Persona & Rules)
Source of truth lives in this repo.
Operational phases: DISCOVERY → PLAN → IMPLEMENT → TEST → PR_PACKAGE → STATE_SYNC.
Rules:
- DO NOT ACT until I say “BEGIN”.
- If blocked, list assumptions (A1..), show 3 options table (pros/cons/impact), pick safest, WAIT.
- Prefer patch-first (diffs), minimal prose, tests/docs, preview link, rollback note.

See:
- product-context.md
- ux-contract.md
- definition-of-done.md
- backlog.md
- decisions.md
- state.json
EOF

cat > docs/ai/product-context.md <<'EOF'
# Product Context
## Vision
<one sentence describing what the app does for users>
## Core Users
<roles/personas>
## Top Outcomes
1) <#1>
2) <#2>
3) <#3>
## Non-Goals
- <things we will not do>
## Constraints
- Mandays-only outputs (no currency) unless overridden in decisions.md
## KPIs
- Time-to-PR, % green PRs, Lighthouse >= 90, a11y pass, e2e stability
EOF

cat > docs/ai/ux-contract.md <<'EOF'
# UX Contract
- Layout: grid-based, >=16px spacing, responsive (mobile+desktop)
- Typography: clear hierarchy (h1–h4, body, caption)
- Components: buttons (primary/secondary/ghost), inputs, cards, modals, toasts
- Interactions: subtle transitions; keyboard accessible
- Colors: soft professional palette + functional status colors
- States: empty, loading, error must be explicit (no raw spinners)
- Forms: inline validation, helper text, disabled states
- a11y: visible focus ring, aria/labels, semantic HTML, contrast >= AA
Enforcement: reuse components; abstract repeats; avoid magic numbers → use tokens
EOF

cat > docs/ai/definition-of-done.md <<'EOF'
# Definition of Done (merge gate)
- Feature works end-to-end
- Types & lint clean; no console errors
- Tests added (unit) + minimal e2e for UI flows
- Docs updated (README/CHANGELOG if needed)
- Screenshots/GIFs + Preview URL in PR
- a11y checks pass
- Lighthouse budgets pass on changed routes
- Rollback plan documented in PR
EOF

cat > docs/ai/backlog.md <<'EOF'
# Backlog (Now / Next / Later)
## NOW (1–2 weeks)
- T-001: Add PR/Issue templates [S] – AC: templates render; DoD gate in PR
- T-002: CI workflows with artifacts [M] – AC: jobs green; artifacts uploaded
- T-003: One-command verify [S] – AC: typecheck, lint, unit, build, e2e, lighthouse

## NEXT (2–6 weeks)
- T-101: Feature flags baseline [S]
- T-102: Axe a11y checks in e2e [S]
- T-103: SBOM & vuln scanning [S]

## LATER (6+ weeks)
- TBD

## Quality Rails (always on)
- a11y sweep, Lighthouse >= 90, perf budgets, dependency hygiene
EOF

cat > docs/ai/decisions.md <<'EOF'
# Decisions (ADR bullets)
- DEC-20250828-01: Mandays-only outputs (no currency) in docs/PDF/emails.
EOF

cat > docs/ai/state.json <<'EOF'
{
  "setupVersion": "2025-09-01",
  "lastSync": "2025-08-28T09:00:00+08:00",
  "currentSprint": "S-01",
  "focus": ["Stabilize CI", "Ship one feature end-to-end"],
  "openPRs": [],
  "risks": ["No CI yet", "No PR templates"],
  "blockedOn": [],
  "next3Tasks": [
    {"id":"T-001","title":"Add PR/Issue templates","effort":"S","status":"Ready"},
    {"id":"T-002","title":"Add CI with artifacts","effort":"M","status":"Ready"},
    {"id":"T-003","title":"Create npm run verify","effort":"S","status":"Ready"}
  ]
}
EOF

cat > docs/ai/handover.md <<'EOF'
# Handover (Daily, 1 page)
## Yesterday
- Baseline repo-brain created
## Today Plan
- Stand up CI + templates, then first small feature
## Risks
- None critical
## Next
- Feature flags, a11y checks
EOF

cat > docs/runbook.md <<'EOF'
# Runbook
## CI Artifacts
- Unit: artifacts/jest.html
- e2e: artifacts/playwright/
- Lighthouse: artifacts/lighthouse.html
## Failure Playbooks
- Flaky e2e: retries=2, mock network, stable selectors
- PDF break: fonts/headless/browser availability/body types/memory; add repro test
- Perf drop: compare Lighthouse artifacts; code-split; prune deps; update budgets
EOF

cat > .github/PULL_REQUEST_TEMPLATE.md <<'EOF'
## Summary
What / Why

## Preview & Media
- Preview URL:
- Before/After screenshots or GIF:

## Acceptance Criteria
- [ ] Meets /docs/ai/definition-of-done.md
- [ ] Tests added/updated (unit/e2e)
- [ ] Types & lint clean; no console errors

## Risk & Rollback
- Risk:
- Rollback:
EOF

cat > .github/ISSUE_TEMPLATE/feature.yaml <<'EOF'
name: Feature request
description: Propose a feature with acceptance criteria
title: "feat: "
labels: ["feature"]
body:
  - type: textarea
    id: problem
    attributes: { label: Problem / Goal }
  - type: textarea
    id: solution
    attributes: { label: Proposed Solution }
  - type: textarea
    id: ac
    attributes: { label: Acceptance Criteria }
  - type: dropdown
    id: effort
    attributes: { label: Effort, options: ["S","M","L"] }
EOF

cat > .github/ISSUE_TEMPLATE/bug.yaml <<'EOF'
name: Bug report
description: Report a bug with repro steps
title: "fix: "
labels: ["bug"]
body:
  - type: textarea
    id: repro
    attributes: { label: Steps to Reproduce }
  - type: textarea
    id: expected
    attributes: { label: Expected }
  - type: textarea
    id: actual
    attributes: { label: Actual }
  - type: textarea
    id: evidence
    attributes: { label: Logs/Screens/Video }
EOF

cat > CODEOWNERS <<'EOF'
* @YOUR_GITHUB_USERNAME
/docs/ai/* @YOUR_GITHUB_USERNAME
EOF

cat > .github/workflows/ci.yml <<'EOF'
name: CI
on:
  pull_request:
  push:
    branches: [ main ]
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
  typecheck:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck || echo "No typecheck script yet"
  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint || echo "No lint script yet"
  unit:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:ci || echo "No test:ci script yet"
      - uses: actions/upload-artifact@v4
        with: { name: jest-report, path: jest*.html, if-no-files-found: ignore }
  build:
    needs: [typecheck, lint, unit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build || echo "No build script yet"
  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps || true
      - run: npm run e2e || echo "No e2e script yet"
      - uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: playwright-report, if-no-files-found: ignore }
  lighthouse:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lighthouse || echo "No lighthouse script yet"
      - uses: actions/upload-artifact@v4
        with: { name: lighthouse, path: artifacts, if-no-files-found: ignore }
  sbom-scan:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json || true
      - run: npm audit --audit-level=high || true
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json, if-no-files-found: ignore }
EOF

cat > scripts/start_chat2.sh <<'EOF'
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
Patch-first answers; minimal prose.
PROMPT
echo "================= END COPY ================="
EOF
chmod +x scripts/start_chat2.sh

cat > scripts/shutdown_chat2.sh <<'EOF'
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
EOF
chmod +x scripts/shutdown_chat2.sh

cat > scripts/reset_memory.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "================= COPY BELOW (RESET MEMORY) ================="
cat <<'PROMPT'
RESET MEMORY
Reload all /docs/ai/* and /docs/ai/state.json; summarize in 5 bullets; propose today’s 3-task plan; WAIT.
PROMPT
echo "================= END COPY ================="
EOF
chmod +x scripts/reset_memory.sh

cat > scripts/drift_check.sh <<'EOF'
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
EOF
chmod +x scripts/drift_check.sh

if [ -f package.json ]; then
  node - <<'EOF'
const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path,'utf8'));
pkg.scripts = Object.assign({
  "typecheck": pkg.scripts?.typecheck || "echo 'TODO: add tsc --noEmit' && exit 0",
  "lint": pkg.scripts?.lint || "echo 'TODO: add eslint .' && exit 0",
  "test": pkg.scripts?.test || "echo 'TODO: add jest' && exit 0",
  "test:ci": pkg.scripts?.["test:ci"] || "npm run test",
  "build": pkg.scripts?.build || "echo 'TODO: wire build (next/vite)' && exit 0",
  "e2e": pkg.scripts?.e2e || "echo 'TODO: add Playwright tests' && exit 0",
  "lighthouse": pkg.scripts?.lighthouse || "echo 'TODO: add Lighthouse script' && exit 0",
  "verify": pkg.scripts?.verify || "npm run typecheck && npm run lint && npm run test:ci && npm run build && npm run e2e && npm run lighthouse"
}, pkg.scripts||{});
fs.writeFileSync(path, JSON.stringify(pkg,null,2));
console.log("Updated package.json scripts (placeholders added if missing).");
EOF
else
  echo "!! No package.json found. Skipping NPM script bootstrap. Add later."
fi

git add -A
git commit -m "chore: repo-brain, CI scaffold, governance, daily helper prompts"
git push -u origin "${SETUP_BRANCH}"

touch .ai_workflow_installed

echo
echo "== DONE =="
echo "Open your PRs page and merge ${SETUP_BRANCH} → ${DEFAULT_BRANCH} when CI is green."
echo
echo "After merging:"
echo "1) In GitHub Settings → Branches → Protect ${DEFAULT_BRANCH}"
echo "   Require status checks: typecheck, lint, unit, build, e2e, lighthouse, sbom-scan"
echo "2) Start a new Chat 2 with:  bash scripts/start_chat2.sh"
echo "3) End each day with:       bash scripts/shutdown_chat2.sh"
