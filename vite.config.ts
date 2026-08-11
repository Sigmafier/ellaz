import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { pagesPlugin } from "./src/build/pages";
import { DEFAULT_THEME, needsThemeBoot, themeBootScript, themeById } from "./src/ui/themes";
// Safe to import HERE for the same reason `themes.ts` is: `locales.ts` is a
// leaf that imports nothing. Never reach for a game module at config time -
// a stray `import("./src/games/snake")` would load Phaser inside this file.
import { CANONICAL_LOCALE, PAGE_LOCALES } from "./src/i18n/locales";

// The default theme, read from the one file that declares it. `themes.ts`
// imports nothing precisely so it can be imported HERE - Vite's resolve.alias
// does not apply to this config's own imports, so an `@ui/...` path would fail.
const defaultTheme = themeById(DEFAULT_THEME);

/**
 * Inline the no-flash theme script into every document, first thing in <head>.
 *
 * It has to be inline and synchronous: `data-theme` is deliberately never
 * baked into the emitted HTML (it would be wrong for half of visitors, and
 * these pages are cached), so something has to set it before the first paint.
 * A module import runs far too late and the page flashes the other theme.
 *
 * Generated from `themes.ts` rather than written out here, so adding a theme
 * cannot leave this script behind - `theme-sync.test.ts` drives the generated
 * source against junk, an empty store and a throwing localStorage, because a
 * script that throws at the top of <head> takes the whole app with it.
 *
 * This is the APP SHELL's copy. The 48 emitted pages carry their own, inlined
 * by `renderDocument`, because they are written to disk and never transformed -
 * so `needsThemeBoot` skips the ones that already have it. That matters only in
 * dev, where emitted pages DO pass through this hook; production never sees
 * them here at all.
 */
