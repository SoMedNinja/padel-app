## 2025-01-27 - [Accessibility: Paper with onClick]
**Learning:** Using `Paper` with `onClick` for interactive elements (like cards) makes them inaccessible to keyboard users and screen readers.
**Action:** Replace `Paper` with `onClick` with `ButtonBase` (using `component={Paper}`) to ensure the element is focusable and responds to keyboard events (Space/Enter). Add `aria-label` and `aria-pressed` for better screen reader feedback.
