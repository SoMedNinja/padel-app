import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import App from "./App";
import {
  loadNotificationPreferencesWithSync,
  registerPushServiceWorker,
  setupPwaUpdateUX,
} from "./services/webNotificationService";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Note for non-coders: staleTime + gcTime keep cached data around so filters feel instant.
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

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

if (typeof window !== "undefined") {
  // Note for non-coders: this starts the service worker early so push alerts and offline caching both work in the background.
  const updateServiceWorker = setupPwaUpdateUX(() => {
    // Note for non-coders: this message appears when a fresh version is ready and a reload will switch to it.
    const shouldReload = window.confirm("A new version is ready. Reload now to update?");
    if (shouldReload) {
      updateServiceWorker();
    }
  });

  void (async () => {
    const initialPreferences = await loadNotificationPreferencesWithSync();
    await registerPushServiceWorker(initialPreferences);
  })();

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_ROUTE") {
      const routeToOpen = normalizeOpenRouteMessage(event.data.route);
      if (routeToOpen) {
        window.location.assign(routeToOpen);
      }
    }
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
