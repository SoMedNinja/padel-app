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
