# Top 10 Product Improvements (iOS + PWA)

Ordered by implementation size (**Small → Medium → Large**) with explicit focus on:
1) iOS and PWA alignment, and
2) cross-platform improvements that benefit both iOS and PWA users.

> Note for non-coders: “alignment” means the app behaves similarly on iPhone (native app) and installed web app (PWA), so users do not need to re-learn the product when switching devices.

## Small

1. **Permission language parity (copy + labels)**
   - **Why:** Users currently see slightly different wording between iOS and web in permission prompts and settings.
   - **Improvement:** Create one shared copy table for notification/install/location permission labels and helper text.
   - **Outcome:** Fewer support questions and clearer onboarding on both platforms.

2. **Accessibility parity checklist per screen**
   - **Why:** VoiceOver (iOS) and screen readers (web) can diverge if focus order, labels, and hints are not aligned.
   - **Improvement:** Add a cross-platform checklist for key routes (`Dashboard`, `Schedule`, `History`, match forms) covering labels, focus order, and dynamic announcements.
   - **Outcome:** Better usability for assistive-tech users with minimal engineering effort.

3. **Install/help flow simplification for iOS Safari + PWA**
   - **Why:** iOS install requires manual “Add to Home Screen,” while Android/desktop often supports one-tap install.
   - **Improvement:** Merge install education and permission education into one guided, step-based help sheet reused across menu/settings.
   - **Outcome:** Higher install completion and fewer drop-offs.

4. **Cross-platform feedback consistency (haptics/toasts/loading states)**
   - **Why:** The same action can feel different between iOS and PWA.
   - **Improvement:** Standardize success/error toast wording, loading microcopy, and haptic/vibration patterns for create/edit/delete actions.
   - **Outcome:** More predictable user experience when users switch client.

## Medium

5. **Shared notification preference model + UI parity**
   - **Why:** Notification controls are among the highest-friction “settings” experiences.
   - **Improvement:** Implement matching controls for categories (match updates, polls, admin notices), quiet hours, and deep-link behavior in both clients.
   - **Outcome:** Better re-engagement and fewer “I got too many notifications” complaints.

6. **Offline action center (queue visibility + retry controls)**
   - **Why:** Users need confidence when they submit data while offline.
   - **Improvement:** Add a visible offline queue center in PWA that mirrors native status concepts (pending/synced/conflict/needs review), with manual retry.
   - **Outcome:** Higher trust in offline mode and fewer duplicate submissions.

7. **Deep-link parity hardening (notifications, shared links, cold starts)**
   - **Why:** Links should open the same destination whether users tap from push, messages, or browser.
   - **Improvement:** Validate and unify routing contracts for `/schedule`, `/match/:id`, `/history`, `/notifications`, including fallback behavior when app is not installed.
   - **Outcome:** Fewer broken navigation journeys and better campaign/share performance.

## Large

8. **Cross-platform “Live Match” experience**
   - **Why:** Live states are a core engagement loop but can feel fragmented across clients.
   - **Improvement:** Build a shared live-status model (in-progress, paused, finished), real-time updates, and “resume where I left off” behavior for both iOS and PWA.
   - **Outcome:** Stronger retention during active game windows.

9. **Unified seasonal insights module (stats story across iOS + PWA)**
   - **Why:** High-value insights (ELO trends, streaks, rivalries, milestones) are powerful but currently distributed.
   - **Improvement:** Build one analytics surface with shared metric definitions and presentation patterns tuned per platform UI.
   - **Outcome:** Higher recurring engagement and social sharing opportunities.

10. **Design-system convergence layer (tokens + component behavior rules)**
   - **Why:** Visual drift reappears over time unless constrained by shared rules.
   - **Improvement:** Expand token governance (spacing, status colors, elevation, motion intent) and publish web/iOS component behavior mapping (cards, chips, forms, tabs, empty states).
   - **Outcome:** Faster feature delivery with consistent quality and reduced QA overhead.

---

## Suggested rollout order (quick execution path)

- **Phase 1 (2–4 weeks):** #1–#4 (copy/accessibility/install/feedback consistency)
- **Phase 2 (4–8 weeks):** #5–#7 (notifications/offline/deep links)
- **Phase 3 (8+ weeks):** #8–#10 (live experience/insights/design-system convergence)

> Note for non-coders: this order starts with improvements that are relatively low-risk but user-visible, then moves into larger platform and architecture work.
