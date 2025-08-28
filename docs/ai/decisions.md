# Architecture Decisions

- **DEC-20250828-01 — Use Vite + React 18 (no backend)**
  - *Rationale*: Fast DX, static hosting, zero server ops.
  - *Scope*: `src/` app and root `index.html`.

- **DEC-20250828-02 — Standalone HTML for Proposal & Cockpit**
  - *Rationale*: Print fidelity and easy internal sharing without bundling.
  - *Scope*: `proposal-renderer.html`, `internal-cockpit.html`.

- **DEC-20250828-03 — Payload delivery via postMessage + one-time localStorage token**
  - *Rationale*: Reliable cross-tab hand-off with fallback when message races.
  - *Scope*: All hand-offs from calculator to static pages.

- **DEC-20250828-04 — Canonical `financials` bucket in unified payload**
  - *Rationale*: Single source of truth for numbers shown in PDF/Renderer/Cockpit.
  - *Scope*: Payload structure; consumers must prefer `payload.financials`.

- **DEC-20250828-05 — Print as HTML (client-side)**
  - *Rationale*: No server PDF infra; acceptable fidelity for proposals.
  - *Scope*: Proposal PDF export.

- **DEC-20250828-06 — SVG Gantt with dynamic sizing**
  - *Rationale*: Print-safe, crisp, controllable; avoids canvas pagination issues.
  - *Scope*: Renderer timeline; Cockpit prototype.

- **DEC-20250828-07 — MYR formatting rules**
  - *Rationale*: Consistent regional format: 0 or 2 decimals as needed.
  - *Scope*: All currency displays.

- **DEC-20250828-08 — AMS modeled as fixed RM/month (v1)**
  - *Rationale*: Simplicity for initial proposals.
  - *Scope*: Calculator and payload; future ADR will cover alternatives.

- **DEC-20250828-09 — Accessibility baseline (WCAG 2.1 AA)**
  - *Rationale*: Usability, compliance, and print-to-screen parity.
  - *Scope*: Components, pages, exports.

- **DEC-20250828-10 — Branch gating for build fixes**
  - *Rationale*: Keep `main` green; use feature/fix branches (e.g., `fix/build-break`) and PR checks.
  - *Scope*: Repo workflow.
