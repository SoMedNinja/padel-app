/* eslint-disable no-restricted-globals */
/* global workbox */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");

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

// Note for non-coders:
// Precache means "save app files ahead of time" so the app shell can start fast/offline.
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);
workbox.precaching.cleanupOutdatedCaches();

// Note for non-coders:
// Runtime caching handles files that are fetched after startup (images, API responses, pages).
workbox.routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  new workbox.strategies.NetworkFirst({
    cacheName: "pages-runtime-cache",
    networkTimeoutSeconds: 3,
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 50 })],
  })
);

workbox.routing.registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "static-assets-runtime-cache",
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 80 })],
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "images-runtime-cache",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

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

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
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
    })()
  );
});

function normalizeRoute(routeCandidate) {
  // Note for non-coders:
  // Notifications may carry broken/missing route values, so we sanitize them to a safe in-app URL.
  if (typeof routeCandidate !== "string") return "/";
  const trimmedRoute = routeCandidate.trim();
  if (!trimmedRoute) return "/";

  try {
    const parsedRoute = new URL(trimmedRoute, self.location.origin);
    if (parsedRoute.origin !== self.location.origin) return "/";
    return `${parsedRoute.pathname}${parsedRoute.search}${parsedRoute.hash}`;
  } catch {
    return "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = normalizeRoute(event.notification.data?.route);
  const targetUrl = new URL(route, self.location.origin);
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      const matchingClient = clients.find((client) => {
        try {
          const clientUrl = new URL(client.url);
          return clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        await matchingClient.focus();
        matchingClient.postMessage({ type: "OPEN_ROUTE", route });
        return;
      }

      await self.clients.openWindow(targetUrl.href);
    })()
  );
});
