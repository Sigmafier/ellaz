import { defineConfig, type PluginOption } from "vite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import { pagesPlugin } from "./src/build/pages";
import { DEFAULT_THEME, needsThemeBoot, themeBootScript, themeById } from "./src/ui/themes";
// Safe to import HERE for the same reason `themes.ts` is: `locales.ts` is a
// leaf that imports nothing. Never reach for a game module at config time -
// a stray `import("./src/games/snake")` would load Phaser inside this file.
import { CANONICAL_LOCALE, PAGE_LOCALES } from "./src/i18n/locales";

/**
 * Which games' `meta.ts` the SHELL carries - parsed out of `shellRoster.ts`,
 * never typed here.
 *
 * The fold is one decision and it lives in one file. A second list in this
 * config would be a third copy of it (after `shellRoster.ts` and
 * `gamesRest.ts`), and the way it would go wrong is silent: a game in the wrong
 * set still builds, still renders, and simply costs - or does not cost - a first
 * visit, with nothing anywhere to notice.
 *
 * Parsed rather than imported because this file is loaded by NODE at config
 * time, where no Vite alias exists yet - `shellRoster.ts` names `@sdk/index`
 * and importing it here dies on a package that does not exist. Same trap as the
 * one at the top of `src/build/langOffer.ts`.
 */
const SHELL_META_DIRS = new Set(
  [
    ...readFileSync(new URL("./src/portal/shellRoster.ts", import.meta.url), "utf8").matchAll(
      /import \{ meta as \w+ \} from "\.\.\/games\/([\w-]+)\/meta";/g,
    ),
  ].map((m) => m[1]),
);
// A matcher that quietly stops matching would send EVERY meta to the lazy half,
// which builds and ships a home grid with no cards in it. Empty is not a valid
// answer to "which games are above the fold".
if (SHELL_META_DIRS.size === 0) {
  throw new Error("vite.config: parsed 0 shell metas out of shellRoster.ts - refusing to build");
}

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

/* --- the runtime page cache, and the one thing that empties it --------------

   `ellaz-pages` below is a NetworkFirst cache of whole DOCUMENTS with a 30-day
   life, and until this existed nothing ever cleared it. Workbox's
   `cleanupOutdatedCaches` cleans the PRECACHE and only the precache, so a
   returning visitor whose network took longer than the 3-second timeout was
   served a page from whatever build happened to be cached - possibly a month
   old - while the server served today's.

   That is this repo's recurring shape, one layer further in: correct for every
   population we can check (curl, a fresh browser, a crawler, the deploy gate)
   and wrong for the one that matters, returning players. It cost a live G1
   deploy that was reported as missing while every check was green.

   The fix runs in the SERVICE WORKER rather than in the page, and that choice
   is the whole point: a client stuck on a stale document is running the stale
   BUNDLE too, so page-side code would be the one copy that never gets to run.
   sw.js is always revalidated (`no-cache` in the .htaccess, and browsers bypass
   the HTTP cache for it anyway), so a new build always reaches `activate` even
   on a client that is otherwise a month behind.

   The cost, stated rather than discovered: a game page visited before the
   deploy is no longer available offline until it is visited online once more.
   The shell at `/` is precached and unaffected. A page from a build that no
   longer exists is worth strictly less than that. */

const SW_PURGE_SOURCE = `// Emitted by vite.config.ts - see the note beside SW_PURGE_SOURCE there.
// Imported by sw.js, so it runs in the service worker and not in any page.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("ellaz-pages"));
});
`;

/* CONTENT-HASHED, and that is a fix rather than tidiness.
   The first version shipped as a bare `sw-purge.js` at the root, relying on a
   FilesMatch in the .htaccess to hold it out of the year-long immutable rule
   that every other .js gets. Measured on the live server: sw.js, 404.html and
   manifest.webmanifest all took the no-cache rule from that same block and
   sw-purge.js did not, so the file a service worker imports through the
   ORDINARY HTTP CACHE (updateViaCache defaults to "imports") was pinned for a
   year - a file that could never be fixed, which is the exact trap this repo
   keeps writing rules about.

   A hash in the name removes the dependency on the header instead of arguing
   with it: immutable becomes CORRECT, because a changed file is a new file.
   Same reason everything under assets/ is hashed, and the same property the
   deploy relies on - the thing deciding what to send cannot be wrong about
   what is already there. It lives in assets/ so the upload's mirror pass,
   which is exact only there, is what carries it. */
const SW_PURGE_FILE = `assets/sw-purge-${createHash("sha256")
  .update(SW_PURGE_SOURCE)
  .digest("hex")
  .slice(0, 8)}.js`;

