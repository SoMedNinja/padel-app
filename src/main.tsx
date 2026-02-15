import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { darkTheme, lightTheme } from "./theme";
import RootApp from "./RootApp";
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

function AppShell() {
  // Note for non-coders: this listens to your device/browser setting and picks light or dark theme automatically.
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)", { noSsr: true });
  const activeTheme = prefersDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <RootApp />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
