const PREFERENCES_CACHE = "notification-preferences-v1";
const PREFERENCES_URL = "/__notification_preferences__";

const defaultPreferences = {
  enabled: true,
  eventToggles: {
    scheduled_match_new: true,
    availability_poll_reminder: true,
    admin_announcement: true,
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
  },
};

async function getPreferences() {
  const cache = await caches.open(PREFERENCES_CACHE);
  const response = await cache.match(PREFERENCES_URL);
  if (!response) return defaultPreferences;
  try {
    const parsed = await response.json();
    return {
      ...defaultPreferences,
      ...parsed,
      eventToggles: { ...defaultPreferences.eventToggles, ...(parsed.eventToggles || {}) },
      quietHours: { ...defaultPreferences.quietHours, ...(parsed.quietHours || {}) },
    };
  } catch {
    return defaultPreferences;
  }
}

async function setPreferences(preferences) {
  const cache = await caches.open(PREFERENCES_CACHE);
  const payload = new Response(JSON.stringify(preferences), {
    headers: { "content-type": "application/json" },
  });
  await cache.put(PREFERENCES_URL, payload);
}

function isQuietHoursActive(preferences, now) {
  if (!preferences.quietHours?.enabled) return false;
  const startHour = Number(preferences.quietHours.startHour ?? 22);
  const endHour = Number(preferences.quietHours.endHour ?? 7);
  const hour = now.getHours();
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

function canDeliver(eventType, preferences) {
  if (!preferences.enabled) return false;
  if (preferences.eventToggles && preferences.eventToggles[eventType] === false) return false;
  return !isQuietHoursActive(preferences, new Date());
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOTIFICATION_PREFERENCES" && event.data.preferences) {
    event.waitUntil(setPreferences(event.data.preferences));
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const preferences = await getPreferences();

    let payload = {
      eventType: "admin_announcement",
      title: "Padel App",
      body: "Du har en ny uppdatering.",
      route: "/",
    };

    if (event.data) {
      try {
        payload = { ...payload, ...event.data.json() };
      } catch {
        // non-json payload fallback
      }
    }

    if (!canDeliver(payload.eventType, preferences)) return;

    await self.registration.showNotification(payload.title, {
      body: payload.body,
      data: {
        route: payload.route || "/",
      },
      tag: `event-${payload.eventType}`,
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = event.notification.data?.route || "/";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const first = clients[0];
    if (first) {
      first.focus();
      first.postMessage({ type: "OPEN_ROUTE", route });
      return;
    }
    await self.clients.openWindow(route);
  })());
});
