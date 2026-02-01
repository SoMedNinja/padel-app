# PWA deploy caching checklist

## Why we do this

When the app is installed as a PWA, the browser can keep an old copy of `index.html`. That file tells the app which JavaScript files to load. If the HTML is stale after a deploy, it points to JS files that no longer exist and the app shows a gray/blank screen.

**Note for non-coders:** `index.html` is the app’s table of contents. If the table of contents is old, the app can’t find the real pages.

## What we configured in this repo

Vercel cache headers are defined in `vercel.json`:

- `index.html` (and `/`) are served with **no-cache / no-store** so installed apps always fetch the latest HTML.
- `/assets/*` files are cached for a long time in the browser (`max-age=31536000`) and for one week at the CDN (`s-maxage=604800`). This keeps recently deployed JS assets available while clients update.

**Note for non-coders:** the hashed assets are like labeled spare parts. We keep them around longer so older app installs can still find the parts they expect.

## Hosting checklist (for Vercel)

1. Ensure `vercel.json` is deployed with your app.
2. Avoid manually deleting recent deployments right after a release.

**Note for non-coders:** keeping the last 1–2 deployments around is like leaving yesterday’s spare parts on the shelf in case someone still needs them.
