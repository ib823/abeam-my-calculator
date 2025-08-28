# Architecture & Product Decisions

- **DEC-20250820-01 — Unified Payload for All Consumers**  
  Use a single `buildUnifiedPayload()` from App; renderer & cockpit read `payload.financials` as the contract.

- **DEC-20250820-02 — Hand-off Mechanism**  
  `postMessage` primary, with `#lk` token → `localStorage` fallback; optional BroadcastChannel in dev.

- **DEC-20250820-03 — Discount Semantics**  
  Manday% reduces days; Rate% reduces rate; both reflected before rounding; AMS excluded from manday math.

- **DEC-20250820-04 — Rounding Strategy**  
  Apply rounding as a signed amount after (implementation + AMS); display the step in footnote.

- **DEC-20250820-05 — AMS Modeling (v1)**  
  AMS priced as fixed RM/month, no discount in v1; discount model deferred.

- **DEC-20250820-06 — Renderer Technology**  
  Keep `proposal-renderer.html` as static HTML + vanilla JS for fast print and portability.

- **DEC-20250820-07 — Cockpit Technology**  
  Keep `internal-cockpit.html` as static HTML with a small runtime; focus on SVG Gantt + CSV export.

- **DEC-20250821-08 — Gantt Rendering**  
  Use print-safe SVG with dynamic width/height; month and ISO-week bands; blackout overlays at 0.6 opacity.

- **DEC-20250822-09 — Currency/Locale**  
  Default to MYR with `Intl.NumberFormat('en-MY')`; future multi-currency to extend payload.

- **DEC-20250823-10 — Accessibility Baseline**  
  Chips use `button[aria-pressed]`; visible focus, keyboard toggle; inputs have labels; SR-friendly summaries.