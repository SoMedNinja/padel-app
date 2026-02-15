import { PermissionCapability, SharedPermissionState } from "../types/permissions";
import { SHARED_PERMISSION_CAPABILITY_MATRIX } from "./permissionCapabilityMatrix";

// Note for non-coders:
// "copy" means user-facing text. Keeping one table avoids different wording in different screens.
export const SHARED_PERMISSION_STATE_LABELS: Record<SharedPermissionState, string> = {
  allowed: "Allowed",
  blocked: "Blocked",
  limited: "Limited",
  action_needed: "Action needed",
};

export const SHARED_PERMISSION_CAPABILITY_LABELS: Record<PermissionCapability, string> = {
  notifications: "Notifications",
  background_refresh: "Background refresh",
  biometric_passkey: "Biometric / passkey",
  calendar: "Calendar",
};

export const WEB_PERMISSION_CAPABILITY_HELP: Record<PermissionCapability, string> = {
  notifications: "Browser alerts for match reminders and admin updates.",
  background_refresh: "Service worker readiness to receive pushes while the page is closed.",
  biometric_passkey: "Whether this browser/device can use platform passkeys.",
  calendar: "Web cannot directly toggle OS calendar permission; calendar features depend on your mail/calendar app.",
};

export const IOS_PERMISSION_LIMITATIONS_COPY = {
  notifications:
    "On iPhone/iPad, notifications only work after you add the app to your Home Screen and allow alerts in iOS Settings.",
  backgroundRefresh:
    "iOS may pause background updates to save battery. Keep the app installed on Home Screen and allow Background App Refresh in Settings.",
};

export function sharedPermissionGuidance(capability: PermissionCapability, state: SharedPermissionState): string {
  return SHARED_PERMISSION_CAPABILITY_MATRIX[capability][state].explanation;
}

export function sharedPermissionActionLabel(capability: PermissionCapability, state: SharedPermissionState): string {
  return SHARED_PERMISSION_CAPABILITY_MATRIX[capability][state].actionLabel;
}