/** Writes the script above into the build so `importScripts` has something to
 *  import. It is emitted here rather than dropped in `public/` for one reason:
 *  `public/` is copied by the STANDALONE build too, and a file carrying
 *  `self.addEventListener` plus `caches.delete` is exactly what
 *  `assert-standalone.mjs` refuses - a service-worker trace inside a bundle
 *  uploaded to somebody else's origin. The standalone config does not use this
 *  plugin, so the file cannot reach it. */
function swPurgePlugin(): PluginOption {
  return {
    name: "ellaz-sw-purge",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: SW_PURGE_FILE, source: SW_PURGE_SOURCE });
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    // First, so its head-prepend lands above everything else in <head>.
    themeBootPlugin(),
    react(),
    swPurgePlugin(),
    VitePWA({
      // "prompt" here means "WE decide when", not "ask the user" - there is no
      // dialog and nothing to tap. It is the only mode that hands the timing
      // over: `autoUpdate` installs an ungated `window.location.reload()` on
      // the worker's `activated` event, and vite-plugin-pwa exposes no option
      // to suppress it, so the mode is the knob. That reload is what pulled a
      // child out of a game a minute in, on the first visit after any deploy.
      //
      // This is NOT the old bare prompt mode that stranded returning players on
      // a stale cache (.claude/rules/pwa-stale-bundle-qa.md) - that one needed
      // an update UI nobody built. `src/portal/swUpdate.ts` applies the update
      // automatically and silently, the first moment no game is mounted.
      registerType: "prompt",
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
        // Relative, so it resolves against sw.js's own URL and is therefore
        // right under both bases - `/assets/sw-purge-<hash>.js` on Hostinger and
        // `/ellaz/assets/...` on Pages - with no BASE_PATH branch to get wrong.
        importScripts: [SW_PURGE_FILE],
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
          // The purge script above. It is IMPORTED by sw.js, which stores it with
          // the registration, so precaching it as well would ship a second copy to
          // every first visit for nothing - and `assert-first-visit.mjs` is an
          // ALLOWLIST, so it reds rather than letting that pass quietly.
          "**/sw-purge-*.js",
          "**/game-*.js",
          "**/vendor-phaser-*.js",
          "**/vendor-analytics-*.js",
          "**/cloud-*.js",
          "**/page-*.js",
          // The room's SECOND SHELF - 52 more shop items, their drawings and
          // their catalogue rows, in one chunk. `art.tsx` and `items.ts` ship
          // in the SHELL (Home draws the child's real room in its world card),
          // and the first visit had 718 B gz of headroom the day they landed:
          // the drawings measured 6.8 KB gz and the ROWS ALONE 2.4 KB. Home
          // fetches them on browser idle, the World screen pulls them beside
          // its own chunk. Without this entry the glob above precaches them
          // anyway, every child downloads a picture of every shop item before
          // choosing a game, and the build is green - which is the entire
          // reason this list exists.
          "**/world-art-*.js",
          // The sound lab at `#/lab`. Reachable in production on purpose - it
          // is opened from a phone - but no child who never types that fragment
          // should carry it. Precaching it would be the whole point of the lazy
          // import, undone silently and with a green build.
          "**/lab-*.js",
          // The card art for every game BELOW the fold. The home grid draws the
          // emoji until it lands, and it lands on browser idle. Without this
          // entry the glob above precaches it anyway, the first visit is exactly
          // as heavy as before, and the build is green - which is the entire
          // reason this list exists.
          // The roster metadata below the fold, fetched on idle beside the art.
          // Precaching it charges a first visit for the very records the split
          // exists to keep off it - green build, unmoved payload, which is the
          // failure `precache-glob-sweeps-new-chunks.md` is named after.
          "**/meta-rest-*.js",
          "**/art-rest-*.js",
          // The share sheet, its card and the rasteriser. Opened from a button
          // that only appears once a child has played something TODAY, so most
          // first visits never touch it. Without this entry the glob above
          // precaches it anyway and the lazy import buys nothing - green build,
          // unmoved payload, which is the whole failure this list exists for.
          "**/share-*.js",
          // A dictionary is a whole language of chrome. Precaching eleven of
          // them puts ten languages nobody asked for on a child's first visit,
          // which is the entire reason they are separate chunks at all.
          "**/locale-*.js",
          // The per-game art, one SVG per game, referenced only from the emitted
          // content pages. `globPatterns` above sweeps `**/*.svg`, so WITHOUT
          // this line 33 files land in the precache and every child downloads a
          // picture of every game before choosing one - green build, unmoved
          // gate, exactly the failure precache-glob-sweeps-new-chunks.md names.
          // The `.svg` in that pattern is why this is the first emitted asset
          // in a long while that needed the entry at all.
          "art/**",
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
          // ...but only for the games ABOVE THE FOLD. The rest belong beside their
          // own roster half, or the split buys nothing: this rule fires FIRST, so
          // pinning every meta here would hold all 33 in the shell however the
          // roster files are chunked. Which half a game is in is read out of
          // `shellRoster.ts` at config time, so there is still exactly ONE list -
          // a second one typed here is a third copy of the fold.
          if (/\/src\/games\/[^/]+\/meta\.tsx?$/.test(path)) {
            const dir = /\/src\/games\/([^/]+)\/meta\.tsx?$/.exec(path)?.[1] ?? "";
            return SHELL_META_DIRS.has(dir) ? "shell" : "meta-rest";
          }

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
          // The sound lab at `#/lab`. `src/lab/**` matches none of the rules
          // below, so WITHOUT this branch it falls through to `return undefined`
          // and lands in the ENTRY chunk - shipped to every child on first
          // paint, with no `lab-` name for globIgnores to match and nothing
          // failing. Naming it is half of what makes the lazy import real; the
          // globIgnores entry above is the other half.
          if (path.includes("/src/lab/")) return "lab";

          // The room's second shelf - its drawings AND its catalogue rows.
          // Both, and the rows are the half that surprises: measured on the
          // artifact, the 52 rows alone were 2,448 B gz in the shell, so
          // carving out the pictures and leaving the data behind fails the
          // payload gate by more than it saves.
          //
          // It MUST be carved out before the `src/portal/world/` rule below,
          // which would otherwise pin it to `page` - and `page` is fetched by
          // every visitor who opens a GAME, most of whom never see the shop.
          //
          // NAMING it is the second of the three changes that make the split
          // real (the dynamic import in `roomArt.ts` is the first, the
          // `world-art-*.js` globIgnores entry above the third). An unnamed
          // chunk is emitted as `module-<hash>.js`, which no globIgnores entry
          // can match, so it lands straight back in the precache.
          //
          // `art.tsx`, `streakArt.tsx`, `roomArt.ts`, `Scene.tsx` and
          // `items.ts` are deliberately NOT here: they are the half a
          // returning player needs at first paint, plus the registry that
          // merges the two.
          if (/\/src\/portal\/world\/(artRest\.tsx|itemsRest\.ts)$/.test(path)) return "world-art";

          // Sharing: the payload policy, the card, the browser rasteriser and
          // the sheet. Same arrangement and same reason as `cloud` and `page`
          // above, and it MUST be carved out before both catch-alls below -
          // `share.ts` lives under src/sdk/ and the other three under
          // src/portal/, so each would otherwise be pinned to the shell and the
          // dynamic import in `wireShare` would buy nothing.
          //
          // The importer moved from `Home.tsx` to `PageApp.tsx` on 2026-08-25,
          // when the share became a per-game invite - so this now keeps the
          // sheet out of the PAGE chunk rather than out of the shell. The carve
          // is if anything more load-bearing there: `page` is fetched by every
          // visitor who opens a game, and only a fraction of them tap share.
          //
          // `sdk/shareDay.ts` used to be deliberately excluded here; it is
          // DELETED, along with the whole day payload, so the `\.ts$` anchor now
          // guards nothing in particular. It stays because it is still the right
          // shape: an anchor cannot accidentally swallow a future sibling.
          if (/\/src\/sdk\/share\.ts$/.test(path)) return "share";
          if (/\/src\/portal\/(ShareSheet\.tsx|shareCard(Render)?\.ts)$/.test(path)) return "share";

          // The pooled-standings ranking policy. Only `Boards.tsx` (already
          // `page`) ever imports its VALUES — `cloud.ts` (chunk `cloud`) takes
          // only a type-only import of `PooledRow`, which is erased, so this
          // pin creates no edge from `cloud` into `page`. Same arrangement and
          // same reason as `share` above, carved out before the `src/sdk/`
          // catch-all would otherwise pin it to the shell and ship the whole
          // ranking module to every child before they had chosen a game.
          if (/\/src\/sdk\/(medals|pooled)\.ts$/.test(path)) return "page";

          if (/\/src\/portal\/(PageApp|GameHost|Boards)\.tsx$/.test(path)) return "page";
          if (/\/src\/portal\/world\/(World|Backup)\.tsx$/.test(path)) return "page";
          // `selectionDismiss.ts` clears a stray highlight off a game board and
          // is imported by `GameHost` alone. It is named HERE rather than left
          // to the catch-all below, which claims everything under src/portal/
          // for the shell - so without this line a child downloads it before
          // choosing a game, for a screen they may never open. Same reasoning as
          // `Boards.tsx` above, and the shell has 473 B of headroom.
          if (/\/src\/portal\/selectionDismiss\.ts$/.test(path)) return "page";
          // `boardsView.ts` is the pure half of the boards screen and `Boards.tsx`
          // above is its ONLY importer, so the catch-all below was shipping it -
          // the ladder order, the record lookup, all of it - to every child on a
          // first visit for a screen most of them never open. Measured on the
          // artifact: 90,990 -> 90,822 B gz, and the shell imports nothing from
          // it, which is what `assert-first-visit.mjs` proves rather than assumes.
          if (/\/src\/portal\/boardsView\.ts$/.test(path)) return "page";

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
          // The roster's lazy half, and the full roster that spreads it. BOTH must
          // clear the catch-all on the next line, and putting this rule anywhere
          // below it is INERT - measured 2026-08-21, a pin added down beside the
          // `gameArtRest` rule emitted no chunk at all and nothing failed.
          //
          // `games.ts` is build-and-test only, but the DESIGN BENCH imports it to
          // walk every game. Without this the bench's import does not land in the
          // lab chunk - it lands in the shell, for a screen no child opens.
          if (/\/src\/portal\/(games|gamesRest)\.ts$/.test(path)) return "meta-rest";
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
          //
          // `DirectionPad.tsx` is here for the identical reason: the four-way
          // pad is drawn by steering games and by nothing on the home screen,
          // and it is deliberately absent from the `@ui` barrel so that
          // re-exporting it cannot drag the shell into this chunk.
          //
          // `gameTools.ts` is here for the third time over, and it is the one
          // that cost bytes before it was noticed: it is chrome talking to
          // chrome - the slot a mounted game fills so the page's own utility
          // row can drive its pause and restart - so its only importers are
          // `GameChrome` and `PageApp`, both of which are on this side. Left to
          // the `src/ui/` catch-all below it went to the SHELL, and the payload
          // gate reded 81 B over the ceiling naming it.
          if (/\/src\/ui\/(GameChrome|DirectionPad)\.tsx$/.test(path)) return "page";
          if (/\/src\/ui\/gameTools\.ts$/.test(path)) return "page";

          // The card art below the fold. It lives under `src/ui/`, so the
          // catch-all further down would claim it for the shell - which is
          // where it used to be, at 163 B gz per game paid by every child for
          // cards most never scroll to. Same trap as `GameChrome.tsx` above.
          //
          // NAMING it is half of what makes the deferral real: an unnamed chunk
          // is emitted as `module-<hash>.js`, which no globIgnores entry can
          // match, so it lands straight back in the precache and the split buys
          // nothing. The other half is the `**/art-rest-*.js` entry above.
          //
          // `gameArt.ts` itself is deliberately NOT here. It holds the scenes a
          // first visit draws, plus the palette this chunk imports.
          if (/\/src\/ui\/gameArtRest\.ts$/.test(path)) return "art-rest";

          // The shared GAME helpers, same trap as `GameChrome.tsx` above and
          // `Boards.tsx` before it, one directory over and much larger.
          //
          // `src/shared/` is imported by the games and by NOTHING on the home
          // screen. That is measured, not assumed: the only path from the shell
          // into this directory is `rng.ts`, via `sdk/names.ts` and
          // `sdk/backupCode.ts` - both of which already import the DIRECT module
          // path rather than the barrel, for exactly this reason (the comment
          // above the import in names.ts spells it out: the barrel re-exports
          // winMoment, which reaches @juice and the portal).
          //
          // So everything else here - winMoment, the spawner, the cast, the
          // shapes, the sequence brain, both "carry on where you left off"
          // hooks, the game clock, the Prompt chip, and the barrel that
          // re-exports them - was downloaded by every child BEFORE they had
          // chosen a game, purely because the catch-all below claims the whole
          // directory. The game chunks that import them are only ever loaded on
          // a page that has already fetched `page-*`, so this costs no extra
          // request.
          //
          // `rng.ts` MUST stay on the shell side, and this ordering is the whole
          // guard: move it and the SHELL imports from the page chunk, which is
          // the failure `assert-first-visit.mjs` exists to catch and has now
          // caught three times.
          if (/\/src\/shared\/rng\.ts$/.test(path)) return "shell";
          if (path.includes("/src/shared/")) return "page";

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
