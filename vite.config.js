import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icon-512.png"],
      manifest: {
        name: "Padel Tracker",
        short_name: "Padel",
        theme_color: "#b91c1c",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
