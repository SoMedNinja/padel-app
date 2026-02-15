import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

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
// The files are bundled with the app build, so install does not need to fetch Workbox from a CDN first.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const navigationFallbackHandler = createHandlerBoundToURL("/index.html");

// Note for non-coders:
// If a page request fails (for example no network), we still return the app shell so React can show an offline-safe screen.
setCatchHandler(async ({ event }) => {
  if (event.request.destination === "document") {
    return navigationFallbackHandler({ event });
  }

  return Response.error();
});

// Note for non-coders:
// Runtime caching handles files that are fetched after startup (images, API responses, pages).
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages-runtime-cache",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

registerRoute(
  ({ request }) => ["style", "script", "worker"].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: "static-assets-runtime-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 80 })],
  })
);


function isKeyReadEndpoint(url) {
  // Note for non-coders:
  // We only cache read-heavy endpoints so dashboards/profiles/history open fast while fresh data still loads in background.
  if (!url.pathname.includes("/rest/v1/") && !url.pathname.includes("/rpc/")) return false;

  const restMatch = url.pathname.match(/\/rest\/v1\/([^/?]+)/);
  const endpoint = restMatch?.[1] || "";
  const readTables = ["profiles", "matches", "tournaments", "tournament_rounds", "tournament_results"];

  if (readTables.includes(endpoint)) return true;

  if (url.pathname.includes("/rpc/")) {
    const rpcName = url.pathname.split("/").pop() || "";
    return ["profile", "dashboard", "history"].some((keyword) => rpcName.includes(keyword));
  }

  return false;
}

registerRoute(
  ({ request, url }) => request.method === "GET" && isKeyReadEndpoint(url),
  new StaleWhileRevalidate({
    cacheName: "supabase-key-read-runtime-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 10,
      }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images-runtime-cache",
    plugins: [
      new ExpirationPlugin({
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
