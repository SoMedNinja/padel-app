import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationEventPayload,
  NotificationEventType,
  NotificationPreferences,
  normalizeNotificationPreferencesForPersistence,
} from "../types/notifications";
import { sharedPermissionActionLabel, sharedPermissionGuidance } from "../shared/permissionsCopy";
import { UpdateUrgency } from "../shared/updateStates";
import { supabase } from "../supabaseClient";

const STORAGE_KEY = "settings.notificationPreferences.v1";
const SW_PATH = "/sw.js";
const NOTIFICATION_PREFERENCES_TABLE = "notification_preferences";
const PUSH_SUBSCRIPTIONS_TABLE = "push_subscriptions";
const WEB_PUSH_PLATFORM = "web";
const WEB_PUSH_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;

export interface PwaUpdateState {
  urgency: UpdateUrgency;
}

type NotificationPreferenceRow = {
  profile_id: string;
  preferences: NotificationPreferences;
};


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

function decodeBase64UrlToUint8Array(value: string): Uint8Array {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

// Note for non-coders:
// Browser permission alone is not enough — this step creates the unique push endpoint that the server can actually send to.
async function ensureWebPushSubscription(
  registration?: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (typeof window === "undefined" || !("PushManager" in window)) return null;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;

  const resolvedRegistration = registration ?? (await navigator.serviceWorker.ready);
  const existingSubscription = await resolvedRegistration.pushManager.getSubscription();
  if (existingSubscription) return existingSubscription;
  if (!WEB_PUSH_PUBLIC_KEY) return null;

  return resolvedRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64UrlToUint8Array(WEB_PUSH_PUBLIC_KEY),
  });
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

async function syncCurrentPushSubscriptionWithBackend(registration?: ServiceWorkerRegistration): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (typeof window === "undefined" || !("PushManager" in window)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;

  const activeRegistration = registration ?? (await navigator.serviceWorker.ready);
  const existingSubscription = await ensureWebPushSubscription(activeRegistration);
  if (!existingSubscription) return;

  await upsertBackendPushSubscription(userId, existingSubscription);
}

// Note for non-coders:
// The app stores your notification choices in the browser so they persist between visits.
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return normalizeNotificationPreferencesForPersistence(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  const normalized = normalizeNotificationPreferencesForPersistence(preferences);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
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
  return data?.preferences ? normalizeNotificationPreferencesForPersistence(data.preferences) : null;
}

async function saveBackendPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  const normalized = normalizeNotificationPreferencesForPersistence(preferences);
  const { error } = await supabase
    .from(NOTIFICATION_PREFERENCES_TABLE)
    .upsert(
      {
        profile_id: userId,
        preferences: normalized,
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
  const normalized = normalizeNotificationPreferencesForPersistence(preferences);
  saveNotificationPreferences(normalized);

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (userId) {
      await saveBackendPreferences(userId, normalized);
    }
  } catch {
    // Note for non-coders:
    // Backend save can fail when offline; local storage still keeps your latest choice.
  }

  // Note for non-coders:
  // Turning notifications off also revokes this browser endpoint from backend delivery lists.
  if (!normalized.enabled) {
    await unsubscribeFromPushNotifications();
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    await syncCurrentPushSubscriptionWithBackend();
  }

  await syncPreferencesToServiceWorker(normalized);
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

  const normalized = normalizeNotificationPreferencesForPersistence(preferences);

  // Note for non-coders:
  // We reuse the same service worker registration so offline app caching and push notifications stay in one place.
  let registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  registration ??= await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  await syncPreferencesToServiceWorker(normalized);
  await syncCurrentPushSubscriptionWithBackend(registration);
  return registration;
}

export function setupPwaUpdateUX(onUpdateAvailable: (state: PwaUpdateState) => void): () => void {
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
      if (waitingWorker) onUpdateAvailable({ urgency: "optional" });
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

// Note for non-coders:
// "Standalone" means the web app was opened like a real app from the home screen.
export function detectStandaloneInstallState(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isStandaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const isIosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isStandaloneMedia || isIosStandalone;
}

function detectNotificationBrowserLimitation(isInstalledPwa: boolean): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);

  if (isIos && isSafari && !isInstalledPwa) {
    return "I iOS Safari fungerar pushnotiser först när appen har lagts till på hemskärmen och öppnas som installerad app.";
  }

  return null;
}

async function getServiceWorkerDiagnostics(): Promise<{ supported: boolean; registration: ServiceWorkerRegistration | null; ready: boolean }> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return { supported: false, registration: null, ready: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const ready = Boolean(registration?.active);
    return {
      supported: true,
      registration: registration ?? null,
      ready,
    };
  } catch {
    return { supported: true, registration: null, ready: false };
  }
}

