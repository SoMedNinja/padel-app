# Palette's Journal

## 2025-05-20 - Semantic Lists & ARIA
**Learning:** MUI `Stack` and `Box` are great for layout but default to `div`, which hurts screen reader navigation for lists (like match history). Using `component="ul"` and `component="li"` on them restores list semantics without breaking styles (just need `list-style: none` and `p: 0`).
**Action:** Always check long lists of items (cards, rows) and convert them to semantic `<ul>`/`<li>` structures using the `component` prop.

## 2025-05-23 - Custom Avatar Component
**Learning:** The codebase has a custom `Avatar` component that handles `alt` text generation and fallback logic better than raw `MuiAvatar`. However, `MuiAvatar` is still imported directly in some places (like `PlayerGrid`), leading to missing `alt` attributes.
**Action:** When finding `MuiAvatar` usage, check if it can be replaced with `CustomAvatar` to ensure consistent accessibility and fallback behavior.
