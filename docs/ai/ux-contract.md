# AI UX Contract

## Design Tokens
- **Color**
  - ink `#0f172a`, muted `#64748b`, line `#e2e8f0`, bg `#ffffff`
  - brand `#0B5CAB`, accent `#16a34a`, warn `#f59e0b`, danger `#ef4444`
- **Radius**: `10–14px` for cards/buttons; chips are pill (`9999px`).
- **Spacing**: base `8px` grid; card padding `12–16px`.
- **Typography**: Inter/Segoe UI, 12–16px body; 24–28px headings.
- **Number formats**: `en-MY` locale; currency **MYR** by default.

## Components
- **Button**: `<button class="border rounded px-3 py-2">` primary/secondary states; disabled has `aria-disabled="true"`.
- **Chip (Picker)**: `button[aria-pressed]` with selected visual (brand border/fill).
- **Number Input**: right-aligned; min/max enforced; announces errors via `aria-live="polite"`.
- **Stat Card**: label (xs, muted, uppercase), value (sm–md, semi-bold/extrabold when `strong`).
- **Gantt (Renderer/Cockpit)**: print-safe SVG, month/ISO week bands, blackout overlays, auto-fit width/height.

## Interaction Patterns
- **Unified payload hand-off**: always use `openWithPayload(url, payload)`; receivers listen to `postMessage` with token fallback.
- **Discount semantics**:
  - Manday % → reduces **days**.
  - Rate % → reduces **rate**.
  - Rounding applied last to (impl + AMS).
- **AMS**: fixed RM/month by default; discount optional later.

## Accessibility
- Focus states visible on all interactive elements.
- Chips:
  - Keyboard: `Tab` to focus, `Enter/Space` toggles.
  - `aria-pressed="true|false"`, readable label text.
- Forms: each input has a visible label; associated via `for`/`id` or wrapping `label`.
- Live regions:
  - Summary totals region `aria-live="polite"` for recalculation announcements (recommended).
- Contrast:
  - Text vs background ≥ 4.5:1; reversed text on brand tiles ≥ 4.5:1.
- Print:
  - Renderer/Cockpit avoid fixed pixel sizes in containers; SVG uses `viewBox` + responsive width.

## Error/Empty States
- Renderer shows “Waiting for data…” until payload arrives; loads sample after timeout in dev only.
- Cockpit shows a banner if payload missing or invalid; paste-area fallback accepted.

## Content
- Currency prefix “RM ”; thousands separators per `en-MY`.
- Timeline summary format: `DD Mon YYYY → DD Mon YYYY • N weeks`.