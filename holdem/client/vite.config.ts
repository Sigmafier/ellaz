import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Dev talks to `wrangler dev` on :8787 through the vite proxy so the browser
// sees one origin. In production the client calls the workers.dev URL
// directly (VITE_SERVER_URL), so no proxy and no Pages Functions are needed.
//
// PWA: minimal on purpose. One small SPA, so precache-everything is correct
// and navigateFallback is CORRECT here (no emitted pages to hijack — the
// ellaz trap does not transfer). The SW exists to make launch instant and
// home-screen installs feel native; gameplay always needs the network.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Hold'em — פוקר עם חברים",
        short_name: "Hold'em",
        description: "Texas Hold'em with your friends. Play money only.",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0d1512",
        theme_color: "#0d2118",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 5173,
    // Dev-only: lets a tunnel hostname (e.g. *.trycloudflare.com) reach the
    // dev server for live demos. Irrelevant to production builds.
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
});
