# UX Contract

## Design tokens
- **Spacing (px)**: `space-0=0, 4, 8, 12, 16, 20, 24, 32, 40`
- **Radius**: `r-0=0, r-1=6px, r-2=10px, r-3=14px, r-pill=999px`
- **Shadows**: `sh-0=none, sh-1=0 1px 3px rgba(0,0,0,.08), sh-2=0 4px 12px rgba(0,0,0,.12)`
- **Colors**:
  - Ink `#0f172a`, Muted `#64748b`, Line `#e2e8f0`, BG `#ffffff`
  - Brand `#0B5CAB`, Accent `#16a34a`, Warn `#f59e0b`, Danger `#ef4444`
- **Breakpoints**: `sm≥640`, `md≥768`, `lg≥1024`, `xl≥1280`

## Typography
- **Scale**: `h1 26/1.2 800`, `h2 18/1.35 700`, `h3 13/1.4 700`, `body 14/1.45 400`, `caption 12/1.35 600`
- **Families**: Inter, Segoe UI, system-ui fallback.
- **Rules**: One `h1`/page; do not skip levels; body max line-length ~72ch.

## Layout & responsiveness
- Grid gutters use spacing tokens; page padding `space-32` desktop, `space-16` mobile.
- Cards: `border:1px line; radius:r-3; padding:space-14`.
- Tables: `border-collapse:collapse; th bg:#f8fafc; zebra only on data rows if needed`.

## Components
- **Buttons**: Primary (brand bg, white text), Secondary (white bg, ink text, line border). Radius r-2. Min tap target 40×40. Disabled opacity .5.
- **Inputs**: 12px–14px text, line border, r-2, focus ring 2px brand. Error text in Danger, 12px.
- **Cards**: Use sh-1; no nested heavy shadows. Header label (muted 12px), value weight 600+.
- **Modals**: Centered; overlay rgba(0,0,0,.4); ESC and click-out close (unless destructive).
- **Toasts**: Top-right; auto-dismiss 4–6s; role="status"; focusable close button.

## Interaction rules
- **Focus**: Always visible (`outline: 2px solid var(--brand); outline-offset: 2px`).
- **Keyboard**: All actions reachable with Tab/Shift+Tab; Enter/Space activate buttons; ESC closes modals.
- **Transitions**: 120–180ms opacity/transform only; no layout-affecting transitions on critical content.
- **Resize**: Recompute Gantt size on `resize` (throttled ≥150ms).

## States
- **Empty**: Title, short explainer, primary action; no dead-ends.
- **Loading**: Skeletons or muted placeholders; avoid spinners longer than 400ms without context.
- **Error**: Inline card with icon + actionable guidance; never modal-block without escape.

## Accessibility (AA)
- Contrast ≥4.5:1 for body, ≥3:1 for large text.
- Labels: Every control has a `<label>` or `aria-label`.
- Announce changes: Toasts use `role="status"`. Modals use `aria-modal="true"`, `aria-labelledby`.
- Focus trap in modals; return focus to invoker on close.

## Enforcement
- Shared CSS custom properties declared in both static pages and respected in JSX.
- Lint rule: no inline hex except tokens; `data-testid` on interactive atoms used in tests.
