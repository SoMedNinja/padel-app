import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import App from "./App";
import { loadNotificationPreferencesWithSync, registerPushServiceWorker } from "./services/webNotificationService";
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

if (typeof window !== "undefined") {
  // Note for non-coders: this starts the push service worker early so web push can arrive even when this tab is in the background.
  void (async () => {
    const initialPreferences = await loadNotificationPreferencesWithSync();
    await registerPushServiceWorker(initialPreferences);
  })();

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "OPEN_ROUTE" && typeof event.data.route === "string") {
      window.location.assign(event.data.route);
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
