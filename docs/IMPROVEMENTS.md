# Top 10 Product Improvements

Ordered by size (Small, Medium, Large) with a focus on iOS and PWA alignment.

## Small

1.  **Accessibility Alignment**
    - **Goal**: Align PWA accessibility attributes (`aria-required`, `role="article"`) and focus management with iOS VoiceOver standards.
    - **Key Areas**: `MatchForm` inputs, `EloLeaderboard` rows, `MatchHighlightCard`.

2.  **Haptic Feedback & Animations**
    - **Goal**: Achieve parity with iOS tactile feel.
    - **Key Actions**: Implement `navigator.vibrate` consistently in `MatchForm` (stepper), `AdminPanel` (toggles), and add `framer-motion` for page transitions.

3.  **Education View Parity**
    - **Goal**: Match the iOS `EducationView.swift` structure.
    - **Key Actions**: Create a dedicated `EducationView` in PWA with "Glossary" and "Rules" tabs using content from `src/content/glossary.ts`.

## Medium

4.  **Notification Preferences UI**
    - **Goal**: Full implementation of `docs/notifications.md`.
    - **Key Actions**: Add UI in `WebPermissionsPanel` for "Quiet Hours" and granular event toggles (Match, Poll, Admin).

5.  **Standalone ELO Simulator**
    - **Goal**: "What-if" scenario tool for both platforms.
    - **Key Actions**: Create a "Sandbox" page to calculate Win Probability and Point Exchange between any 4 players without starting a match.

6.  **Animation & Transitions**
    - **Goal**: Fluid navigation matching iOS.
    - **Key Actions**: Use `framer-motion` for spring animations on route changes and modal appearances.

7.  **Advanced Match Stats**
    - **Goal**: Deeper performance metrics.
    - **Key Actions**: Add optional tracking for "Winners" and "Unforced Errors" in `MatchForm` and display in `PlayerSection`.

## Large

8.  **Interactive Season Reports**
    - **Goal**: "Year in Review" style feature.
    - **Key Actions**: Build a visual, interactive report aggregating yearly stats, MVPs, and ELO trends for both platforms.

9.  **Live Match Dashboard**
    - **Goal**: Real-time match status.
    - **Key Actions**: Implement "Live" indicators on the Dashboard for matches currently in progress using real-time subscriptions.

10. **Offline Sync Visibility**
    - **Goal**: robust offline experience visibility.
    - **Key Actions**: Create a user-facing "Sync Queue" interface in PWA to show pending actions and status, matching iOS offline transparency.
