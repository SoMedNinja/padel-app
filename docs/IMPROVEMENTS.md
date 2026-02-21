# Top 10 NEW Product Improvements (iOS + PWA)

Ordered by implementation size (**Small → Medium → Large**) with focus on:
1) iOS and PWA alignment, and
2) improvements that raise quality for both iOS + PWA users.

> Note for non-coders: a PWA (Progressive Web App) is the installable web version. The iOS app is native Swift. “Alignment” means both should feel like the same product, even when the technology underneath is different.

## Small

1. **Cross-platform empty-state standardization**
   - **Why:** Screens without data can currently feel inconsistent and confusing.
   - **Improvement:** Define one shared pattern for “No matches”, “No notifications”, and “No history yet” (title, helper text, primary action).
   - **Outcome:** Users always know the next step, regardless of device.

2. **Date/time format parity (locale + timezone)**
   - **Why:** Schedule times shown differently on iOS vs PWA create trust issues.
   - **Improvement:** Enforce one formatting contract for date, weekday, and relative time strings across both clients.
   - **Outcome:** Fewer misunderstandings around match start times.

3. **Unified skeleton/loading templates**
   - **Why:** Different loading placeholders make one client feel slower or less polished.
   - **Improvement:** Introduce shared loading states for dashboard cards, match list items, and profile stats blocks.
   - **Outcome:** Perceived performance improves on both platforms.

4. **Settings information architecture cleanup**
   - **Why:** Important controls (notifications, install help, account, privacy) are spread differently across clients.
   - **Improvement:** Align settings sections and naming hierarchy so users can find controls in the same mental map.
   - **Outcome:** Reduced support requests and faster task completion.

## Medium

5. **One identity/session model across iOS + PWA**
   - **Why:** Session expiration and re-login behavior can differ and feel unreliable.
   - **Improvement:** Standardize token refresh handling, session expiry messaging, and “return to previous screen after login” behavior.
   - **Outcome:** Fewer unexpected sign-outs and fewer abandoned sessions.

6. **Shared conflict-resolution UX for offline edits**
   - **Why:** Conflict handling is critical but often too technical for users.
   - **Improvement:** Add a guided compare/choose flow with plain-language options (“Keep mine”, “Use latest”, “Review manually”) in both clients.
   - **Outcome:** Lower data confusion and better confidence in offline-first flows.

7. **Cross-platform notification inbox (in-app center)**
   - **Why:** Push notifications disappear, and users lose important updates.
   - **Improvement:** Build an in-app inbox showing recent alerts, read/unread status, and deep links to related content.
   - **Outcome:** Better re-engagement and easier recovery of missed updates.

## Large

8. **Shared onboarding journey (new user + returning user variants)**
   - **Why:** First-run education differs by platform, reducing activation quality.
   - **Improvement:** Create a common onboarding plan with platform-specific steps only when technically required (for example iOS install method differences).
   - **Outcome:** Better first-week retention and clearer feature discovery.

9. **Reliability scorecard + observability parity**
   - **Why:** Product quality drifts when web and native are measured differently.
   - **Improvement:** Define common KPIs (crash-free sessions, sync success rate, push delivery, deep-link open success) and dashboard them together.
   - **Outcome:** Faster incident response and better roadmap prioritization.

10. **Cross-platform “Command Center” for captains/admins**
   - **Why:** High-frequency organizers need one fast control surface.
   - **Improvement:** Build a unified admin cockpit for match creation, reminders, attendance nudges, and urgent announcements with role-based controls.
   - **Outcome:** Higher operational efficiency and better league coordination.

---

## Practical phased rollout

- **Phase 1 (quick wins, 2–3 weeks):** #1–#4
- **Phase 2 (workflow upgrades, 4–7 weeks):** #5–#7
- **Phase 3 (platform investment, 8+ weeks):** #8–#10

> Note for non-coders: this phased plan starts with visible usability fixes, then moves into account/offline reliability, and finally larger strategic capabilities.
