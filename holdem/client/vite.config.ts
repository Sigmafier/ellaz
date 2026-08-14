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
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Hold'em — poker with friends",
        short_name: "Hold'em",
        description: "Texas Hold'em with your friends. Play money only.",
        display: "standalone",
        // "any", not "portrait". The table lays itself out two ways and the
        // wide one is the operator's own preference — a manifest pinned to
        // portrait would let an INSTALLED app refuse to rotate into the layout
        // the browser tab happily uses, which is a difference nothing in this
        // repo would ever surface.
        orientation: "any",
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
    // NOT 5173 — that port belongs to OGAS's legacy Sigma app on this machine,
    // and two apps sharing a localhost origin share localStorage with it. Kept
    // in step with ALLOWED_ORIGINS in server/wrangler.toml.
    port: 5175,
    // Dev-only: lets a tunnel hostname (e.g. *.trycloudflare.com) reach the
    // dev server for live demos. Irrelevant to production builds.
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
});
