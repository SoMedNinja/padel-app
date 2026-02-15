import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationEventPayload,
  NotificationEventType,
  NotificationPreferences,
} from "../types/notifications";

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
