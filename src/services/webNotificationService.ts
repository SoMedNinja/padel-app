import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationEventPayload,
  NotificationEventType,
  NotificationPreferences,
} from "../types/notifications";
import { PermissionStatusSnapshot } from "../types/permissions";

const STORAGE_KEY = "settings.notificationPreferences.v1";
const SW_PATH = "/notification-sw.js";

// Note for non-coders:
// The app stores your notification choices in the browser so they persist between visits.
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as NotificationPreferences;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      eventToggles: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.eventToggles,
        ...(parsed.eventToggles ?? {}),
      },
      quietHours: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
        ...(parsed.quietHours ?? {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function isQuietHoursActive(preferences: NotificationPreferences, now = new Date()): boolean {
  if (!preferences.quietHours.enabled) return false;
  const hour = now.getHours();
  const { startHour, endHour } = preferences.quietHours;
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

export function canDeliverEvent(payload: NotificationEventPayload, preferences: NotificationPreferences): boolean {
  if (!preferences.enabled) return false;
  if (!preferences.eventToggles[payload.eventType]) return false;
  if (isQuietHoursActive(preferences)) return false;
  return true;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export async function registerPushServiceWorker(preferences: NotificationPreferences): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  await syncPreferencesToServiceWorker(preferences);
  return registration;
}

export async function syncPreferencesToServiceWorker(preferences: NotificationPreferences): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: "SYNC_NOTIFICATION_PREFERENCES",
    preferences,
  });
}

export async function updateEventToggle(
  existing: NotificationPreferences,
  eventType: NotificationEventType,
  value: boolean
): Promise<NotificationPreferences> {
  const updated: NotificationPreferences = {
    ...existing,
    eventToggles: {
      ...existing.eventToggles,
      [eventType]: value,
    },
  };
  saveNotificationPreferences(updated);
  await syncPreferencesToServiceWorker(updated);
  return updated;
}

async function isServiceWorkerReady(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  } catch {
    return false;
  }
}

// Note for non-coders:
// This collects the browser's capability checks and translates them into the shared state labels.
export async function buildWebPermissionSnapshots(): Promise<PermissionStatusSnapshot[]> {
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = notificationSupported ? Notification.permission : "denied";
  const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const swReady = swSupported ? await isServiceWorkerReady() : false;
  const backgroundSyncSupported = swSupported && "SyncManager" in window;
  const passkeySupported = typeof window !== "undefined" && "PublicKeyCredential" in window;

  const notifications: PermissionStatusSnapshot = {
    capability: "notifications",
    state:
      notificationPermission === "granted"
        ? "allowed"
        : notificationPermission === "denied"
          ? "blocked"
          : "action_needed",
    detail: notificationSupported
      ? `Browser permission is ${notificationPermission}.`
      : "This browser does not support the Notification API.",
    actionLabel: notificationPermission === "default" ? "Request permission" : "Open browser settings",
    actionEnabled: notificationPermission !== "granted",
  };

  const backgroundRefresh: PermissionStatusSnapshot = {
    capability: "background_refresh",
    state: !swSupported ? "limited" : swReady ? "allowed" : "action_needed",
    detail: !swSupported
      ? "Service workers are not available in this browser."
      : swReady
        ? `Service worker is active${backgroundSyncSupported ? " and background sync is supported" : ", but background sync API is limited"}.`
        : "Service worker is not active yet.",
    actionLabel: swReady ? "Recheck" : "Enable service worker",
    actionEnabled: true,
  };

  const biometricsPasskey: PermissionStatusSnapshot = {
    capability: "biometric_passkey",
    state: passkeySupported ? "allowed" : "limited",
    detail: passkeySupported
      ? "Passkey/WebAuthn APIs are available on this browser/device."
      : "Passkey APIs are not available in this browser.",
    actionLabel: passkeySupported ? "Recheck" : "Try another browser/device",
    actionEnabled: false,
  };

  const calendar: PermissionStatusSnapshot = {
    capability: "calendar",
    state: "limited",
    detail: "Web apps cannot toggle OS calendar permission directly.",
    actionLabel: "Use calendar app settings",
    actionEnabled: false,
  };

  return [notifications, backgroundRefresh, biometricsPasskey, calendar];
}
