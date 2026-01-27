# Palette's Journal - UX & Accessibility Learnings

## 2025-05-14 - [A11y & Usability Improvements]
**Learning:** Icon-only buttons without labels are a common accessibility gap in this MUI-based app. Additionally, while the app uses sophisticated filters, it lacked a quick way to reset them, which can lead to user frustration.
**Action:** Always audit `IconButton` components for `aria-label`. When implementing filters or complex states, ensure a "clear" or "reset" action is easily accessible and visually associated with the control.

## 2025-05-14 - [Interaction Constraints]
**Learning:** Users/developers of this repo might prefer standard browser `alert()` and `window.confirm()` for certain destructive or validation actions over non-blocking toasts, possibly due to the higher friction and certainty they provide.
**Action:** Respect existing usage of browser dialogs unless a full UI refactor is explicitly requested for those specific interactions.
