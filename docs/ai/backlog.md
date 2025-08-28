# Backlog

## NOW
- **T-001 [M] Unify payload consumption (Renderer + Cockpit)**
  - **AC**:
    - Both pages render totals using `payload.financials.grandTotal` when present.
    - Fallback to legacy fields maintains identical numbers to PDF.
    - Message + `#lk` token fallback both verified in Chrome/Edge.
- **T-002 [S] Dynamic Gantt sizing in Cockpit**
  - **AC**:
    - Timeline never truncates on narrow/wide viewports.
    - SVG height adapts to number of phases; no scrollbars during print.
    - Window resize triggers reflow ≤16ms average (throttle ok).
- **T-003 [M] Timeline inputs (configurable in UI)**
  - **AC**:
    - Controls for **start date**, **workdays/week (4–6)**, **blackouts** (date ranges) exist.
    - Values persist to `unifiedPayload.timeline` and affect Gantt.
    - Proposal PDF/Renderer show identical timeline summary.
- **T-004 [S] Cockpit exports restored**
  - **AC**:
    - **CSV (weekly)** export button downloads non-empty CSV; week boundaries correct.
    - **Generate .ikm** triggers existing `ikm.js` path without runtime error.
- **T-005 [S] UX contract enforcement (lint + tokens)**
  - **AC**:
    - Shared CSS variables (spacing, radius, shadows) defined and used in both HTML pages.
    - Focus ring and keyboard traversal verified for all interactive elements.
- **T-006 [M] Error states & guards**
  - **AC**:
    - If payload missing/invalid, pages show non-blocking inline error and offer sample load.
    - Numbers clamp to non-negative; formatting always MYR with 0/2 decimals per rule.

## NEXT
- **T-010 [M] AMS model options**
  - **AC**: Support fixed RM/month and manday×rate AMS; picker persisted in payload.
- **T-011 [S] Scope → effort presets**
  - **AC**: Selecting capabilities adjusts suggested buckets (functional/FRICEW/wrapper).
- **T-012 [M] Milestones generator**
  - **AC**: Auto-splits payments by phase end; totals match `financials.grandTotal`.
- **T-013 [S] JSON schema & validator**
  - **AC**: JSON Schema for `unifiedPayload`; runtime validation with readable errors.
- **T-014 [S] Print polish**
  - **AC**: A4/letter print styles; page breaks avoid splitting tables/bars.
- **T-015 [M] Test coverage**
  - **AC**: Unit tests for calculators and payload builder; CI badge ≥80% lines.
- **T-016 [S] Persist last-used**
  - **AC**: Calculator restores last controls on load; “Reset to defaults” available.

## LATER (parking lot)
- T-030 [L] Multi-currency & locale (MYR, SGD, USD).
- T-031 [L] Auth for internal pages; signed URL hand-off.
- T-032 [M] Scenario compare (A/B proposals).
- T-033 [M] PDF generation via serverless (exact pagination).
- T-034 [M] Import from CSV/Excel staffing plan.

## Quality Rails (always on)
- **Accessibility**: Focus-visible, ARIA labels, keyboard operability, WCAG 2.1 AA contrast.
- **Lighthouse**: PWA off, but ≥90 for Performance/Best Practices/SEO on key routes.
- **Perf**: Avoid layout thrash; throttle resize; no blocking alerts in hot paths.
- **Deps**: Keep React/Vite/TW current; run `npm audit` and prune unused packages.