function themeBootPlugin() {
  return {
    name: "ellaz-theme-boot",
    transformIndexHtml: {
      order: "pre" as const,
      handler(html: string) {
        if (!needsThemeBoot(html)) return html;
        return {
          html,
          tags: [
            {
              tag: "script",
              children: themeBootScript(),
              injectTo: "head-prepend" as const,
            },
          ],
        };
      },
    },
  };
}

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
    // First, so its head-prepend lands above everything else in <head>.
    themeBootPlugin(),
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
        // Derived, never typed twice. This colour used to be the literal
        // #6c5ce7 in three files that could each drift; theme-sync.test.ts
        // now asserts the manifest, index.html's meta and the bare `:root`
        // block all name the same default.
        theme_color: defaultTheme.browserChrome,
        background_color: defaultTheme.background,
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
        // THE MOST DANGEROUS LINE IN THIS FILE, and it is a deletion.
        //
        // vite-plugin-pwa defaults `navigateFallback` to "index.html", which
        // registers a workbox NavigationRoute with no denylist. Every navigation
        // then resolves to the app shell — so a RETURNING visitor (one with the
        // service worker installed) asking for /games/snake/ receives the home
        // page instead, while fresh browsers, incognito windows and every
        // crawler receive the real document. A human-only, cache-only failure
        // that no static check and no crawler test can see.
        //
        // Undefined kills the route outright: it cannot serve the wrong document
        // because it serves none. Offline navigation is picked up by the
        // NetworkFirst rule below instead, which caches each page as it is
        // visited. `npm run assert:pages` asserts `sw.js` contains zero
        // NavigationRoute so nothing can quietly put it back.
        navigateFallback: undefined,
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
        // `vendor-analytics-*.js` is PostHog, deferred past first paint. Without
        // this entry the glob above precaches it anyway and the whole lazy-load
        // buys nothing — green build, unmoved payload. `npm run build:check`
        // enforces it; see .claude/rules/precache-glob-sweeps-new-chunks.md.
        // `cloud-*.js` is the backup client, dynamically imported after first
        // paint (see sdk/cloudSync.ts) and only ever fetched by a player who
        // has something to back up.
        // The four directory entries are the emitted content pages. They are
        // real documents of ~30 KB each and there are 46 of them; precaching
        // them would put roughly a megabyte of prose in front of a child who
        // has not chosen a game yet. They are served from the network and
        // cached as they are visited (the navigate rule below).
        globIgnores: [
          "**/game-*.js",
          "**/vendor-phaser-*.js",
          "**/vendor-analytics-*.js",
          "**/cloud-*.js",
          "**/page-*.js",
          // A dictionary is a whole language of chrome. Precaching eleven of
          // them puts ten languages nobody asked for on a child's first visit,
          // which is the entire reason they are separate chunks at all.
          "**/locale-*.js",
          "games/**",
          "world/**",
          "boards/**",
          "404.html",
          // DERIVED, and it used to be the literal string "en/**".
          //
          // That literal was correct and about to become a live defect: the day
          // Spanish pages ship, `es/**` is a directory of 25 real documents that
          // NOTHING excludes, so all of them land in the precache and a child in
          // Tel Aviv downloads the Spanish site before choosing a game. Nothing
          // would have failed - the build stays green and the payload gate reads
          // index.html, not the manifest. Same class as the chunk-prefix trap in
          // .claude/rules/precache-glob-sweeps-new-chunks.md, on a new axis.
          //
          // The canonical locale has no directory of its own; its pages are at
          // the root and are covered by the entries above.
          ...PAGE_LOCALES.filter((l) => l !== CANONICAL_LOCALE).map((l) => `${l}/**`),
        ],
        runtimeCaching: [
          {
            // Navigations. This replaces what `navigateFallback` used to do, and
            // it replaces it with something that cannot serve the wrong page:
            // the network decides what a URL means, and the cache only answers
            // when the network cannot.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "ellaz-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
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
    // Registered LAST so its `transformIndexHtml` runs after VitePWA has
    // injected the manifest link and the registerSW script.
    pagesPlugin(base),
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
            // PostHog is dynamically imported after first paint (see
            // sdk/analytics.ts). NAMING it is half of what makes that work: an
            // unnamed chunk is emitted as `module-<hash>.js`, which no
            // globIgnores entry can match, so it lands straight back in the
            // precache and the deferral buys nothing. Measured — that unnamed
            // chunk was 222 KiB and the manifest grew to 437 KiB.
            if (/\/node_modules\/posthog-js\//.test(path)) return "vendor-analytics";
            // Everything else (canvas-confetti…) follows its importer.
            return undefined;
          }

          // `meta.ts` is imported STATICALLY by the portal catalog so the home grid
          // can render without any game code. It must never land in a lazy game
          // chunk — that would make the shell pull all 32 games in on first paint.
          if (/\/src\/games\/[^/]+\/meta\.tsx?$/.test(path)) return "shell";

          // One dictionary per language, so a visitor fetches the one language
          // they picked instead of all eleven. NAMING it is half of what makes
          // the deferral real: an unnamed chunk is emitted as `module-<hash>.js`,
          // which no globIgnores entry can match, so it lands straight back in
          // the precache and the whole split buys nothing.
          //
          // `he` and `en` are deliberately NOT here - they fall through to the
          // shell rule below, which is where they have always been.
          const dict = /\/src\/i18n\/dict\/([a-z]{2})\.ts$/.exec(path);
          if (dict && dict[1] !== "he" && dict[1] !== "en") return `locale-${dict[1]}`;

          // One chunk per game directory, so 32 games are 32 independently
          // cacheable files instead of one wall of `index-<hash>.js`.
          const game = /\/src\/games\/([^/]+)\//.exec(path);
          if (game) return `game-${game[1]}`;

          // The cloud backup client, same arrangement and same reason. It must
          // be carved out BEFORE the shared-code rule below, which would
          // otherwise pin it to the shell because it lives under src/sdk/ —
          // and then the dynamic import in cloudSync.ts would buy nothing.
          // `cloudSync.ts` itself is NOT here: it is the thin always-loaded
          // half that holds the import.
          if (/\/src\/sdk\/(cloud|cloudConfig|backupCode)\.ts$/.test(path)) return "cloud";

          // The content-page runtime: the game host and the whole room. Only a
          // game page or /world/ ever needs either, so `/` must not download
          // them. Same arrangement and same reason as `cloud` above, and it must
          // be carved out BEFORE the shared-code rule below.
          //
          // `world/items.ts`, `Scene.tsx` and `art.tsx` are deliberately NOT
          // here: Home renders the child's real room in its world card, so they
          // belong to the shell either way.
          //
          // `Boards.tsx` is here for exactly the same reason and it is the one
          // that would have gone wrong quietly: it lives in `src/portal/`, so
          // the explicit shell rule below would have claimed it and shipped the
          // whole leaderboard screen to every child on first paint. Only
          // `/boards/` ever renders it.
          if (/\/src\/portal\/(PageApp|GameHost|Boards)\.tsx$/.test(path)) return "page";
          if (/\/src\/portal\/world\/(World|Backup)\.tsx$/.test(path)) return "page";

          // EVERY OTHER portal module goes to the shell side, explicitly.
          //
          // Not tidiness - the same "an unassigned shared module picks a side"
          // trap as the rule below, and it fired the first time this chunk
          // existed. `WalletChip`, `catalog` and `world/Scene` are imported by
          // BOTH the home grid and the page runtime; left unassigned, Rollup
          // folded them into `page-*` and made the ENTRY import from it, so Vite
          // wrote a `<link rel="modulepreload">` for the whole content-page
          // runtime into index.html. The lazy import was still there, still
          // correct, and buying nothing. `assert-first-visit.mjs` caught it.
          if (path.includes("/src/portal/")) return "shell";

          // The game chrome. It lives under `src/ui/`, so the catch-all below
          // would claim it for the shell - and it is used by all 21 games and
          // by NOTHING on the home screen, so every child would download the
          // game header before choosing a game. Same trap as `Boards.tsx`
          // above, one directory over. The game chunks that import it are only
          // ever loaded on a page that has already fetched `page-*`, so this
          // costs no extra request.
          //
          // `icons.tsx` USED TO BE PINNED HERE BESIDE IT, on the premise that
          // nothing on the home screen drew an icon. That premise died the day
          // the wallet chip stopped drawing its coin and star as emoji: Home,
          // WalletChip and winMoment all read the icon set now, so leaving it
          // on `page` made the SHELL import from the page chunk and Vite wrote
          // a modulepreload for the whole content-page runtime into index.html.
          // `assert-first-visit.mjs` failed the build by name - the third time
          // it has caught exactly this, and the reason the premise is written
          // down rather than assumed.
          if (/\/src\/ui\/GameChrome\.tsx$/.test(path)) return "page";

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
  server: {
    port: 5180,
    host: true,
    // This repo lives on /mnt/c (a Windows drive). Under WSL2 the kernel emits
    // NO inotify events for Windows-mounted filesystems, so Vite's watcher never
    // learns a file changed: it keeps serving the transform it compiled at boot
    // and HMR silently does nothing. The failure is nasty because the server
    // looks healthy - every request is a cheerful 200 - and edits appear to have
    // had no effect, which reads as "my change didn't work" rather than "the
    // server never saw it". Polling is the standard workaround; node_modules is
    // already outside the watch set, so this walks src/ and little else.
    watch: { usePolling: true, interval: 300 },
  },
  preview: { port: 5180, host: true },
});
