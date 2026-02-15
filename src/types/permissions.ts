// Note for non-coders:
// This file defines one shared vocabulary for permission states so web and iOS talk the same language.
export const SHARED_PERMISSION_STATES = ["allowed", "blocked", "limited", "action_needed"] as const;

export type SharedPermissionState = (typeof SHARED_PERMISSION_STATES)[number];

export type PermissionCapability =
  | "notifications"
  | "background_refresh"
  | "biometric_passkey"
  | "calendar";

// Note for non-coders:
// This matrix schema says: for each capability + state, provide user guidance copy.
export type PermissionCapabilityMatrix = Record<
  PermissionCapability,
  Record<SharedPermissionState, string>
>;

export interface PermissionStatusSnapshot {
  capability: PermissionCapability;
  state: SharedPermissionState;
  detail: string;
  actionLabel: string;
  actionEnabled: boolean;
}
