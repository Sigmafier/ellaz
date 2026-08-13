import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Dev talks to `wrangler dev` on :8787 through the vite proxy so the browser
// sees one origin. In production the client calls the workers.dev URL
// directly (VITE_SERVER_URL), so no proxy and no Pages Functions are needed.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
      "/ws": { target: "ws://localhost:8787", ws: true },
    },
  },
});
