import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";

// base "./" keeps the build working both on GitHub Pages (under /<repo>/) and when opened from a folder.
export default defineConfig({
  base: "./",
  plugins: [
    preact(),
    // Installable app that also works offline; a new version loads the next time it is opened.
    VitePWA({
      registerType: "autoUpdate",
      pwaAssets: { config: true },
      manifest: {
        name: "Cut List Maker",
        short_name: "Cut List",
        description: "Cutting lists for furniture pieces, ready to print and send to the cutting factory.",
        theme_color: "#0f766e",
        background_color: "#f3f5f7",
        display: "standalone",
        start_url: "./",
        scope: "./",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Fonts come from Google; keep a copy so the app looks right offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts", expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