// Note for non-coders:
// This collects the browser's capability checks and translates them into the shared state labels.
export async function buildWebPermissionSnapshots(): Promise<PermissionStatusSnapshot[]> {
  const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : false;
  const isInstalledPwa = detectStandaloneInstallState();
  const notificationBrowserLimitation = detectNotificationBrowserLimitation(isInstalledPwa);
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = notificationSupported ? Notification.permission : "denied";
  const { supported: swSupported, registration: swRegistration, ready: swReady } = await getServiceWorkerDiagnostics();
  const pushSupported = swSupported && typeof window !== "undefined" && "PushManager" in window;
  let hasPushEndpoint = false;

  if (notificationPermission === "granted" && pushSupported && swReady) {
    const registration = await navigator.serviceWorker.ready;
    hasPushEndpoint = Boolean(await registration.pushManager.getSubscription());
  }

  const backgroundSyncSupported = swSupported && "SyncManager" in window;

  const notificationState: PermissionStatusSnapshot["state"] =
    !isSecureContext
      ? "limited"
      : !notificationSupported
      ? "limited"
      : notificationBrowserLimitation
        ? "limited"
      : notificationPermission === "denied"
        ? "blocked"
        : notificationPermission === "granted" && hasPushEndpoint
          ? "allowed"
          : "action_needed";

  const notificationDetail = !isSecureContext
    ? `${sharedPermissionGuidance("notifications", "limited")} Notiser kräver HTTPS (säker kontext).`
    : !notificationSupported
      ? `${sharedPermissionGuidance("notifications", "limited")} Den här webbläsaren stödjer inte Notification API.`
      : notificationBrowserLimitation
        ? `${sharedPermissionGuidance("notifications", "limited")} ${notificationBrowserLimitation}`
        : notificationPermission === "denied"
          ? `${sharedPermissionGuidance("notifications", "blocked")} Webbläsarbehörighet är nekad.`
          : notificationPermission === "granted" && hasPushEndpoint
            ? `${sharedPermissionGuidance("notifications", "allowed")} Behörighet är tillåten och push-endpoint är fullt aktiverad.${isInstalledPwa ? " Installerat appläge upptäckt." : ""}`
            : notificationPermission === "granted"
              ? `${sharedPermissionGuidance("notifications", "action_needed")} Behörighet är tillåten men push-endpoint saknas. Tryck på "Kör konfiguration igen" för att slutföra endpoint-registreringen.`
              : `${sharedPermissionGuidance("notifications", "action_needed")} Webbläsarbehörigheten är standard.`;

  const notifications: PermissionStatusSnapshot = {
    capability: "notifications",
    state: notificationState,
    detail: notificationDetail,
    actionLabel: sharedPermissionActionLabel("notifications", notificationState),
    actionEnabled:
      notificationState === "blocked" ||
      notificationState === "limited" ||
      notificationPermission !== "granted" ||
      !hasPushEndpoint,
  };

  const backgroundRefresh: PermissionStatusSnapshot = {
    capability: "background_refresh",
    state: !isSecureContext ? "limited" : !swSupported ? "limited" : swReady ? "allowed" : "action_needed",
    detail: !isSecureContext
      ? `${sharedPermissionGuidance("background_refresh", "limited")} Service workers kräver HTTPS (säker kontext).`
      : !swSupported
      ? `${sharedPermissionGuidance("background_refresh", "limited")} Service workers är inte tillgängliga i den här webbläsaren.`
      : swReady
        ? `${sharedPermissionGuidance("background_refresh", "allowed")} Service worker är aktiv${backgroundSyncSupported ? " och background sync stöds" : ", men API:et för background sync är begränsat"}.`
        : `${sharedPermissionGuidance("background_refresh", "action_needed")} ${swRegistration ? "En registrering finns men är inte aktiv ännu. Försök igen efter omladdning eller ominstallation av appen." : "Service worker är inte registrerad ännu. Försök igen och tillåt installation."}`,
    actionLabel: sharedPermissionActionLabel(
      "background_refresh",
      !isSecureContext ? "limited" : !swSupported ? "limited" : swReady ? "allowed" : "action_needed"
    ),
    actionEnabled: true,
  };

  const passkeyApiSupported = typeof window !== "undefined" && "PublicKeyCredential" in window;
  const passkeyPlatformSupported = passkeyApiSupported && typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    : false;
  const biometricsPasskey: PermissionStatusSnapshot = {
    capability: "biometric_passkey",
    state: passkeyApiSupported && passkeyPlatformSupported ? "allowed" : "limited",
    detail: passkeyApiSupported && passkeyPlatformSupported
      ? `${sharedPermissionGuidance("biometric_passkey", "allowed")} Plattformsautentiserare finns tillgänglig på enheten.`
      : passkeyApiSupported
        ? `${sharedPermissionGuidance("biometric_passkey", "limited")} WebAuthn finns, men ingen plattformsautentiserare hittades.`
        : `${sharedPermissionGuidance("biometric_passkey", "limited")} Passkey-API:er är inte tillgängliga i den här webbläsaren.`,
    actionLabel: sharedPermissionActionLabel("biometric_passkey", passkeyApiSupported && passkeyPlatformSupported ? "allowed" : "limited"),
    actionEnabled: true,
  };

  const calendar: PermissionStatusSnapshot = {
    capability: "calendar",
    state: "limited",
    detail: `${sharedPermissionGuidance("calendar", "limited")} Webbappar kan inte slå av/på operativsystemets kalenderbehörighet direkt.`,
    actionLabel: sharedPermissionActionLabel("calendar", "limited"),
    actionEnabled: false,
  };

  return [notifications, backgroundRefresh, biometricsPasskey, calendar];
}
