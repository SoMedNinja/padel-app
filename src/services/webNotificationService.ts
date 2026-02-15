import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationEventPayload,
  NotificationEventType,
  NotificationPreferences,
} from "../types/notifications";
import { supabase } from "../supabaseClient";

const STORAGE_KEY = "settings.notificationPreferences.v1";
const SW_PATH = "/sw.js";
const NOTIFICATION_PREFERENCES_TABLE = "notification_preferences";
const PUSH_SUBSCRIPTIONS_TABLE = "push_subscriptions";
const WEB_PUSH_PLATFORM = "web";

type NotificationPreferenceRow = {
  profile_id: string;
  preferences: NotificationPreferences;
};

function mergePreferences(preferences: Partial<NotificationPreferences> | null | undefined): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(preferences ?? {}),
    eventToggles: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.eventToggles,
      ...(preferences?.eventToggles ?? {}),
    },
    quietHours: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
      ...(preferences?.quietHours ?? {}),
    },
  };
}

function readRawLocalPreferences(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function hasStoredLocalPreferences(): boolean {
  return Boolean(readRawLocalPreferences());
}

function resolveWebPushDeviceToken(subscription: PushSubscription): string {
  return subscription.endpoint;
}

function serializeWebPushSubscription(subscription: PushSubscription): Record<string, unknown> {
  return subscription.toJSON() as Record<string, unknown>;
}

async function upsertBackendPushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const { error } = await supabase.from(PUSH_SUBSCRIPTIONS_TABLE).upsert(
    {
      profile_id: userId,
      platform: WEB_PUSH_PLATFORM,
      device_token: resolveWebPushDeviceToken(subscription),
      subscription: serializeWebPushSubscription(subscription),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      revoked_at: null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,platform,device_token" }
  );

  if (error) throw error;
}

async function revokeBackendPushSubscription(subscription: PushSubscription): Promise<void> {
  const { error } = await supabase.rpc("revoke_push_subscription", {
    p_platform: WEB_PUSH_PLATFORM,
    p_device_token: resolveWebPushDeviceToken(subscription),
  });

  if (error) throw error;
}

async function revokeAllWebPushSubscriptionsForCurrentUser(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from(PUSH_SUBSCRIPTIONS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq("profile_id", userId)
    .eq("platform", WEB_PUSH_PLATFORM)
    .is("revoked_at", null);

  if (error) throw error;
}

async function syncCurrentPushSubscriptionWithBackend(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (typeof window === "undefined" || !("PushManager" in window)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  if (!existingSubscription) return;

  await upsertBackendPushSubscription(userId, existingSubscription);
}

// Note for non-coders:
// The app stores your notification choices in the browser so they persist between visits.
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return mergePreferences(JSON.parse(raw) as NotificationPreferences);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

// Note for non-coders:
// When you are signed in, we keep your notification settings in the backend so web + iOS can share one source of truth.
async function fetchBackendPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from(NOTIFICATION_PREFERENCES_TABLE)
    .select("profile_id,preferences")
    .eq("profile_id", userId)
    .maybeSingle<NotificationPreferenceRow>();

  if (error) throw error;
  return data?.preferences ? mergePreferences(data.preferences) : null;
}

async function saveBackendPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  const { error } = await supabase
    .from(NOTIFICATION_PREFERENCES_TABLE)
    .upsert(
      {
        profile_id: userId,
        preferences,
      },
      { onConflict: "profile_id" }
    );

  if (error) throw error;
}

export async function loadNotificationPreferencesWithSync(): Promise<NotificationPreferences> {
  const localFallback = loadNotificationPreferences();

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) {
      await syncPreferencesToServiceWorker(localFallback);
      return localFallback;
    }

    const backendPreferences = await fetchBackendPreferences(userId);
    if (backendPreferences) {
      saveNotificationPreferences(backendPreferences);
      await syncPreferencesToServiceWorker(backendPreferences);
      return backendPreferences;
    }

    // Note for non-coders:
    // First sign-in migration: if this browser already has settings, we upload them once to the backend.
    if (hasStoredLocalPreferences()) {
      await saveBackendPreferences(userId, localFallback);
      await syncPreferencesToServiceWorker(localFallback);
      return localFallback;
    }

    await saveBackendPreferences(userId, localFallback);
    await syncPreferencesToServiceWorker(localFallback);
    return localFallback;
  } catch {
    await syncPreferencesToServiceWorker(localFallback);
    return localFallback;
  }
}

export async function saveNotificationPreferencesWithSync(preferences: NotificationPreferences): Promise<void> {
  saveNotificationPreferences(preferences);

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (userId) {
      await saveBackendPreferences(userId, preferences);
    }
  } catch {
    // Note for non-coders:
    // Backend save can fail when offline; local storage still keeps your latest choice.
  }

  // Note for non-coders:
  // Turning notifications off also revokes this browser endpoint from backend delivery lists.
  if (!preferences.enabled) {
    await unsubscribeFromPushNotifications();
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    await syncCurrentPushSubscriptionWithBackend();
  }

  await syncPreferencesToServiceWorker(preferences);
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
  if (Notification.permission === "granted") {
    await syncCurrentPushSubscriptionWithBackend();
    return "granted";
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    await syncCurrentPushSubscriptionWithBackend();
  } else if (permission === "denied") {
    await revokeAllWebPushSubscriptionsForCurrentUser();
  }

  return permission;
}

export async function registerPushServiceWorker(preferences: NotificationPreferences): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  // Note for non-coders:
  // We reuse the same service worker registration so offline app caching and push notifications stay in one place.
  let registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  registration ??= await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  await syncPreferencesToServiceWorker(preferences);
  await syncCurrentPushSubscriptionWithBackend();
  return registration;
}

export function setupPwaUpdateUX(onUpdateAvailable: () => void): () => void {
  if (!("serviceWorker" in navigator)) return () => {};

  let waitingWorker: ServiceWorker | null = null;
  let hasReloadedAfterUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloadedAfterUpdate) return;
    hasReloadedAfterUpdate = true;
    window.location.reload();
  });

  // Note for non-coders:
  // When a new worker finishes installing, we store it so the UI can trigger an explicit "reload to update" action.
  const trackRegistration = (registration: ServiceWorkerRegistration) => {
    const syncWaitingWorker = () => {
      waitingWorker = registration.waiting;
      if (waitingWorker) onUpdateAvailable();
    };

    syncWaitingWorker();

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          syncWaitingWorker();
        }
      });
    });
  };

  void navigator.serviceWorker.ready.then(trackRegistration);

  return () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };
}

export async function syncPreferencesToServiceWorker(preferences: NotificationPreferences): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({
    type: "SYNC_NOTIFICATION_PREFERENCES",
    preferences,
  });
}

// Note for non-coders:
// This unsubscribes the browser endpoint and marks it revoked in backend so future pushes stop.
export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof window === "undefined" || !("PushManager" in window)) {
    await revokeAllWebPushSubscriptionsForCurrentUser();
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  if (!existingSubscription) {
    await revokeAllWebPushSubscriptionsForCurrentUser();
    return;
  }

  await revokeBackendPushSubscription(existingSubscription);
  await existingSubscription.unsubscribe();
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
  await saveNotificationPreferencesWithSync(updated);
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
