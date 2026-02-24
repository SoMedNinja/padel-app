# Palette's Journal

## 2025-05-20 - Semantic Lists & ARIA
**Learning:** MUI `Stack` and `Box` are great for layout but default to `div`, which hurts screen reader navigation for lists (like match history). Using `component="ul"` and `component="li"` on them restores list semantics without breaking styles (just need `list-style: none` and `p: 0`).
**Action:** Always check long lists of items (cards, rows) and convert them to semantic `<ul>`/`<li>` structures using the `component` prop.
