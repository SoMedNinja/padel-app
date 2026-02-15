import { PermissionCapabilityMatrix } from "../types/permissions";

// Note for non-coders:
// This is the shared capability matrix used as the source of truth for guidance text.
export const SHARED_PERMISSION_CAPABILITY_MATRIX: PermissionCapabilityMatrix = {
  notifications: {
    allowed: "Allowed: reminders and admin updates can be delivered.",
    blocked: "Blocked: notifications are off for this app. Open system/browser settings and allow notifications.",
    limited: "Limited: only partial notification surfaces are available on this device/browser.",
    action_needed: "Action needed: grant notification permission to receive reminders.",
  },
  background_refresh: {
    allowed: "Allowed: background delivery/refresh is available.",
    blocked: "Blocked: background activity is disabled in system settings.",
    limited: "Limited: background behavior depends on browser or OS constraints.",
    action_needed: "Action needed: enable background activity support, then retry.",
  },
  biometric_passkey: {
    allowed: "Allowed: biometric/passkey features are ready to use.",
    blocked: "Blocked: biometric/passkey usage is disabled in system settings.",
    limited: "Limited: this device/browser does not fully support biometric or passkey features.",
    action_needed: "Action needed: enable biometric/passkey and confirm setup.",
  },
  calendar: {
    allowed: "Allowed: calendar access is available for saving matches.",
    blocked: "Blocked: calendar permission is denied. Open settings and allow calendar access.",
    limited: "Limited: web cannot directly toggle OS calendar permission.",
    action_needed: "Action needed: grant calendar access to save matches automatically.",
  },
};

export const SHARED_PERMISSION_PLATFORM_DIFFERENCES =
  "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support.";
