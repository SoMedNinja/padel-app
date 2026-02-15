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

## 2026-02-12 - [UX: Contextual Clarity & Scannability]
**Learning:** In multi-slot forms (like match editing), missing labels on identical inputs cause cognitive friction. Visual cues like bolding/coloring winners in dense brackets significantly reduce scanning time. Lowering search thresholds (e.g., from 8 to 5) for player grids ensures filter tools are available before the list becomes overwhelming.
**Action:** Always label repeating form slots (e.g., "Spelare 1"). Use `primary.main` highlighting for winners in tournament views. Standardize search visibility at 5+ items.

## 2026-02-15 - [A11y: Tournament Bracket & Region Landmarks]
**Learning:** Densely packed tournament brackets are notoriously difficult for screen reader users to navigate without landmarks. Providing a `role="region"` with a descriptive `aria-label` for the scrollable container, combined with summary `aria-label` attributes for each match card (e.g., "Rond 1: Lag A mot Lag B, resultat 2-1"), significantly improves the experience for non-visual users.
**Action:** Always wrap complex horizontal scroll areas in a region landmark and provide semantic summary labels for repeated data cards.

## 2025-05-25 - [iOS UX: Tactile Feedback & Async Clarity]
**Learning:** Native iOS users expect tactile feedback for primary actions and discrete selections. Adding haptics to custom buttons and pickers significantly enhances the "premium" feel. For long-running async operations like match submission, changing the button label to "Sparar..." and adding a ProgressView prevents redundant clicks and uncertainty.
**Action:** Use UIImpactFeedbackGenerator in custom ButtonStyles and sensoryFeedback on pickers. Always implement a "Sparar..." state for primary submission buttons.

## 2025-05-28 - [iOS UX: Pulse Animations & Haptic Hierarchy]
**Learning:** Pulse animations on icons (Symbol Effects) provide a non-intrusive way to signal live events (like tournaments). Using a hierarchy of haptics (Light for navigation, Medium for primary creation/submission) makes the app feel tactile and responsive. Sorting headers in dense tables require both an accessibilityLabel and an accessibilityHint to explain state changes to VoiceOver users.
**Action:** Use `.symbolEffect(.pulse)` for live status indicators. Apply Light/Medium haptic feedback consistently based on action importance. Always add hints to sortable table headers.

## 2026-06-01 - [iOS UX: Coherent Accessibility & Tactile Wizard]
**Learning:** Horizontal data rows (like leaderboards) are best served to VoiceOver as a single, ignored-children element with a summarized `accessibilityLabel`. Multi-step wizards benefit significantly from combining step indicators into a single accessibility element with clear `accessibilityValue` (e.g., "Aktivt/Slutfört") and `accessibilityAddTraits(.isButton)`. Adding light haptics (`UIImpactFeedbackGenerator(style: .light)`) to previous-step navigation makes the wizard feel more tactile and forgiving.
**Action:** Summarize dense rows in a single label. Use `.combine` and button traits for custom progress steppers. Implement haptics for "go back" interactions in forms.

## 2026-06-05 - [iOS UX: Confirmation Safety & Empty State Guidance]
**Learning:** Destructive actions on mobile (logout, match deletion) require explicit confirmation dialogs to prevent accidental taps. Empty states that offer a clear path forward (e.g., "Registrera match" button) reduce user frustration when data is missing. In-place editors should maintain their state until async operations finish to avoid jarring UI transitions.
**Action:** Always use `.confirmationDialog` for destructive actions. Provide helpful navigation CTAs in empty states. Use loading states (ProgressView) inside buttons to provide immediate feedback for save actions.

## 2026-06-10 - [iOS UX: Search Feedback & Field Constraints]
**Learning:** Empty search results in player grids can feel like a "dead" UI if no feedback is given. Providing a localized message ("Inga spelare hittades") and an icon confirms the search was active. Character counters for text fields with strict limits (like profile names) are essential on mobile to prevent silent input truncation and provide immediate validation feedback.
**Action:** Always implement empty states for searchable lists. Add character counters and disabling logic to `TextFields` with `maxLength` or `minLength` constraints.

## 2026-06-12 - [A11y: Dynamic Sort State & Actionable Hints]
**Learning:** VoiceOver users need to know not just that a header is sortable, but its current sort direction. Using `accessibilityValue` to announce "Sorterat stigande" or "Sorterat fallande" and `accessibilityHint` to explain the toggle action ("Tryck för att sortera efter...") makes data tables navigable for non-visual users.
**Action:** Use `accessibilityValue` for dynamic state and `accessibilityHint` for instructions on all interactive table headers.
