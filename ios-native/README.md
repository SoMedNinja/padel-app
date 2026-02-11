# PadelNative (SwiftUI)

This folder contains a **native iOS SwiftUI app** that mirrors the current web app's core sections (Profile, Dashboard, History, Schedule, Tournament) while keeping the web app untouched.

> Note for non-coders: the web app and native app are two separate frontends that can talk to the same backend. That means your existing web app keeps working exactly as-is, and the iOS app is an additional client.

## What is included

- Native SwiftUI tab app architecture.
- Supabase REST integration via `URLSession`.
- Feature-oriented models and view models.
- Offline-friendly fallback sample data if API config is missing.

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

## Why no App Store requirement here?

You can run and test on your own devices directly from Xcode and later choose TestFlight or another private distribution route.

## Feature parity notes

This is a native foundation that already maps to your web app's key routes. If you want pixel-perfect parity with every existing web feature, continue iterating screen by screen using this structure.

> Note for non-coders: "feature parity" means both apps do the same things. Usually this is done in phases, not all at once.
