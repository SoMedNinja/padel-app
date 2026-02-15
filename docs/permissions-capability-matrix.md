# Shared capability matrix (Web + iOS)

This document is the canonical matrix for permission semantics.

- Shape: `capability -> state -> { explanation, action_label }`
- States: `allowed`, `blocked`, `limited`, `action_needed`

## Matrix

| Capability | State | User-facing explanation | Action label |
|---|---|---|---|
| notifications | allowed | Allowed: reminders and admin updates can be delivered. | Retry check |
| notifications | blocked | Blocked: notifications are off for this app. Open system/browser settings and allow notifications. | Open Settings |
| notifications | limited | Limited: only partial notification surfaces are available on this device/browser. | Open Settings |
| notifications | action_needed | Action needed: grant notification permission to receive reminders. | Request |
| background_refresh | allowed | Allowed: background delivery/refresh is available. | Retry check |
| background_refresh | blocked | Blocked: background activity is disabled in system settings. | Open Settings |
| background_refresh | limited | Limited: background behavior depends on browser or OS constraints. | Open Settings |
| background_refresh | action_needed | Action needed: enable background activity support, then retry. | Open Settings |
| biometric_passkey | allowed | Allowed: biometric/passkey features are ready to use. | Retry check |
| biometric_passkey | blocked | Blocked: biometric/passkey usage is disabled in system settings. | Open Settings |
| biometric_passkey | limited | Limited: this device/browser does not fully support biometric or passkey features. | Open Settings |
| biometric_passkey | action_needed | Action needed: enable biometric/passkey and confirm setup. | Request |
| calendar | allowed | Allowed: calendar access is available for saving matches. | Retry check |
| calendar | blocked | Blocked: calendar permission is denied. Open settings and allow calendar access. | Open Settings |
| calendar | limited | Limited: web cannot directly toggle OS calendar permission. | Open calendar settings |
| calendar | action_needed | Action needed: grant calendar access to save matches automatically. | Request |

## Cross-platform parity note

Use this exact sentence on both clients:

> Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support.

## Non-coder note

The matrix keeps wording stable so users get the same explanation and next-step action on web and iOS, even when the underlying OS APIs are different.


## Shared troubleshooting by state

Use this section when a capability shows one of the four shared states. The goal is to give exact next steps with platform-specific wording while preserving the same state terminology.

| State | iOS exact user action | Web exact user action |
|---|---|---|
| `allowed` | Tap **Retry check** to refresh status and confirm nothing regressed in iOS Settings. | Tap **Retry check** to re-run permission checks and verify push/service-worker readiness. |
| `blocked` | Tap **Open Settings** and enable the blocked permission in iOS Settings for PadelNative, then return and retry. | Tap **Open Settings** and allow the blocked permission in browser/site settings for this app, then refresh or retry. |
| `limited` | Tap **Open Settings** and review device restrictions/support limits (for example Background App Refresh restrictions or unavailable biometrics). | Tap **Open Settings** and review browser/site constraints (for example HTTPS/PWA/service-worker limitations); if calendar is limited, use **Open calendar settings**. |
| `action_needed` | Tap **Request** when available (Notifications/Calendar/Biometric setup) to prompt iOS permission flow, or follow **Open Settings** when the capability requires settings-level enablement. | Tap **Request** when browser permission can be prompted (Notifications); otherwise follow the shown action to finish setup (for example service-worker/background setup). |
