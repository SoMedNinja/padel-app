# PWA and iOS Integration Setup

This document explains how the Padel Native web app handles installation and "native-like" behavior on mobile devices.

## How it works

- **Web App Manifest (`vite.config.js`)**: This file controls the **install behavior** on Android and most desktop browsers. It defines the app name, icons, and "shortcuts" (quick actions) that appear when you long-press the app icon.
- **Apple Meta Tags (`index.html`)**: Since iOS does not fully support all standard PWA features, we use specific Apple-only tags to control **iPhone home-screen behavior**. These tags ensure the app:
  - Opens without a browser address bar (standalone mode).
  - Uses a high-quality icon.
  - Displays a splash screen (launch image) while loading.
  - Matches the brand colors in the status bar.

## Maintenance

When updating brand colors or icons:
1. Update `design/tokens.json` and regenerate tokens.
2. Ensure `vite.config.js` and `index.html` remain in sync with the `theme_color` (currently `#d32f2f`).
3. If the main app icon changes, new launch images should be generated for various iPhone screen sizes to maintain a professional splash screen experience.
