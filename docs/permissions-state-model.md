# Shared permissions state model (Web + iOS)

This project now uses one shared state vocabulary for permission-like capabilities across clients:

- **Allowed**
- **Blocked**
- **Limited**
- **Action needed**

## Shared capability names

The same capability names are used in both clients:

- Notifications
- Background refresh
- Biometric / passkey
- Calendar

## Platform differences

### Web

- **Notifications:** Uses Browser Notification API permission (`granted`, `denied`, `default`) and maps it to the shared states.
- **Background refresh:** Uses service worker support/readiness as the closest equivalent to native background refresh.
- **Biometric / passkey:** Checks whether WebAuthn/Passkey APIs are available in the browser.
- **Calendar:** Web cannot directly request/toggle OS-level calendar permission; users manage this in calendar/email apps.

### iOS

- **Notifications:** Uses `UNUserNotificationCenter` authorization status.
- **Background refresh:** Uses `UIApplication.backgroundRefreshStatus`.
- **Biometric / passkey:** Uses Face ID / Touch ID capability + app-lock setting.
- **Calendar:** Uses EventKit authorization status.

## Why this exists

A single vocabulary makes it easier for users to understand settings regardless of client, and it helps support/debug conversations because both clients describe states with the same words.
