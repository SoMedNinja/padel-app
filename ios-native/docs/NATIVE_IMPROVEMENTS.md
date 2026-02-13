# iOS Native Improvements (Target: Next-Gen/iOS 26)

This document outlines 10 suggestions to further enhance the native feel of the Padel iOS application, ranging from small UI refinements to large-scale system integrations.

## Small (Quick Wins)

### 1. SF Symbol Animations (Symbol Effects)
Leverage the latest `symbolEffect` modifiers to provide tactile feedback and state transitions.
- **Usage:** Pulse the "trophy" icon in the tab bar when a tournament is live.
- **Benefit:** Makes the UI feel alive and responsive to real-time events without intrusive banners.

### 2. Native Swipe Actions
Replace custom button rows or long-press menus with standard iOS `swipeActions` in `List` views.
- **Usage:** Swipe left to delete or edit matches in `HistoryView`; swipe right to "Star" or "Pin" a player in the leaderboard.
- **Benefit:** Familiar gesture-based navigation that matches system apps like Mail and Messages.

### 3. Search Suggestions & Scopes
Enhance the `searchable` modifier in `DashboardView` and `SingleGameView`.
- **Usage:** Provide `searchSuggestions` for recently viewed players and `searchScopes` to toggle between "Players", "Teams", and "Tournaments".
- **Benefit:** Reduces typing and makes data discovery feel like a core part of the OS.

## Medium (Enhanced UX & Social)

### 4. Interactive Home Screen Widgets
Utilize Interactive Widgets to bring app functionality directly to the Home Screen.
- **Usage:** A "Next Match" widget that allows users to confirm attendance or view court details without opening the app.
- **Benefit:** Increases engagement by reducing friction for the most common tasks.

### 5. Live Activities & Dynamic Island
Implement `ActivityKit` for real-time tracking of active matches.
- **Usage:** When a match is started in `SingleGameView` or a tournament is underway, show the live score and elapsed time on the Lock Screen and Dynamic Island.
- **Benefit:** Keeps users informed at a glance, especially useful for friends watching from the sidelines.

### 6. Rich Share Sheet Previews (Transferable)
Improve the social sharing experience using the `Transferable` protocol and `LPMetadataProvider`.
- **Usage:** When sharing a match recap or ELO milestone, the recipient should see a custom preview card with the app's branding and the specific match result in the link preview.
- **Benefit:** Encourages social interaction within the group and makes shared content look premium.

### 7. Handoff & Continuity
Support Handoff to allow users to switch between devices seamlessly.
- **Usage:** Start entering match details on an iPhone and finish it on an iPad or Mac using the same account.
- **Benefit:** Provides a professional, ecosystem-wide experience for power users.

## Large (System Integration)

### 8. App Intents (Siri & Spotlight Integration)
Deeply index app content using `AppIntents` and `Spotlight` integration.
- **Usage:** Users can search for "Padel stats [Name]" in Spotlight to see a player's ELO card, or ask Siri "What's my current win streak?"
- **Benefit:** Makes the app's data accessible system-wide, moving it beyond a standalone container.

### 9. Native MapKit Court Visualization
Integrate a native `Map` view in the `ScheduleView` using the latest MapKit features.
- **Usage:** Show interactive pins for all padel court locations, with one-tap integration for Apple Maps directions and Look Around previews.
- **Benefit:** Provides context for upcoming games and eliminates the need to switch to a separate map app.

### 10. Advanced Swift Charts Interactions
Elevate the ELO Trend charts with precision interaction.
- **Usage:** Add a "Rule Mark" (vertical line) that follows the user's finger (scrubbing), displaying exact ELO values and match dates. Support pinch-to-zoom for multi-year histories.
- **Benefit:** Transforms static data visualization into a powerful analytical tool for tracking progress over time.
