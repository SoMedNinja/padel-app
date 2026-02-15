# iOS Publishing Guide (TestFlight + App Store)

This guide is written as a step-by-step runbook you can follow every time you ship.

> Note for non-coders: think of this as a "flight checklist." You run it top-to-bottom to avoid release mistakes.

---

## 1) Prerequisites (one-time setup)

1. **Apple Developer Program**
   - Enroll with the Apple ID that will own the app.
   - Confirm you can access [App Store Connect](https://appstoreconnect.apple.com).

2. **Xcode + toolchain**
   - Install latest stable Xcode from the App Store.
   - Install Xcode command-line tools:
     ```bash
     xcode-select --install
     ```

3. **Create App Store Connect app record**
   - In App Store Connect -> **My Apps** -> **+** -> **New App**.
   - Match these values with your project:
     - Bundle ID (must match Xcode exactly)
     - App Name
     - Primary language
     - SKU (internal ID)

4. **Certificates and signing**
   - In Xcode -> Settings -> Accounts -> add your Apple ID.
   - Open project target -> Signing & Capabilities -> enable "Automatically manage signing".
   - Select your Apple Team.

---

## 2) Prepare the app in this repository

1. Generate the Xcode project:
   ```bash
   cd ios-native
   xcodegen generate
   ```

2. Open `PadelNative.xcodeproj` in Xcode.

3. Set production values:
   - `PRODUCT_BUNDLE_IDENTIFIER` (for example: `com.yourcompany.padelnative`)
   - Signing team
   - Version (`MARKETING_VERSION`, e.g. `1.0.0`)
   - Build (`CURRENT_PROJECT_VERSION`, e.g. `1` then increment every upload)

4. Configure Supabase secrets in `PadelNative/Config/AppSecrets.xcconfig`.

5. Add final app icons in `PadelNative/Resources/Assets.xcassets/AppIcon.appiconset`.
   - Must include 1024x1024 App Store icon.

6. Validate privacy declarations:
   - Update `PadelNative/Resources/PrivacyInfo.xcprivacy`.
   - Ensure it matches your real data processing and privacy policy text.

> Note for non-coders: "Version" is what users see. "Build" is an internal counter Apple uses for each upload.

---

## 3) Local validation before upload

From `ios-native`:

```bash
xcodegen generate
xcodebuild -project PadelNative.xcodeproj -scheme PadelNative -configuration Release -destination 'generic/platform=iOS' clean build
```

What to check:
- Build succeeds with no signing errors.
- No missing app icon warnings.
- No missing privacy manifest warnings.

If you prefer GUI validation:
- Product -> Archive in Xcode.
- If Archive succeeds, the binary is structurally ready for distribution.

---


## Personal Team signing limitation (Associated Domains)

If you build with a personal/free Apple team, Apple will not issue provisioning profiles containing the **Associated Domains** capability.

Symptoms:
- `Personal development teams ... do not support the Associated Domains capability`
- `Provisioning profile ... doesn't include the com.apple.developer.associated-domains entitlement`

What to do:
1. For local device development on a personal team, keep Associated Domains disabled in entitlements.
2. Regenerate the project (`xcodegen generate`) and rebuild.
3. For real Universal Links in production, switch to a paid Apple Developer Program team and then enable Associated Domains for that App ID.

> Note for non-coders: your app binary and your Apple signing profile must agree on every capability. If the app asks for a capability that the profile cannot grant, the build is blocked.

---

## 4) Publish to TestFlight

1. In Xcode, select **Any iOS Device (arm64)** target.
2. Product -> Archive.
3. When Organizer opens, select archive -> **Distribute App**.
4. Choose **App Store Connect** -> **Upload**.
5. Keep default options unless your compliance/legal team requires custom behavior.
6. Complete upload and wait for processing in App Store Connect.

In App Store Connect:
1. Go to **My Apps -> your app -> TestFlight**.
2. Wait until build status becomes **Ready to Test**.
3. Complete compliance prompts if shown (encryption/export).
4. Add internal testers (team members) first.
5. For external testers:
   - Create tester group.
   - Fill beta app description + contact info.
   - Submit build for Beta App Review.

> Note for non-coders: TestFlight is the "staging lane" for real phones before public release.

---

## 5) Publish to the App Store

1. Ensure at least one TestFlight build has been tested and approved internally.
2. In App Store Connect -> **App Store** tab:
   - Create a new app version (e.g. `1.0.0`).
   - Attach the processed build.
   - Fill all required metadata:
     - Description
     - Keywords
     - Support URL
     - Marketing URL (optional but recommended)
     - Privacy policy URL
     - App category
     - Age rating questionnaire
   - Upload required screenshots for supported device sizes.

3. Fill **App Privacy** section accurately.
4. Fill **Export Compliance** questions.
5. Submit for review.

After approval:
- Release manually, automatically, or on scheduled date.

> Note for non-coders: Apple review checks both technical quality and policy compliance. Missing metadata is a common rejection reason.

---

## 6) Release cadence checklist (every new version)

1. Update code.
2. If visual styles changed, update `design/tokens.json`, run `npm run tokens:generate`, and commit the regenerated web + iOS token files together.
3. Increment `MARKETING_VERSION` when user-facing release changes.
4. Increment `CURRENT_PROJECT_VERSION` for every upload attempt.
5. Archive and upload to TestFlight.
6. Smoke test with internal testers.
7. Re-verify privacy manifest compliance in `PadelNative/Resources/PrivacyInfo.xcprivacy` against currently used iOS APIs (especially required-reason APIs like UserDefaults) before submission.
8. Promote build to App Store submission.

> Note for non-coders: this privacy re-check is a quick "policy safety check" to prevent App Store rejection when app features change.

---


## 6.1) Pre-ship identity lock checklist (must pass)

> Note for non-coders: Universal Links are strict identity checks. Apple only opens the app from a web link when all IDs match exactly character-for-character.

Before every TestFlight/App Store submission, verify these three items together:

1. **AASA appID matches Apple app identity exactly**
   - Check `public/.well-known/apple-app-site-association` -> `applinks.details[0].appID`.
   - It must equal: `TEAM_ID.PRODUCT_BUNDLE_IDENTIFIER` (example format: `AB12C34DEF.se.robban.padelnative`).
2. **Bundle identifier matches production app record**
   - Check `ios-native/project.yml` -> `PRODUCT_BUNDLE_IDENTIFIER`.
   - Confirm the same value is set in App Store Connect -> My Apps -> App Information -> Bundle ID.
3. **App Store URL points to the real app listing**
   - Check `ios-native/project.yml` -> `INFOPLIST_KEY_APP_STORE_URL`.
   - URL must use the real numeric App Store app id (`https://apps.apple.com/app/id##########`).

Why Universal Links fail when IDs do not match exactly:
- Apple treats each app as a unique identity pair: **Team ID + Bundle ID**.
- Your website trust file (AASA) must declare that exact pair.
- If one character is different (uppercase/lowercase, typo, wrong app id, wrong team), iOS cannot prove trust and opens Safari instead of your app.

## 7) Common failure points + fixes

- **"Invalid Bundle" / identifier mismatch**
  - Fix: Ensure Xcode bundle identifier exactly matches the App Store Connect app record.

- **Missing app icon error**
  - Fix: Add all required icon sizes, especially 1024x1024 marketing icon.

- **Build already exists**
  - Fix: Increment `CURRENT_PROJECT_VERSION` and upload again.

- **Privacy mismatch rejection**
  - Fix: Align `PrivacyInfo.xcprivacy`, App Privacy answers, and your public privacy policy.

- **Signing failures**
  - Fix: Re-select Team, enable automatic signing, verify account permissions in App Store Connect.

---

## 8) Optional CLI upload path (advanced)

You can upload from terminal after archiving if you prefer automation. `ExportOptions-AppStore.plist` is provided at:

- `PadelNative/Resources/Release/ExportOptions-AppStore.plist`

Typical flow:
1. `xcodebuild archive ...`
2. `xcodebuild -exportArchive ... -exportOptionsPlist ...`
3. Upload `.ipa` with Transporter or `xcrun altool`/App Store Connect API-based tooling.

> Note for non-coders: use Xcode GUI first. CLI release is useful later for CI/CD pipelines.
