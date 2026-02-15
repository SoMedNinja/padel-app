# Link ownership and routing (iOS + web)

## Why this exists (non-coder explanation)
When someone taps a shared link, we want one predictable result:
1. If the iOS app is installed, open the native screen directly.
2. If the app is not installed, open the same feature in the web app/PWA.

Apple calls this **Universal Links**. They require cooperation between:
- the app project (to claim a domain),
- the website host (to publish trust metadata), and
- the web router (to keep equivalent browser routes alive).

Think of this as a “routing contract”: if a URL is shared publicly, both iOS and web must know what to do with it.

## Ownership setup completed

### 1) iOS app claims the domain
- Added Associated Domains capability via `PadelNative.entitlements`.
- Added Xcode build setting `CODE_SIGN_ENTITLEMENTS` so the capability is included in signed builds.
- Added matching XcodeGen config in `ios-native/project.yml` so project regeneration keeps the setting.

### 2) Domain publishes Apple trust file
- Added `public/.well-known/apple-app-site-association` with route paths for:
  - `/schema*`
  - `/schedule*`
  - `/single-game*`
  - `/match/*`
- Added Vercel header to serve this file as `application/json`.

> Important deployment note: replace `ABCDE12345.com.example.padelnative` with your real
> `TEAM_ID.BUNDLE_IDENTIFIER` in production.

### 3) Browser/PWA equivalents kept working
- Vercel SPA rewrites now cover every client-side route in `src/AppRoutes.tsx`, including canonical pages and legacy aliases.
- React route `/schema` redirects to canonical `/schedule`.
- React route `/match/:matchId` redirects to history and highlights the target match.

## Routing contract (source of truth)

### Contract rule
Any path declared in `src/AppRoutes.tsx` that is meant to render in the browser must have a matching Vercel rewrite to `/index.html` (except `/`, which is the document root already).

Non-coder note: this is needed so direct opens like typing `padelnative.app/history` in the address bar still load the app first, then let React show the right screen.

### Route alignment table

| React route path (`src/AppRoutes.tsx`) | Purpose | Vercel rewrite required? | Rewritten source |
| --- | --- | --- | --- |
| `/` | Profile home | No (served directly) | n/a |
| `/dashboard` | Dashboard view | Yes | `/dashboard` |
| `/grabbarnas-serie` | Legacy alias to dashboard | Yes | `/grabbarnas-serie` |
| `/history` | Match history | Yes | `/history` |
| `/schedule` | Canonical schedule route | Yes | `/schedule` |
| `/schema` | Legacy alias to schedule | Yes | `/schema` |
| `/tournament` | Tournament page | Yes | `/tournament` |
| `/profile` | Legacy alias to `/` | Yes | `/profile` |
| `/mexicana` | Legacy alias to tournament | Yes | `/mexicana` |
| `/single-game` | Single game page | Yes | `/single-game` |
| `/match/:matchId` | Match deep link | Yes (dynamic) | `/match/(.*)` |
| `/offline` | Offline fallback page | Yes | `/offline` |
| `/admin` | Admin page | Yes | `/admin` |
| `/admin/email` | Admin email sub-route | Yes | `/admin/email` |

## Fallback behavior hierarchy

1. **Native app path (preferred)**
   - iOS reads Universal Link from `padelnative.app` and opens `PadelNative` directly.
2. **PWA/browser path (fallback)**
   - If app is missing/unavailable, the URL stays in browser and resolves through React Router.
3. **Safety fallback**
   - Unknown links end up at normal app defaults (`/` on web, banner warning in iOS).

## Invite/share URL validation matrix

### Schedule invite/vote links
- Canonical link format from backend mail functions: `/schedule?poll=<pollId>&day=<dayId>&slots=<...>`.
- Native iOS: parser now prefers universal `https://padelnative.app/schedule?...` and keeps `/schema` as a legacy alias.
- Web/PWA: `SchedulePage` already consumes `poll/day/slots` query values and applies the vote.

### Match share links
- Link format from native share metadata: `/match/<matchId>`.
- Native iOS: parser now recognizes `/match/<id>` and opens history tab.
- Web/PWA: route forwards to history and highlights the target match.

## Canonical schedule route policy

- **Canonical route:** `/schedule` for all newly generated links across web, docs, and notifications.
- **Temporary compatibility route:** `/schema` redirects/parses to `/schedule` so older shared links continue to open correctly.
- **Phase-out sequence:**
  1. Start generating only `/schedule`.
  2. Wait through a compatibility window (30-60 days recommended) while monitoring `/schema` usage.
  3. Remove `/schema` redirect/parser support after usage reaches near-zero.

> Note for non-coders: this avoids “broken old links” while the team gradually moves everyone to one stable URL.

## QA checklist (deep-link regression)

Use this quick checklist whenever routing or link ownership changes:
- [ ] Open route directly in browser (example: paste `/dashboard`, `/history`, `/tournament`, `/match/<id>`).
- [ ] Open same destination from a push notification link.
- [ ] Open same destination from a homescreen shortcut.

Passing all three confirms both deep-link ownership and SPA fallback behavior are still aligned.
