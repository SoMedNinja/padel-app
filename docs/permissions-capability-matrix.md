# Shared capability matrix (Web + iOS)

This document is the canonical matrix for permission capability copy.

- Shape: `capability -> state -> user guidance`
- States: `allowed`, `blocked`, `limited`, `action_needed`

## Matrix

| Capability | allowed | blocked | limited | action_needed |
|---|---|---|---|---|
| notifications | Allowed: reminders and admin updates can be delivered. | Blocked: notifications are off for this app. Open system/browser settings and allow notifications. | Limited: only partial notification surfaces are available on this device/browser. | Action needed: grant notification permission to receive reminders. |
| background_refresh | Allowed: background delivery/refresh is available. | Blocked: background activity is disabled in system settings. | Limited: background behavior depends on browser or OS constraints. | Action needed: enable background activity support, then retry. |
| biometric_passkey | Allowed: biometric/passkey features are ready to use. | Blocked: biometric/passkey usage is disabled in system settings. | Limited: this device/browser does not fully support biometric or passkey features. | Action needed: enable biometric/passkey and confirm setup. |
| calendar | Allowed: calendar access is available for saving matches. | Blocked: calendar permission is denied. Open settings and allow calendar access. | Limited: web cannot directly toggle OS calendar permission. | Action needed: grant calendar access to save matches automatically. |

## Cross-platform parity note

Use this exact sentence on both clients:

> Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support.

## Non-coder note

The matrix keeps wording stable so users get the same explanation on web and iOS, even when the underlying OS APIs are different.
