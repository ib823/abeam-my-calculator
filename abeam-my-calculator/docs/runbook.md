# Runbook
## CI Artifacts
- Unit: artifacts/jest.html
- e2e: artifacts/playwright/
- Lighthouse: artifacts/lighthouse.html
## Failure Playbooks
- Flaky e2e: retries=2, mock network, stable selectors
- PDF break: fonts/headless/browser availability/body types/memory; add repro test
- Perf drop: compare Lighthouse artifacts; code-split; prune deps; update budgets
