# Pull-to-refresh parity spec (PWA ↔ iOS native)

This document is the single source of truth for pull-to-refresh behavior on both apps.

## Why this exists

- Users should get the same refresh feel regardless of platform.
- Small differences (animation length, trigger distance, labels) make the app feel inconsistent.

## Shared behavior contract

- **Ball count:** 4 balls.
- **Motion rhythm:** staggered bounce with `0.12s` delay between balls.
- **Animation cycle:** `0.8s` ease-in-out repeat with auto-reverse.
- **Refresh hold time:** minimum `1200ms` visible refreshing state, even if network is faster.
- **Pull trigger threshold:** `24pt/px` equivalent before release-to-refresh is fully armed so the indicator appears right away.
- **Pull resistance:** tuned to `0.72` so the custom balls track the finger movement sooner, closer to native iOS feel.

## Labels (Swedish)

- Pulling: `Dra för att ladda senaste padelnytt...`
- Release-ready: `Släpp för att uppdatera`
- Refreshing: `Padelbollarna studsar medan vi laddar...`

## Implementation mapping

- **PWA:**
  - Gesture tuning in `src/Components/Shared/PullToRefreshContent.tsx`.
  - Animation styles in `src/index.css` (`.ptr-ios-*` classes).
  - Minimum refresh duration in `src/hooks/usePullToRefresh.ts`.
- **iOS native:**
  - Shared pull-to-refresh constants + duration helper in `ios-native/PadelNative/Views/Components/PadelRefreshHeader.swift` (`PullToRefreshBehavior`).
  - 4-ball indicator visuals in `ios-native/PadelNative/Views/Components/BallRefreshIndicator.swift`.
  - All `.refreshable` screens call the shared helper.

## QA checklist

1. Pull down halfway: indicator appears and follows drag progress smoothly.
2. Pull past threshold and release: refresh starts reliably near same drag distance as PWA.
3. Fast network case: refreshing indicator still stays visible for ~1200ms (no flash).
4. Slow network case: indicator remains until load completes (no premature hide).
5. Labels match exact copy on both apps.
6. Empty-state screens still show consistent pull-to-refresh feedback.
