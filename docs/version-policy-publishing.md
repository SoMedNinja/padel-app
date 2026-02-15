# Version policy publishing (web + iOS)

This guide explains how product owners publish **both web and iOS update rules together** so users get consistent upgrade messaging.

## Why this table exists

`app_version_policies` lets us define two levels of upgrades per platform:

- `minimum_version`: if user is below this, update is **required**.
- `latest_version`: if user is below this (but still above minimum), update is **recommended**.

For non-coders: think of this as a traffic-light rulebook managed in one place.

- Red = too old, must update.
- Yellow = update soon.
- Green = already current.

## Table contract

Each platform must have exactly one row:

- `platform = 'web'`
- `platform = 'ios'`

The migration enforces this using a unique constraint on `platform`.

## Publish checklist (recommended order)

1. Decide the rollout target versions for both web and iOS.
2. Update iOS release in App Store Connect (if needed).
3. Deploy the web build.
4. Upsert policy rows in Supabase for `web` and `ios` in the same change window.

### Example SQL (run in Supabase SQL editor)

```sql
insert into public.app_version_policies (platform, minimum_version, latest_version, release_notes)
values
  ('web', '1.14.0', '1.15.0', 'Ny webversion med stabilitetsförbättringar.'),
  ('ios', '1.14.0', '1.15.0', 'Ny iOS-version finns i App Store.')
on conflict (platform)
do update set
  minimum_version = excluded.minimum_version,
  latest_version = excluded.latest_version,
  release_notes = excluded.release_notes,
  updated_at = timezone('utc'::text, now());
```

## Runtime behavior summary

- Web app reads `platform = web` and shows required/recommended banner.
- iOS app reads `platform = ios` and shows required/recommended dialog.
- If Supabase is temporarily unavailable, clients can fall back to bundled local defaults.
