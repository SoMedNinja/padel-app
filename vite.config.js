import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**"],
  },
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // includeAssets keeps these files copied as-is so install icons stay available.
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        // This web app manifest is what phones/browsers read when users install the app.
        name: "Padel Tracker",
        short_name: "Padel",
        theme_color: "#b91c1c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
