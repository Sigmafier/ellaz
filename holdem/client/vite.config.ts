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
      // The sound lab is a tuning tool. Precaching everything is right for the
      // game itself, and wrong for a screen most players will never open — and
      // the precache glob sweeps `**/*.js`, so the ONLY thing keeping it off a
      // first load is this line. It pairs with the `lab` branch in
      // manualChunks below: rename one without the other and the whole lab
      // ships to every player behind a perfectly green build.
      workbox: { globIgnores: ["**/lab-*.js"] },
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
  build: {
    // A `<link rel="modulepreload">` is a DOWNLOAD, not a hint, and Vite
    // writes one into index.html for a lazily-imported chunk. So the two
    // things above — the lazy import and the precache exclusion — are not
    // enough on their own: measured before this line, every player fetched
    // the whole lab (10.8 KB gz) on first paint while the precache manifest
    // correctly did not list it. Both facts were true at once, which is why
    // reading the config proves nothing here and `grep lab- dist/index.html`
    // proves everything.
    modulePreload: {
      resolveDependencies: (_from, deps) => deps.filter((d) => !d.includes("lab-")),
    },
    rollupOptions: {
      output: {
        // The lab chunk is NAMED here rather than declared as a manualChunk,
        // and that distinction is the whole fix.
        //
        // `globIgnores` above needs a stable name to match on, so the chunk
        // cannot be left as `index-<hash>.js`. The obvious way to get one is
        // `manualChunks: id => id.includes("/src/lab/") && "lab"` — and A
        // MANUAL CHUNK IS A MAGNET. Measured, twice:
        //
        //   with only a `lab` branch  →  React landed INSIDE the lab chunk and
        //     the shell opened with `import{r as L,...}from"./lab-*.js"` at
        //     byte 229 — a STATIC import, so the lab was mandatory to run the
        //     app and excluded from the precache at the same time.
        //   adding a `vendor` branch  →  React moved out, and four functions
        //     from src/audio/audio.ts took its place. Same bug, smaller.
        //
        // The tell both times was a precache that got SMALLER after a whole
        // screen was added. An unassigned shared module is not neutral: it
        // picks a side, and it picks the manual chunk.
        //
        // Rollup already isolates a dynamic import into its own chunk without
        // being asked. Naming it by its entry module leaves that natural
        // splitting alone — shared modules stay where the dependency graph
        // puts them, which is the shell.
        //
        // Matched on the DIRECTORY, not on a file name. The first version of
        // this named `/src/look/LookLab`, and renaming that component to
        // Studio.tsx silently dropped the `lab-` prefix — so the chunk went
        // straight into the precache and every player downloaded the tuning
        // screen. Nothing in the rename touched this file; a green build is
        // what a file-name match buys you the day somebody renames a file.
        // (Caught by assert-first-visit.mjs on the next run: `expected 1
        // lab-*.js chunks and found 0`, precache up to 9 entries.)
        //
        // `src/look/lookStore.ts` and `look.css` live in the same directory
        // and are NOT affected: only emitted CHUNKS are named here, and those
        // two are statically imported by the entry, so they are part of the
        // shell — which is the point, since they are what paints a player's
        // picks on the first frame.
        chunkFileNames: (chunk) =>
          /\/src\/(lab|look)\//.test(chunk.facadeModuleId ?? "")
            ? "assets/lab-[hash].js"
            : "assets/[name]-[hash].js",
      },
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
