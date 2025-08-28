# ABeam MY Calculator — AI Handover

## Architecture (current)
- **Frontend**: React 18 + Vite, Tailwind (utility classes already present in JSX), no backend.
- **Build/Dev**: `vite` with `src/` app entry, `index.html` at repo root.
- **Standalone views** (static HTML in `public/` or project root):
  - `proposal-renderer.html` — client-facing printable proposal.
  - `internal-cockpit.html` — internal resource cockpit.
- **Data transport** (no server):
  - **Unified payload** built in `src/App.jsx` (includes `financials` bucket).
  - **Hand-off** via `window.postMessage({type:"proposalData", payload})` with **fallback** one-time `localStorage` token `ikm:payload:<token>` passed as `#lk=<token>` in the URL.
  - Consumers read **postMessage** first; if missing, read `localStorage` using `#lk`.

## Key modules
- `src/App.jsx`: Calculator UI, computes summary, **builds unified payload**, triggers:
  - **PDF export**: in-memory HTML + `window.print()`.
  - **Proposal**: opens `proposal-renderer.html` with payload.
  - **Cockpit**: opens `internal-cockpit.html` with payload.
- `proposal-renderer.html`: Receives payload, renders **commercials**, **milestones**, **scope**, and **SVG Gantt** (print-safe). Dynamic width/height; weekends excluded; blackout shading; `*` on end-in-blackout.
- `internal-cockpit.html`: Receives same payload; shows **Totals/AMS**, **phase allocations**, **timeline** prototype; supports CSV weekly export and `.ikm` generation (scripts present as placeholders if not wired).

## Data flow (happy path)
1. User configures **mandays**, **rate/discounts**, **AMS**, **team/weekdays**, **scope**.
2. App computes **summary** (base & final days/rate, discounts, AMS, rounding, totals) and derives **timeline weeks**.
3. App builds **unified payload**:
   - Calculator knobs (client, tier, staffing, scope),
   - Renderer fields (e.g., `grandTotal`, `totalMandays`) via legacy builder if used,
   - **`financials`**: canonical numbers shown in PDF (single source of truth).
4. App opens a new tab to renderer/cockpit with `#lk=<token>` and sends `postMessage`.
5. Target page renders immediately on message; if missed, loads from `localStorage` using token.

## What works today
- Calculator renders and recomputes **finalDays**, **finalRate**, **implementationSubtotal**, **grandTotal**.
- **PDF export** opens print-ready HTML (hero + effort + financials).
- **Proposal Renderer** loads payload (message/token), shows summary tables and **Gantt** (dynamic sizing).
- **Cockpit** loads same payload, shows totals/AMS and timeline (prototype).

## Known limitations / active risks
- **Popup blockers** may block new tabs; fallback still requires manual allow.
- **LocalStorage hand-off** is origin-bound; cross-origin won’t work.
- **AMS model** is fixed-price (RM/month) only; no tiered/discount logic.
- **No auth/ACL**; internal pages are accessible if the URL is known.
- **A11y**: keyboard and focus-visible paths exist in browser defaults only; needs explicit rules.
- **Rounding** and discount precedence are simple; edge cases (e.g., negative totals) not guarded.

## Open items that matter
- Ensure **both** `internal-cockpit.html` and `proposal-renderer.html` read **`payload.financials`** when present.
- Confirm **Gantt** renders in **Cockpit** after refactor (message listener and dynamic sizing intact).
- Re-introduce **CSV weekly** and **.ikm** export wiring in Cockpit if removed during cleanup.
- Document and centralize the **unified payload schema**.

## What to build next (short)
- UI toggles for **blackouts**, **workweek**, **start date** (persist to payload).
- Persist last used config (localStorage key) + “Reset” control.
- A11y & quality rails hardened (focus ring, keyboard nav, Lighthouse ≥90).
