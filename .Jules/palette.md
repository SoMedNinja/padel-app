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

## 2025-05-24 - [Micro-UX: Progressive Disclosure & Contextual Feedback]
**Learning:** For dense forms (like score selection), allowing users to collapse extra options ("Göm") keeps the UI tidy and reduces cognitive load. Providing immediate, contextual loading feedback (like a spinner inside a button) for administrative actions prevents double-clicks and uncertainty.
**Action:** Use "Mer.../Göm" patterns for optional high-density inputs. Always replace icons with a `CircularProgress` (size 16) in buttons during active async operations. Use `cursor: 'help'` on tooltipped headers to signal interactivity.

## 2026-01-31 - [UX: Contextual Feedback & A11y States]
**Learning:** For dense selection grids (like score entry), screen readers need explicit state cues like `aria-pressed`. Visual feedback for async operations (changing "Spara" to "Sparar...") prevents user uncertainty. Tooltips on disabled buttons require a wrapper `span` to ensure the tooltip is triggerable.
**Action:** Always use `aria-pressed` on selection buttons. Implement "Sparar..." text changes in submit buttons. Wrap disabled tooltipped buttons in a `span`.

## 2026-02-05 - [A11y: Native Validation & Sort Labels]
**Learning:** MUI `TextField` does not always apply `aria-required` to the underlying input element when the `required` prop is used on the component. Explicitly passing it via `slotProps.htmlInput` ensures screen reader compliance. Table sorting headers require descriptive `aria-label` attributes on `TableSortLabel` to explain the action to non-visual users.
**Action:** Use `slotProps.htmlInput` for `aria-required` in `TextField`. Always add `aria-label` to `TableSortLabel` describing the column being sorted.
