import { PermissionCapabilityMatrix } from "../types/permissions";

// Note for non-coders:
// This is the shared capability matrix used as the source of truth for guidance text.
export const SHARED_PERMISSION_CAPABILITY_MATRIX: PermissionCapabilityMatrix = {
  notifications: {
    allowed: {
      explanation: "Allowed: reminders and admin updates can be delivered.",
      actionLabel: "Retry check",
    },
    blocked: {
      explanation: "Blocked: notifications are off for this app. Open system/browser settings and allow notifications.",
      actionLabel: "Open Settings",
    },
    limited: {
      explanation: "Limited: only partial notification surfaces are available on this device/browser.",
      actionLabel: "Open Settings",
    },
    action_needed: {
      explanation: "Action needed: grant notification permission to receive reminders.",
      actionLabel: "Request",
    },
  },
  background_refresh: {
    allowed: {
      explanation: "Allowed: background delivery/refresh is available.",
      actionLabel: "Retry check",
    },
    blocked: {
      explanation: "Blocked: background activity is disabled in system settings.",
      actionLabel: "Open Settings",
    },
    limited: {
      explanation: "Limited: background behavior depends on browser or OS constraints.",
      actionLabel: "Open Settings",
    },
    action_needed: {
      explanation: "Action needed: enable background activity support, then retry.",
      actionLabel: "Open Settings",
    },
  },
  biometric_passkey: {
    allowed: {
      explanation: "Allowed: biometric/passkey features are ready to use.",
      actionLabel: "Retry check",
    },
    blocked: {
      explanation: "Blocked: biometric/passkey usage is disabled in system settings.",
      actionLabel: "Open Settings",
    },
    limited: {
      explanation: "Limited: this device/browser does not fully support biometric or passkey features.",
      actionLabel: "Open Settings",
    },
    action_needed: {
      explanation: "Action needed: enable biometric/passkey and confirm setup.",
      actionLabel: "Request",
    },
  },
  calendar: {
    allowed: {
      explanation: "Allowed: calendar access is available for saving matches.",
      actionLabel: "Retry check",
    },
    blocked: {
      explanation: "Blocked: calendar permission is denied. Open settings and allow calendar access.",
      actionLabel: "Open Settings",
    },
    limited: {
      explanation: "Limited: web cannot directly toggle OS calendar permission.",
      actionLabel: "Open calendar settings",
    },
    action_needed: {
      explanation: "Action needed: grant calendar access to save matches automatically.",
      actionLabel: "Request",
    },
  },
};

export const SHARED_PERMISSION_PLATFORM_DIFFERENCES =
  "Platform differences: web can request Notifications, but background behavior depends on service workers/browser policies and calendar permission cannot be toggled directly; iOS can request Notifications and Calendar, while Background App Refresh and biometric availability depend on iOS Settings/device support.";
