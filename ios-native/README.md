# PadelNative (SwiftUI)

This folder contains a **native iOS SwiftUI app** that mirrors the current web app's core sections while keeping the web app untouched.

> Note for non-coders: the web app and native app are two separate frontends that can talk to the same backend. That means your existing web app keeps working exactly as-is, and the iOS app is an additional client.

## What is included

- Native SwiftUI tab app architecture.
- Supabase REST integration via `URLSession`.
- Feature-oriented models and view models.
- Offline-friendly fallback sample data if API config is missing.
- Route parity with key web routes (Profile, Dashboard, History + Match Details, Schedule, Tournament, Single Game, Admin).
- Release-oriented project metadata for iOS distribution (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`, launch screen generation, app category, app icon catalog linkage).
- A privacy manifest file (`PrivacyInfo.xcprivacy`) to declare data collection behavior.
- A reusable export options plist template for App Store packaging.
- A full release guide for both App Store and TestFlight: `ios-native/docs/IOS_RELEASE_GUIDE.md`.

## Setup path A (recommended): generate Xcode project with XcodeGen

1. Install XcodeGen (`brew install xcodegen`).
2. From `ios-native`, run `xcodegen generate`.
3. Open `PadelNative.xcodeproj` in Xcode.
4. Fill `PadelNative/Config/AppSecrets.xcconfig` with your Supabase URL + anon key.
5. Build and run.

## Setup path B: manual Xcode app setup

1. Open Xcode and create a new **iOS App** named `PadelNative`.
2. Replace generated files with files under `ios-native/PadelNative`.
3. Add `ios-native/PadelNative/Config/AppSecrets.xcconfig` to the project and set it as the target build configuration base file.
4. Add two Info keys mapped from build settings:
   - `SUPABASE_URL` -> `$(SUPABASE_URL)`
   - `SUPABASE_ANON_KEY` -> `$(SUPABASE_ANON_KEY)`
5. Build and run.

## Release assets checklist (must-do before upload)

> Note for non-coders: these are the pieces Apple checks during submission. If one is missing, upload can fail.

1. Replace the placeholder app icon entries in `PadelNative/Resources/Assets.xcassets/AppIcon.appiconset` with real PNG files, including a **1024x1024** marketing icon.
2. Confirm your app's legal/privacy behavior and update `PadelNative/Resources/PrivacyInfo.xcprivacy` so it matches real data handling.
3. Set a production bundle identifier and Apple Team in Xcode Signing settings.
4. Ensure `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` are bumped correctly before each release.
5. Follow `docs/IOS_RELEASE_GUIDE.md` for upload to TestFlight and then the App Store.

## Feature parity notes

The iOS app now includes route-level parity for the web app's primary user flows:

- `/` profile -> `Profile` tab
- `/dashboard` -> `Dashboard` tab
- `/history` + single match detail -> `History` tab + `MatchDetailView`
- `/schema` (permission-gated) -> `Schedule` tab (only for regular users)
- `/tournament` -> `Tournament` tab
- `/single-game` -> `Single Game` tab (native match submit form)
- `/admin` (permission-gated) -> `Admin` tab (only for admins)

> Note for non-coders: "feature parity" means both apps can do the same jobs. The iOS app uses native controls, so it may look different while still covering the same workflow.
