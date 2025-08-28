```markdown
# AI Backlog

## Now
1. **Renderer reads `financials` only**
   - **AC**:
     - Commercials table uses `financials.baseDays/baseRate/baseAmount`.
     - Discount rows use `financials.mandayPct/mandayDaysDelta/mdAmt` and `ratePct/rtAmt`.
     - Totals show `financials.implementationSubtotal` and `financials.grandTotal`.
     - Removing legacy fields does not break Renderer.

2. **Cockpit Gantt: dynamic sizing + long-range handling**
   - **AC**:
     - Timeline fits container width/height without truncation at any `estimatedWeeks` (4–72).
     - No horizontal scrollbar when printing.
     - Week labels do not overlap (auto-thin if <12px step).
     - Blackouts visible with ≥0.5 opacity; phases readable atop.

3. **Chip a11y (scope pickers)**
   - **AC**:
     - Chips are `button[aria-pressed]` with visible focus ring.
     - Keyboard toggle with `Space`/`Enter`.
     - Screen reader announces label + selected state.

## Next
4. **Persist user settings**
   - **AC**:
     - On load, the app restores last-used inputs from `localStorage`.
     - “Reset to defaults” clears persisted state.

5. **SST / Tax line**
   - **AC**:
     - Toggle “Apply SST” + rate field (%).
     - Renderer shows separate tax row and grand total including SST.
     - JSON export includes `tax: { enabled, ratePct, amount }`.

6. **AMS discount model**
   - **AC**:
     - Optional AMS % discount or stepped pricing by months.
     - Renderer footnote clarifies AMS assumptions.

## Later
7. **Phase-level effort split**
   - **AC**:
     - UI distributes mandays across phases; Cockpit uses it to compute role/FTE.
     - Renderer timeline duration aligns with phase sums.

8. **Milestone editor**
   - **AC**:
     - User can add/edit milestone % and labels.
     - Renderer table recalculates amounts.

9. **Multi-currency**
   - **AC**:
     - Currency switcher with locale-aware formatting.
     - Stored in payload; renderer/cockpit reflect selection.

10. **Unit tests for calculators**
    - **AC**:
      - Jest tests covering discount math, rounding, AMS, SST.
      - ≥90% branch coverage on calculator module.