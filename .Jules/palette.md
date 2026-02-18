## 2024-05-24 - Accessibility Patterns in MUI
**Learning:** MUI `Chip`'s `onDelete` handler creates a button with a generic "delete" label or no label. To make it accessible, especially for internationalization, you must explicitly provide a `deleteIcon` with an `aria-label`.
**Action:** Always inspect MUI `Chip` delete buttons and override `deleteIcon` with an accessible icon component when the default label is insufficient.

**Learning:** Visual-only charts (like simple bar charts made of `Box` elements) are completely invisible to screen readers.
**Action:** Always wrap visual-only data representations in a container with `role="img"` and a descriptive `aria-label` that summarizes the data (e.g., "Win rate: 75%").
