# Version policy publishing (web + iOS)

This guide explains how product owners publish **both web and iOS update rules together** so users get consistent upgrade messaging.

## Why users can see different urgency levels

For non-coders: there are **three update urgency levels** and each one is intentional.

- **Optional update**: "A newer version is ready, update when it suits you."
  - Typical on web PWA when a fresh deploy is waiting in the background.
- **Recommended update**: "You should update soon, but the app can still run."
  - Triggered when user version is below `latest_version` but still above `minimum_version`.
- **Required update**: "You must update now to continue safely."
  - Triggered when user version is below `minimum_version`.

Different users can see different urgency at the same time because they may be on different app versions or launch contexts (web tab vs installed iOS app).

## Policy table contract

`app_version_policies` lets us define server-side rules per platform:

- `minimum_version`: below this = **required** update.
- `latest_version`: below this (but above minimum) = **recommended** update.

Each platform must have exactly one row:

- `platform = 'web'`
- `platform = 'ios'`

The migration enforces this using a unique constraint on `platform`.

## Release highlights payload contract (shared)

Web and iOS now use the same JSON shape for release highlights:

```json
{
  "currentVersion": "1.15.0",
  "releases": [
    {
      "version": "1.15.0",
      "title": "Nyheter i den här uppdateringen",
      "changes": ["..."]
    }
  ]
}
```

### Shared visibility rules

For non-coders, both clients follow the same display logic:

1. On first install, save the current version as a baseline and **do not** show a popup.
2. Show "what's new" only when current target version is newer than the last seen version.
3. If `currentVersion` is missing, fall back to the runtime app version, then first release entry.

## Publish checklist (recommended order)

1. Decide rollout target versions for both web and iOS.
2. Update iOS release in App Store Connect (if needed).
3. Deploy the web build.
4. Update release highlights JSON for web and iOS using the shared payload contract.
5. Upsert policy rows in Supabase for `web` and `ios` in the same change window.

### Example SQL (run in Supabase SQL editor)

```sql
insert into public.app_version_policies (platform, minimum_version, latest_version, release_notes)
values
  ('web', '1.14.0', '1.15.0', 'En ny version finns. Uppdatera gärna snart för bättre stabilitet och nya förbättringar.'),
  ('ios', '1.14.0', '1.15.0', 'En ny version finns. Uppdatera gärna snart för bättre stabilitet och nya förbättringar.')
on conflict (platform)
do update set
  minimum_version = excluded.minimum_version,
  latest_version = excluded.latest_version,
  release_notes = excluded.release_notes,
  updated_at = timezone('utc'::text, now());
```

## Runtime behavior summary

- Web can show optional/recommended/required based on worker state + policy.
- iOS shows recommended/required from policy (App Store flow) and shared "what's new" visibility rules.
- If Supabase is temporarily unavailable, clients can fall back to bundled local defaults.
