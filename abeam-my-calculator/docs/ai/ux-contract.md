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
