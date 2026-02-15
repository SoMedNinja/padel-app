import React from "react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import AppUpdateBanner from "./Components/Shared/AppUpdateBanner";
import {
  loadNotificationPreferencesWithSync,
  registerPushServiceWorker,
  setupPwaUpdateUX,
} from "./services/webNotificationService";
import { matchService } from "./services/matchService";

function normalizeOpenRouteMessage(routeCandidate: unknown): string | null {
  // Note for non-coders: this keeps notification route handoffs inside this app and avoids malformed links.
  if (typeof routeCandidate !== "string") return null;
  const trimmedRoute = routeCandidate.trim();
  if (!trimmedRoute) return null;

  try {
    const parsedRoute = new URL(trimmedRoute, window.location.origin);
    if (parsedRoute.origin !== window.location.origin) return null;
    return `${parsedRoute.pathname}${parsedRoute.search}${parsedRoute.hash}`;
  } catch {
    return null;
  }
}

export default function RootApp() {
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const updateServiceWorkerRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Note for non-coders: this starts the offline queue listener so match submissions can retry automatically.
    matchService.initMutationQueue();

    // Note for non-coders: this wires service-worker updates into an in-app banner instead of a browser pop-up.
    updateServiceWorkerRef.current = setupPwaUpdateUX(() => {
      setIsUpdateAvailable(true);
    });

    void (async () => {
      const initialPreferences = await loadNotificationPreferencesWithSync();
      await registerPushServiceWorker(initialPreferences);
    })();

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_ROUTE") {
        const routeToOpen = normalizeOpenRouteMessage(event.data.route);
        if (routeToOpen) {
          window.location.assign(routeToOpen);
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  return (
    <>
      <AppUpdateBanner
        open={isUpdateAvailable}
        onLater={() => setIsUpdateAvailable(false)}
        onUpdateNow={() => {
          setIsUpdateAvailable(false);
          updateServiceWorkerRef.current();
        }}
      />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </>
  );
}
