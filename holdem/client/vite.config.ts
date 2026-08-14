import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// No service worker, deliberately.
//
// ellaz ships one and it earns its keep there — an offline-first catalogue of
// single-player games. A poker table is the opposite: it is worthless without
// the socket, so caching the shell buys nothing, and a stale cached bundle
// against a server that has moved to protocol v3 is a broken table with no
// symptom the player can act on. ellaz has a whole rule about the QA cost of
// that (.claude/rules/pwa-stale-bundle-qa.md). Not worth importing here.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared/src", import.meta.url)),
    },
  },
  server: {
    port: 5175, // 5173 is OGAS, 5174 is the monorepo — see the port registry
    fs: {
      // shared/ lives above this root and is imported directly rather than
      // built, so dev has to be allowed to read it.
      allow: [fileURLToPath(new URL("..", import.meta.url))],
    },
  },
  build: {
    target: "es2022",
    // A poker client is one screen behind a socket; splitting it buys nothing
    // and costs a round trip on a phone at a kitchen table.
    chunkSizeWarningLimit: 700,
  },
});
