# Merge conflict resolution: backend notification sync vs permissions imports

## Why this conflict happened (non-coder explanation)

Two branches changed the **same import lines**:

- One branch added backend notification-sync support.
- Another branch added permissions-model UI imports.

Git cannot decide which line to keep, so it shows `<<<<<<<`, `=======`, `>>>>>>>` markers and asks you to choose.

## 1) Conflict around `supabase` vs `PermissionStatusSnapshot`

When both are actually used in the file, keep **both imports**:

```ts
import { supabase } from "../supabaseClient";
import { PermissionStatusSnapshot } from "../types/permissions";
```

If one of them is unused in that file, remove the unused one to keep lint clean.

## 2) Conflict around notification service imports

If you want backend-backed preference sync (the newer behavior), keep:

```ts
import {
  ensureNotificationPermission,
  loadNotificationPreferences,
  loadNotificationPreferencesWithSync,
  saveNotificationPreferencesWithSync,
} from "../services/webNotificationService";
```

And keep the permissions panel import from `main` when the component exists in your branch:

```ts
import WebPermissionsPanel from "../Components/Permissions/WebPermissionsPanel";
```

Do **not** keep both save paths (`saveNotificationPreferences` + `syncPreferencesToServiceWorker`) and the newer `saveNotificationPreferencesWithSync` in the same call-site. Use one model consistently.

## 3) Recommended final merge result for `PlayerProfilePage.tsx`

- Keep `loadNotificationPreferencesWithSync` in a `useEffect` after sign-in so backend values hydrate UI.
- Keep `saveNotificationPreferencesWithSync` when user toggles notification switches.
- Keep `WebPermissionsPanel` import/render if that feature exists on your branch.

## 4) Fast verification commands

```bash
pnpm lint
pnpm test
pnpm build
```

If lint reports unused imports, remove whichever side of the conflict is not used in that file.
