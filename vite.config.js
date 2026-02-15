import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
// Note for non-coders:
// These aliases tell the build where Workbox code lives locally, so the service worker can bundle it instead of downloading from a CDN.
const workboxModule = (name) => path.resolve(rootDir, `node_modules/.pnpm/${name}@7.4.0/node_modules/${name}`);

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**"],
  },
  base: "./",
  resolve: {
    alias: {
      "workbox-cacheable-response": workboxModule("workbox-cacheable-response"),
      "workbox-expiration": workboxModule("workbox-expiration"),
      "workbox-precaching": workboxModule("workbox-precaching"),
      "workbox-routing": workboxModule("workbox-routing"),
      "workbox-strategies": workboxModule("workbox-strategies"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // Note for non-coders:
      // injectManifest lets us keep one canonical service worker file where offline caching + push logic live together.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      // includeAssets keeps these files copied as-is so install icons stay available.
      // PWA_ASSETS:INCLUDE_ASSETS_START
      // Note for non-coders: this list is generated from design/pwa-assets.json so every install-related file stays in one source-of-truth.
      includeAssets: [
        "favicon.png",
        "icon-192.png",
        "icon-512.png",
        "icon-192-maskable.png",
        "icon-512-maskable.png",
        "apple-touch-icon.png",
        "apple-launch-1290x2796.png",
        "apple-launch-1179x2556.png",
        "apple-launch-1284x2778.png",
        "apple-launch-1170x2532.png",
        "apple-launch-1125x2436.png",
        "apple-launch-1242x2688.png",
        "apple-launch-828x1792.png",
        "apple-launch-750x1334.png",
      ],
      // PWA_ASSETS:INCLUDE_ASSETS_END
      manifest: {
        // This web app manifest is what phones/browsers read when users install the app.
        id: "/",
        scope: "/",
        name: "Padel Native",
        short_name: "Padel Native",
        description: "Den officiella appen för Padel Native – hantera matcher, statistik och turneringar.",
        categories: ["sports", "social"],
        theme_color: "#d32f2f",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        // PWA_ASSETS:MANIFEST_ICONS_START
        // Note for non-coders: these install icon entries are generated from design/pwa-assets.json so Android/Desktop install data stays in sync.
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable any",
          },
        ],
        // PWA_ASSETS:MANIFEST_ICONS_END
        shortcuts: [
          {
            name: "Dashboard",
            url: "/dashboard",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Ny match",
            url: "/single-game",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Spelschema",
            url: "/schedule",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Historik",
            url: "/history",
            icons: [{ src: "icon-192.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ],
});
