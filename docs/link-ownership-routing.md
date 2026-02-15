# Link ownership and routing (iOS + web)

## Why this exists (non-coder explanation)
When someone taps a shared link, we want one predictable result:
1. If the iOS app is installed, open the native screen directly.
2. If the app is not installed, open the same feature in the web app/PWA.

Apple calls this **Universal Links**. They require cooperation between:
- the app project (to claim a domain),
- the website host (to publish trust metadata), and
- the web router (to keep equivalent browser routes alive).

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
- Added SPA rewrites for `/schema`, `/schedule`, `/single-game`, `/match/:id`.
- Added web route `/schema` that temporarily redirects to canonical `/schedule`.
- Added web route `/match/:matchId` that redirects to `/history?match=<id>`.
- History now auto-scrolls/highlights the requested match card.

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
