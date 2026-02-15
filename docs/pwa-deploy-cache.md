# PWA deploy caching checklist

## Why we do this

When the app is installed as a PWA, the browser can keep an old copy of `index.html`. That file tells the app which JavaScript files to load. If the HTML is stale after a deploy, it points to JS files that no longer exist and the app shows a gray/blank screen.

**Note for non-coders:** `index.html` is the app’s table of contents. If the table of contents is old, the app can’t find the real pages.

## Why local service-worker dependencies matter

The service worker now imports Workbox from the app bundle at build time (via Vite `injectManifest`) instead of downloading Workbox from a CDN during install/update.

- This removes a network dependency from the very first service-worker install step.
- If a user is on weak Wi‑Fi, behind strict firewalls, or temporarily offline, install is less likely to fail before caching starts.
- It also reduces risk from third-party CDN outages for critical offline/update behavior.

**Note for non-coders:** before this change, the app installer had to fetch an extra tool from the internet first. Now that tool ships inside the app package, so there is one less thing that can break on day one.

## What we configured in this repo

Vercel cache headers are defined in `vercel.json`:

- `index.html` (and `/`) are served with **no-cache / no-store** so installed apps always fetch the latest HTML.
- `/assets/*` files are cached for a long time in the browser (`max-age=31536000`) and for one week at the CDN (`s-maxage=604800`). This keeps recently deployed JS assets available while clients update.

**Note for non-coders:** the hashed assets are like labeled spare parts. We keep them around longer so older app installs can still find the parts they expect.

## Hosting checklist (for Vercel)

1. Ensure `vercel.json` is deployed with your app.
2. Avoid manually deleting recent deployments right after a release.

**Note for non-coders:** keeping the last 1–2 deployments around is like leaving yesterday’s spare parts on the shelf in case someone still needs them.

## Expected update behavior for users

When a new version finishes downloading in the background, the app now shows an in-app update banner (instead of a browser confirm dialog) with two actions:

- **Update now**: tells the waiting service worker to activate immediately, then the app reloads once on the new version.
- **Later**: dismisses the banner and keeps the current session running; the new version is still ready and can be applied the next time the banner appears or when the app restarts.

**Note for non-coders:** this is like seeing a “new app version is ready” card. “Update now” restarts quickly into the new version, while “Later” lets you finish what you were doing first.
