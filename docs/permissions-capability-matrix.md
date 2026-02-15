# Shared capability matrix (Web + iOS)

This project now uses one canonical machine-readable file: `docs/permissions-capability-matrix.json`.

- It defines **capability + state + explanation + action label**.
- It also keeps localization explicit for **Swedish (`sv`)** and **English (`en`)**.
- Generated outputs:
  - `src/shared/permissionCapabilityMatrix.ts` (web defaults to Swedish)
  - `ios-native/PadelNative/Models/SharedPermissionsState.swift` (iOS defaults to English)

## Localization strategy (explicit)

- The source JSON has `supported_locales` and `default_locale_by_client`.
- Current defaults:
  - Web: `sv`
  - iOS: `en`
- Every capability/state pair must include both `sv` and `en` for:
  - `explanation`
  - `action_label`

## Translator workflow

> Note for non-coders: translators only need to touch one JSON file; scripts update app code automatically.

1. Open `docs/permissions-capability-matrix.json`.
2. Update text under both `sv` and `en` where needed.
3. Run generator:
   - `npm run permissions:generate`
4. Run sync check:
   - `npm run permissions:check`
5. Commit the source JSON and generated files together.

## CI parity check

CI runs `npm run permissions:check` and fails if generated files are out of sync with the JSON source.

## Non-coder note

This setup avoids copy/paste drift across platforms: we edit one source file and generate both app outputs from it.
