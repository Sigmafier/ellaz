import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// Ellaz portal build config.
// - Phaser is isolated into its own stable vendor chunk so it is downloaded once
//   and cached across every Phaser-based game (see plan §5 / Appendix A2).
// - PWA precaches the SHELL only; game chunks are runtime-cached on first play.
// - `base` is "/" for root hosts (Firebase, local) and "/ellaz/" for GitHub Pages
//   (a project site is served under /<repo>/). Set via BASE_PATH in CI.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: a new deploy activates on the user's next load and reloads the
      // page, so returning players always get new games/fixes. (Prompt mode left
      // users stuck on a stale cache with no visible update path.)
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg"],
      manifest: {
        name: "Ellaz Games",
        short_name: "Ellaz",
        description: "Fun games for phone, tablet, and computer.",
        theme_color: "#6c5ce7",
        background_color: "#0f1226",
        display: "standalone",
        orientation: "any",
        // relative so it resolves correctly under any base ("/" or "/ellaz/")
        start_url: ".",
        scope: base,
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the SHELL only: index.html, css, the React vendor chunk, icons,
        // fonts. Per-game chunks and the (large) Phaser vendor chunk are excluded
        // here and picked up lazily by the CacheFirst route below, the first time a
        // player actually opens a game that needs them.
        //
        // The globIgnores are load-bearing: without them `globPatterns` sweeps every
        // emitted chunk into the precache manifest, so a first visit downloads all
        // 32 games plus Phaser before the home grid is usable. They only work
        // because `manualChunks` below gives game chunks a `game-` name prefix —
        // a runtime rule matching `game-` against Rollup's default `index-<hash>`
        // names is dead code that silently never fires.
        globPatterns: ["**/*.{html,css,js,svg,woff2}"],
        globIgnores: ["**/game-*.js", "**/vendor-phaser-*.js"],
        runtimeCaching: [
          {
            // maxEntries covers 32 games + the Phaser vendor chunk, with headroom
            // for stale hashed copies left behind across a few deploys.
            urlPattern: ({ url }) =>
              url.pathname.includes("/assets/game-") ||
              url.pathname.includes("/assets/vendor-phaser-"),
            handler: "CacheFirst",
            options: {
              cacheName: "ellaz-games",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@sdk": fileURLToPath(new URL("./src/sdk", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
      "@juice": fileURLToPath(new URL("./src/juice", import.meta.url)),
      "@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Explicit so game chunks land as `assets/game-<id>-<hash>.js`. The PWA
        // precache exclusions and the CacheFirst route both key off that `game-`
        // prefix, so the name is a contract, not cosmetics.
        chunkFileNames: "assets/[name]-[hash].js",
        manualChunks(id) {
          const path = id.replace(/\\/g, "/");

          if (path.includes("/node_modules/")) {
            if (/\/node_modules\/phaser\//.test(path)) return "vendor-phaser";
            // scheduler is react-dom's own dep — keep it in the same chunk so the
            // React vendor bundle stays self-contained.
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path))
              return "vendor-react";
            // Everything else (posthog, canvas-confetti…) follows its importer.
            return undefined;
          }

          // `meta.ts` is imported STATICALLY by the portal catalog so the home grid
          // can render without any game code. It must never land in a lazy game
          // chunk — that would make the shell pull all 32 games in on first paint.
          if (/\/src\/games\/[^/]+\/meta\.tsx?$/.test(path)) return "shell";

          // One chunk per game directory, so 32 games are 32 independently
          // cacheable files instead of one wall of `index-<hash>.js`.
          const game = /\/src\/games\/([^/]+)\//.exec(path);
          if (game) return `game-${game[1]}`;

          // Shared app code, imported by BOTH the shell and the games. Pin it to
          // the shell side explicitly: left unassigned, Rollup folds it into
          // whichever game chunk claims it first (measured — it chose game-memory,
          // dragging posthog and the whole SDK in with it, and then the shell had
          // to statically import that game chunk, plus every sibling that shared
          // it). An unassigned shared module is not neutral; it picks a side.
          if (/\/src\/(sdk|ui|juice|i18n|shared)\//.test(path)) return "shell";
          if (/\/src\/games\/reactHost\./.test(path)) return "shell";

          // src/portal/** and src/main.tsx stay in the entry chunk.
          return undefined;
        },
      },
    },
  },
  server: { port: 5180, host: true },
  preview: { port: 5180, host: true },
});
