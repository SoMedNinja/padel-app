# PWA and iOS Integration Setup

This document explains how the Padel Native web app handles installation and "native-like" behavior on mobile devices.

## How it works

- **Web App Manifest (`vite.config.js`)**: This file controls the **install behavior** on Android and most desktop browsers. It defines the app name, icons, and "shortcuts" (quick actions) that appear when you long-press the app icon.
- **Apple Meta Tags (`index.html`)**: Since iOS does not fully support all standard PWA features, we use specific Apple-only tags to control **iPhone home-screen behavior**. These tags ensure the app:
  - Opens without a browser address bar (standalone mode).
  - Uses a high-quality icon.
  - Displays a splash screen (launch image) while loading.
  - Matches the brand colors in the status bar.


### Which prompt appears when? (non-coder note)

- **Browser install popup (one-tap install button):** shown on browsers that support the install event (for example Android Chrome) after basic cadence checks (first visit, guest user, or repeat visits) and when the app is not already installed.
- **iOS manual install guide (Share → Add to Home Screen):** shown on iPhone/iPad Safari when the same cadence checks allow prompting, because iOS does not expose the browser install popup event.
- **Permission setup guide dialog:** opened when the user taps “Behörighetshjälp” from install/version/menu/settings surfaces; it gives step-by-step actions and reuses the same install wording so instructions stay consistent.

### Why iOS install is manual (non-coder note)

On iPhone/iPad, Safari does **not** expose the same `beforeinstallprompt` browser event that Android Chrome and many desktop browsers support. That means the app cannot trigger a one-tap "Install" popup on iOS. Instead, we show a short guide so users can manually tap **Share → Add to Home Screen**. On Android Chrome and compatible desktop browsers, the install popup can appear automatically because that event is available.

## Single source-of-truth for asset references

- We keep all PWA/iOS asset references in one file: **`design/pwa-assets.json`**.
- A generator script reads that file and rewrites two generated blocks:
  - Apple startup-image `<link>` tags in `index.html`.
  - `includeAssets` and `manifest.icons` entries in `vite.config.js`.
- This avoids subtle drift where one file gets updated but the other is forgotten.

## Regeneration flow

1. Update file names or media queries in `design/pwa-assets.json`.
2. Run `npm run pwa:generate`.
3. Commit all resulting changes (usually `index.html`, `vite.config.js`, and the manifest file itself).

### CI protection (non-coder note)

`npm run pwa:check` is used in CI and does two safety checks:

1. Verifies every file referenced in `design/pwa-assets.json` actually exists inside `public/`.
2. Re-runs the generator and fails if `index.html`/`vite.config.js` were not regenerated.

If CI fails, run `npm run pwa:generate` locally, review the diff, and commit.

## Maintenance

When updating brand colors or icons:
1. Update `design/tokens.json` and regenerate tokens.
2. Ensure `vite.config.js` and `index.html` remain in sync with the `theme_color` (currently `#d32f2f`).
3. If the main app icon changes, new launch images should be generated for various iPhone screen sizes to maintain a professional splash screen experience.
