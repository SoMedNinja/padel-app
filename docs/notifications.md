# Notifications: Event Schema + Delivery Parity

This document defines the cross-client notification contract used by:

- Web app service-worker push pipeline.
- iOS native push/local-notification pipeline.

## Event types

| Event type | Purpose | Default route |
| --- | --- | --- |
| `scheduled_match_new` | A new scheduled match was created or changed. | `/schema` |
| `availability_poll_reminder` | Reminder to answer an availability poll before deadline. | `/schema` |
| `admin_announcement` | Admin broadcast announcement (maintenance, policy, important updates). | `/` |

## Payload schema (JSON)

```json
{
  "eventType": "scheduled_match_new",
  "title": "Ny match i schemat",
  "body": "Tisdag 19:00 på PDL Center.",
  "route": "/schema",
  "metadata": {
    "matchId": "uuid-or-string"
  },
  "sentAtIso": "2026-02-15T13:45:00.000Z"
}
```

### Field descriptions

- `eventType` (required): one of the three values above.
- `title` (required): notification title shown to the user.
- `body` (required): notification message text.
- `route` (optional): in-app route to open on tap/click.
- `metadata` (optional): string map for client-side context.
- `sentAtIso` (optional): server timestamp in ISO-8601 format.

## Preference model (both clients)

```json
{
  "enabled": true,
  "eventToggles": {
    "scheduled_match_new": true,
    "availability_poll_reminder": true,
    "admin_announcement": true
  },
  "quietHours": {
    "enabled": false,
    "startHour": 22,
    "endHour": 7
  }
}
```

## Delivery rules

1. If `enabled=false`, all notifications are muted.
2. If `eventToggles[eventType]=false`, that event is muted.
3. If quiet hours are active, delivery is suppressed:
   - Web service worker drops push display during quiet window.
   - iOS local schedule reminders are delayed to the quiet-hour end time.
   - iOS foreground push presentation is suppressed during quiet window.

## Database migration checklist

1. Run Supabase migrations so `public.notification_preferences` and `public.push_subscriptions` exist with RLS policies.
2. Verify each signed-in user can only read/write their own rows (admins can assist with support/debugging).
3. Schedule periodic cleanup using `select public.revoke_stale_push_subscriptions(90);` (for example via Supabase cron).

> Note for non-coders: a migration is a versioned database change script. Running it creates the new table and safety rules automatically.

## Implementation notes

- Web stores preferences in backend table `notification_preferences` (`profile_id`, `preferences`) and mirrors to service-worker cache storage; `localStorage` is offline fallback only.
- iOS stores preferences in backend table `notification_preferences` (`profile_id`, `preferences`) and mirrors to `UserDefaults`; `UserDefaults` is offline fallback only.
- Both clients also upsert device endpoints in `push_subscriptions` (`platform`, `device_token`, `profile_id`, `subscription`, `last_seen_at`).
- Revoking/unsubscribing marks `push_subscriptions.revoked_at` so delivery systems can skip inactive endpoints.
- First sign-in migrates existing local/browser preferences to backend if no backend row exists yet.
- iOS local schedule reminders currently map to `scheduled_match_new` semantics for parity.


## Push subscription lifecycle

- **iOS:** APNs token receipt stores token locally, then upserts `push_subscriptions` when a signed-in profile is available.
- **Web:** when browser notification permission is granted, current `PushSubscription` metadata is synced to `push_subscriptions`.
- **Unsubscribe/revoke:**
  - Web unsubscribe flow calls backend revoke + browser `subscription.unsubscribe()`.
  - iOS sign-out and manual notification disable flow revokes the stored APNs token mapping.
- **Stale cleanup:** run `revoke_stale_push_subscriptions` routinely (e.g. nightly) to revoke endpoints that have not been seen recently.

> Note for non-coders: `last_seen_at` is a "last check-in" timestamp for a device token. If a token has not checked in for a long time, cleanup marks it inactive.
