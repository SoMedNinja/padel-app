## 2025-01-27 - [Accessibility: Paper with onClick]
**Learning:** Using `Paper` with `onClick` for interactive elements (like cards) makes them inaccessible to keyboard users and screen readers.
**Action:** Replace `Paper` with `onClick` with `ButtonBase` (using `component={Paper}`) to ensure the element is focusable and responds to keyboard events (Space/Enter). Add `aria-label` and `aria-pressed` for better screen reader feedback.

## 2025-05-15 - [A11y & UI Consistency Audit]
**Learning:** Icon-only buttons without  were widespread across MexicanaTournament, Merits, and MVP sections. Inconsistent sentence casing in loading/empty states (e.g., "laddar data...") can make the UI feel unpolished.
**Action:** Always verify  on new  or  components. Enforce Sentence case for all UI strings and labels. Use  to provide additional context for advanced features like "Matchmaker".

## 2025-05-15 - [A11y & UI Consistency Audit]
**Learning:** Icon-only buttons without `aria-label` were widespread across MexicanaTournament, Merits, and MVP sections. Inconsistent sentence casing in loading/empty states (e.g., "laddar data...") can make the UI feel unpolished.
**Action:** Always verify `aria-label` on new `IconButton` or `InfoIcon` components. Enforce Sentence case for all UI strings and labels. Use `Tooltip` to provide additional context for advanced features like "Matchmaker".

## 2025-05-20 - [UX: Contextual Feedback & Scannability]
**Learning:** In long lists like leaderboards, users struggle to find their own data. Providing a character counter for fields with strict length limits (like player names) prevents silent input truncation.
**Action:** Implement subtle background highlights (e.g., `alpha(theme.palette.primary.main, 0.08)`) for user-specific rows in tables. Always add `helperText` counters to `TextFields` with `maxLength` constraints.

## 2025-05-22 - [UX: Consistent Constraint Feedback]
**Learning:** Hard input limits (maxLength) without visible counters lead to "dead" keyboard input that confuses users. Even in administrative views, high-density data requires visual anchors (like row highlights) to maintain user context.
**Action:** Audit all configuration and management screens for hidden constraints. Ensure every `TextField` with `maxLength` has a corresponding `helperText` counter, and all user-centric tables use standard highlighting.
