# ABeam SAP Cloud ERP Calculator — AI Handover

## Overview
Single-page React calculator that generates a unified pricing/timeline payload and hands it to two read-only views:
- **Proposal Renderer** (`/proposal-renderer.html`) — client-facing PDF/print proposal.
- **Internal Cockpit** (`/internal-cockpit.html`) — staffing/timeline cockpit with Gantt and CSV export.

The calculator is the **source of truth** for financials and scope. Both renderer and cockpit consume the **same payload** via `postMessage` with a localStorage token fallback.

---

## Architecture

React (Vite) SPA
└─ src/App.jsx
├─ UI: inputs (mandays, discounts, AMS), scope pickers, summary
├─ compute: pdfSummary (base/final days, rate, amounts)
├─ buildUnifiedPayload() ← canonical output for all consumers
└─ openWithPayload(url,payload) → postMessage + #lk token fallback

/public
├─ proposal-renderer.html (vanilla JS receiver + print-safe UI)
├─ internal-cockpit.html (vanilla JS receiver + Gantt/CSV)
├─ abeam-logo.png
└─ (optional) proposalPayload.sample.json

Data hand-off:
App.jsx → window.open(/page#lk=token) → postMessage({type:"proposalData", payload})
Renderer/Cockpit → read postMessage OR read localStorage['ikm:payload:<token>']

pgsql
Copy code

**Canonical payload shape (minimum):**
```ts
{
  clientName, clientShort, packageTier,
  functional, fricew, technical, wrapper, totalMandays,
  teamSize, workdays, estimatedWeeks,
  myRate, mandayDiscount, rateDiscount, rounding,
  amsMonths, amsMonthly,
  selection: { capabilities: string[], forms: string[], interfaces: string[] },
  financials: {
    baseDays, baseRate, baseAmount,
    mandayPct, ratePct, mandayDaysDelta, mdAmt, rtAmt,
    finalDays, finalRate, implementationSubtotal,
    amsBaseDays, amsRate, amsBasePrice, amsDays, amsPrice,
    rounding, grandTotal
  },
  pdfSummarySnapshot?: any
}
Receiver contract:

Prefer payload.financials.*.

Fallback to legacy top-level fields if present.

Key Flows
User edits inputs → pdfSummary recomputes.

Export → Proposal
buildUnifiedPayload() → openWithPayload("/proposal-renderer.html", payload)
Renderer fills hero totals, commercials table, milestones, scope, timeline (Gantt).

Export → Cockpit
Same payload via openWithPayload("/internal-cockpit.html", payload); Cockpit renders Gantt (print-safe SVG), reads financials, supports CSV/IKM export.

PDF (client quick print)
App constructs self-contained HTML (using pdfSummary) → window.print().

Key Features
Unified financials: Discounts (manday% → days, rate% → rate), rounding, AMS (fixed RM/month).

Scope chips: Capabilities, Forms, Interfaces (keys → labels).

Gantt: Workweek scale, blackout windows, dynamic width/height, print-safe SVG.

Hand-off resiliency: postMessage + #lk → localStorage token fallback; optional BroadcastChannel.

Session snapshot: sessionStorage["abeam_pdf_summary"] for quick debug/use.

Extensibility Points
Taxes/SST application (pre/post-discount).

AMS discount model (percent or tiered).

Phase-level effort split to drive resource planning.

Persist user defaults to localStorage.

Open Issues / PRs
ISSUE-001: Renderer must prefer payload.financials everywhere (some table rows still read legacy fields).

ISSUE-002: Cockpit Gantt occasionally overflows on very long projects; needs min-zoom/scroll affordance.

ISSUE-003: Keyboard toggling for scope chips: ensure ARIA pressed state is announced consistently.

PR-004: Unify payload builder + receivers (App.jsx + both HTML pages) — pending final review after refactor.

PR-005: Dynamic Gantt sizing & blackout shading — merged; follow-ups for label overlap logic.

PR-006: PDF export (App) restyle to match renderer typography — in progress.