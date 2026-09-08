/**
 * The head tags that make a page an application, lifted verbatim off the
 * application's own `index.html`.
 *
 * WHY VERBATIM AND WHY FROM THE BUNDLE
 * The script and stylesheet names carry a content hash that changes on every
 * build. Anything that reconstructs them - a glob over `dist/assets`, a guess at
 * the entry name - is a second implementation of Rollup's naming, and it is
 * wrong the first time a chunk splits. Copying the tags Vite already wrote means
 * the content pages and the app can never load different code.
 *
 * If this finds no script, the emitter throws. A content page with prose and no
 * runtime is a game page you cannot play, which looks perfect in every check
 * that reads the HTML and fails for every human who taps the button.
 */

export interface HeadAssets {
  /** `<script type="module" src>` plus modulepreloads, stylesheets, the manifest. */
  tags: string[];
  /** Just the executable ones, for the gate's parity assertion. */
  scripts: string[];
  /**
   * The hashed names of the chunks a content page will go on to fetch by
   * itself. Absent in dev, where there is no bundle and nothing is hashed.
   */
  lazy?: LazyChunks;
  /**
   * The body face's hashed woff2, per subset. Absent in dev, where nothing is
   * hashed. See `resolveFontAssets`.
   */
  fonts?: FontAssets;
}

/**
 * The hashed woff2 files a page may preload, keyed by SUBSET.
 *
 * WHY A PAGE PRELOADS A FONT AT ALL
 * Until 2026-09-07 the webfont was reached by an `@import` at the top of the
 * shell stylesheet, so it could not begin downloading until the document, the
 * entry script and that stylesheet had each completed - five serial hops, on a
 * third-party origin, blocking the first paint for 1,300 ms on mobile. A
 * `<link rel=preload>` in the document's own head starts it with the page.
 *
 * WHY KEYED BY SUBSET AND NOT JUST "the font"
 * `fonts.css` declares each family three times over three `unicode-range`s, so
 * a reader who draws Latin fetches 30,148 B of Heebo and a reader who draws
 * Hebrew fetches 12,000 B - the browser picks. A preload has no such
 * discretion: it fetches exactly what it is told. Preloading the wrong subset
 * is not a small waste, it is a download the page never uses PLUS the one it
 * needs still arriving late.
 */
export interface FontAssets {
  /** Subset name (`latin`, `hebrew`, ...) -> dist-relative hashed filename. */
  body: Readonly<Record<string, string>>;
}

/**
 * The lazy chunks an emitted page needs, as dist-relative filenames.
 *
 * WHY THIS EXISTS
 * A game page loads in three SERIAL stages, and each one is a full round trip
 * that cannot even START until the previous one has been parsed and executed:
 * the entry, then `page-*` (a dynamic import inside the entry), then
 * `game-<id>-*` (a dynamic import fired from a React effect, so it waits for a
 * mount as well). Measured against a local server with 80 ms of latency: the
 * game chunk could not begin before 216 ms. Told about both chunks up front,
 * all three start together at 97 ms.
 *
 * Nothing here is a guess: the page already carries `data-game="memory"`, so
 * WHICH game a page will ask for is a fact known at build time. This just says
 * it out loud, in the head, where the preload scanner can see it.
 */
export interface LazyChunks {
  /** The content-page runtime - the game host, the room, the boards. */
  page: string;
  /** Game id -> that game's own chunk. Keyed by `meta.id`, never by directory. */
  games: Readonly<Record<string, string>>;
}

/**
 * The DIRECTORY a game's code lives in, when it is not the game's own id.
 *
 * `manualChunks` names a game chunk after its directory (`game-n2048`), while
 * every page, route and body attribute names it by `meta.id` ("2048"). The two
 * agree for 20 of the 21 games and the exception is invisible until a page
 * preloads a chunk that does not exist - a 404 in the network panel and a page
 * that is no faster than before, with a green build either way.
 *
 * `build.test.ts` pins every entry here against the loader `catalog.ts` really
 * calls, so a future game whose directory differs from its id fails the suite
 * rather than quietly losing its preload.
 */
const CHUNK_DIR: Readonly<Record<string, string>> = { "2048": "n2048" };

/** The `manualChunks` name for a game: `game-<directory>`, never `game-<id>`. */
export function chunkNameFor(gameId: string): string {
  return `game-${CHUNK_DIR[gameId] ?? gameId}`;
}

/**
 * Find the one emitted file for a named chunk.
 *
 * The name is derived; the FILENAME is always read back out of the bundle,
 * because it carries a content hash. Anything that string-builds the hash is a
 * second implementation of Rollup's naming and is wrong on the next build.
 *
 * The hash alphabet is base64url, so it contains `-` and `_` - `page-Ch10E-pb`
 * and `game-sudoku-DICSW--A` are both real. That is why this matches the whole
 * name rather than splitting on the last dash.
 */
function chunkFile(fileNames: readonly string[], name: string): string | undefined {
  const re = new RegExp(`^assets/${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-[\\w-]+\\.js$`);
  const hits = fileNames.filter((f) => re.test(f));
  if (hits.length > 1) {
    throw new Error(
      `page emitter: ${hits.length} chunks answer to "${name}" (${hits.join(", ")}). ` +
        "A preload has to name exactly one file; check for a chunk name that is a prefix of another.",
    );
  }
  return hits[0];
}

/**
 * Which hashed chunk each page will fetch, read off the real bundle.
 *
 * Both misses throw, and they throw for the same reason: this whole feature is
 * an optimisation, so a silent miss leaves a page permanently slower behind a
 * green build - the exact failure class the precache and first-visit gates in
 * this repo exist to catch.
 *
 * A missing GAME chunk is not "that one game is special". Every game directory
 * produces a chunk by construction (`manualChunks` returns `game-<dir>` for any
 * module under `src/games/<dir>/`), so a miss is evidence the id -> directory
 * derivation above has gone stale, which would degrade that game's page forever
 * with nothing to notice it by.
 */
export function resolveLazyChunks(
  fileNames: readonly string[],
  gameIds: readonly string[],
): LazyChunks {
  const page = chunkFile(fileNames, "page");
  if (!page) {
    throw new Error(
      "page emitter: no `page-*` chunk in the bundle. Every emitted page preloads the " +
        "content-page runtime, so its absence means the manualChunks contract in " +
        "vite.config.ts changed - check the `page` branch and the chunkFileNames pattern.",
    );
  }

  const games: Record<string, string> = {};
  for (const id of gameIds) {
    const name = chunkNameFor(id);
    const file = chunkFile(fileNames, name);
    if (!file) {
      throw new Error(
        `page emitter: no "${name}" chunk for game "${id}". Its page would preload nothing ` +
          "and stay three serial round trips slow. If the game's directory is not its id, " +
          "add it to CHUNK_DIR in src/build/assets.ts.",
      );
    }
    games[id] = file;
  }
  return { page, games };
}

/**
 * Vite's own wording, character for character - see the tags it writes into
 * `index.html`. `crossorigin` is not decoration: without it the preloaded
 * response is fetched in a different mode from the module request that follows,
 * so the browser fetches the file twice and the preload costs bytes instead of
 * saving time.
 */
export function modulePreloadTag(file: string, base: string): string {
  return `<link rel="modulepreload" crossorigin href="${base}${file}">`;
}

/** The face body text is set in - `--font` in tokens.css leads with it. */
export const BODY_FACE = "heebo";

/** Which subset a locale's readers actually draw. Anything else is Latin. */
const SUBSET_OF_LOCALE: Readonly<Record<string, string>> = { he: "hebrew" };

/**
 * The body face's hashed files, read out of the bundle rather than guessed.
 *
 * Same rule as `resolveLazyChunks` above and for the same reason: these names
 * carry a content hash, the one under `/ellaz/` is a different string from the
 * one under `/`, and anything that rebuilds the name by hand is a second
 * implementation of Rollup's naming that is wrong the first time a file
 * changes. `Object.keys(bundle)` is the only honest source.
 *
 * Returns an empty map rather than throwing: a preload is an optimisation, and
 * a build that somehow emitted no woff2 should still produce readable pages in
 * the fallback stack. `assert-fast.mjs` reds on the served page if the preload
 * is missing, which is the right place for that refusal - it reads what a
 * visitor actually received.
 */
export function resolveFontAssets(fileNames: readonly string[]): FontAssets {
  const body: Record<string, string> = {};
  for (const f of fileNames) {
    const m = /(?:^|\/)([a-z]+)-([a-z-]+)-[^/]*\.woff2$/.exec(f);
    if (!m || m[1] !== BODY_FACE) continue;
    body[m[2]] = f;
  }
  return { body };
}

/**
 * `crossorigin` is mandatory, not decoration. Fonts are fetched in CORS mode
 * whatever their origin, so a preload without it is fetched in a DIFFERENT
 * mode from the request `@font-face` makes moments later - the browser cannot
 * match them, downloads the file twice, and the preload costs bytes instead of
 * saving time. Same trap `modulePreloadTag` above documents.
 */
export function fontPreloadTag(file: string, base: string): string {
  return `<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}${file}">`;
}

/**
 * The one font preload for a page, chosen by the locale it is written in.
 * Empty in dev, and empty if the bundle carried no matching file - the page is
 * still correct, just no faster than it was.
 */
export function fontPreloadTags(
  assets: HeadAssets | undefined,
  base: string,
  locale: string,
): string[] {
  const body = assets?.fonts?.body;
  if (!body) return [];
  const file = body[SUBSET_OF_LOCALE[locale] ?? "latin"];
  return file ? [fontPreloadTag(file, base)] : [];
}

/**
 * The preloads for one page: the content-page runtime, plus - on a game page -
 * that game's own chunk and no other. A page carrying a sibling's chunk would
 * download code it can never run, on all 42 game pages at once.
 *
 * Returns nothing when there is no bundle (dev, and the unit tests that render
 * without one), so the dev middleware degrades to exactly what it emitted
 * before rather than crashing on a chunk map it cannot have.
 */
export function lazyPreloadTags(
  assets: HeadAssets | undefined,
  base: string,
  gameId?: string,
): string[] {
  const lazy = assets?.lazy;
  if (!lazy) return [];
  const files = [lazy.page];
  if (gameId !== undefined) files.push(lazy.games[gameId]);
  return files.filter(Boolean).map((f) => modulePreloadTag(f, base));
}

const PATTERNS: RegExp[] = [
  /<script[^>]+type="module"[^>]*><\/script>/g,
  /<link[^>]+rel="modulepreload"[^>]*>/g,
  /<link[^>]+rel="stylesheet"[^>]*>/g,
  /<link[^>]+rel="manifest"[^>]*>/g,
];

export function extractHeadAssets(indexHtml: string): HeadAssets {
  const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(indexHtml)?.[1] ?? indexHtml;
  const tags: string[] = [];
  for (const re of PATTERNS) {
    for (const m of head.matchAll(re)) tags.push(m[0]);
  }
  const scripts = tags.filter((t) => t.startsWith("<script"));
  if (scripts.length === 0) {
    throw new Error(
      "page emitter: index.html carries no module script, so every emitted page would " +
        "render prose with no runtime and no way to play. Refusing to emit.",
    );
  }
  return { tags, scripts };
}

/**
 * The shell stylesheet, INLINED into the document instead of linked from it.
 *
 * WHY, AND WHAT IT COSTS
 * A `<link rel="stylesheet">` in the head blocks the first paint on a second
 * round trip, and it is a SEPARATE artifact with its own cache entry and its
 * own lifetime. Both halves of that were costing us:
 *
 *   - PageSpeed, 2026-09-08, mobile: `assets/shell-*.css` 2.7 KiB, **150 ms**
 *     of render-blocking time, and the last two hops of an 883 ms critical
 *     chain (document -> entry js -> this stylesheet -> Fredoka's woff2, which
 *     is declared inside it and therefore not discoverable until it parses).
 *   - The operator, the same morning: the home page rendered COMPLETELY
 *     UNSTYLED for a moment and then snapped into shape. That is not a font
 *     swap and not a mount - it is this file being absent at paint time. The
 *     proof is in the screenshot: the consent bar was styled and everything
 *     else was not, and the consent bar is the one block whose CSS ships
 *     INLINE in the body (`consent.ts`). Nothing else on that page has any
 *     styling of its own; `#home-doc` depends entirely on this stylesheet.
 *
 * A separately-cached, separately-versioned stylesheet can go missing in more
 * ways than one - a service-worker update racing a navigation, a runtime cache
 * older than the assets on the server (this host deletes hashed files on
 * deploy: every pre-deploy asset name 404s within the hour), a single failed
 * request. Inlining does not fix any one of those; it removes the whole class,
 * because a document cannot be missing part of itself.
 *
 * The cost is real and is not hidden: every emitted document that boots the app
 * carries the stylesheet's bytes. Measured on the day, `dist/` grew from 21 MB
 * to 23 MB and the first visit moved by the amount `assert:payload` prints -
 * one fewer request, the same bytes, gzipped against the HTML instead of alone.
 *
 * IT THROWS RATHER THAN DEGRADING. A missing entry here means the linked file
 * is not in the bundle, and the two survivable-looking outcomes are both worse
 * than a red build: keeping the link reintroduces exactly the failure above,
 * and dropping it ships a site with no styles at all.
 */
export function inlineStylesheets(
  tags: readonly string[],
  cssByFile: Readonly<Record<string, string>>,
): string[] {
  return tags.map((tag) => {
    if (!/<link\b[^>]*\brel="stylesheet"/i.test(tag)) return tag;
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
    if (href === undefined) {
      throw new Error(`page emitter: a stylesheet tag with no href: ${tag}`);
    }
    // The href carries the BASE (`/assets/...` on ellaz.fun, `/ellaz/assets/...`
    // on the Pages copy) and the bundle is keyed dist-relative, so take the
    // `assets/...` tail rather than stripping a fixed prefix.
    const file = /(assets\/[^"]+)$/.exec(href)?.[1];
    const css = file === undefined ? undefined : cssByFile[file];
    if (css === undefined) {
      throw new Error(
        `page emitter: index.html links ${href}, which is not in the bundle as ` +
          `"${file ?? "(no assets/ path)"}". Known stylesheets: ` +
          `${Object.keys(cssByFile).join(", ") || "(none)"}. Refusing to emit: keeping the ` +
          `link restores the render-blocking hop, and dropping it ships a page with no styles.`,
      );
    }
    // A `</style` inside the text would end the block early and dump the rest
    // of the stylesheet into the page as visible prose. Minified CSS cannot
    // contain one, which is exactly why nobody would notice if it did.
    if (/<\/style/i.test(css)) {
      throw new Error(`page emitter: ${file} contains "</style" and cannot be inlined verbatim.`);
    }
    return `<style>${css}</style>`;
  });
}

/**
 * The same transform applied to a whole document - used for `index.html`, the
 * one page Vite writes itself rather than the emitter writing it.
 *
 * Asserts that it changed something. A `replace` whose pattern has drifted
 * returns the input unchanged and reports success, which is how a fix ships
 * that was never applied.
 */
export function inlineStylesheetsInHtml(
  html: string,
  cssByFile: Readonly<Record<string, string>>,
): string {
  const links = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi) ?? [];
  if (links.length === 0) {
    throw new Error(
      "page emitter: index.html links no stylesheet. Either Vite stopped emitting one " +
        "or this matcher has drifted - both mean the app shell would ship unstyled.",
    );
  }
  let out = html;
  for (const [i, link] of links.entries()) {
    out = out.replace(link, inlineStylesheets([link], cssByFile)[0]);
    if (out.includes(link)) {
      throw new Error(`page emitter: failed to replace stylesheet link ${i + 1}: ${link}`);
    }
  }
  return out;
}

/**
 * Dev has no bundle: Vite serves the unbundled entry and injects its own client.
 * The one tag below is what `index.html` says in source, so the dev middleware
 * boots the same app through the same module.
 */
export const DEV_HEAD_ASSETS: HeadAssets = {
  tags: ['<script type="module" src="/src/main.tsx"></script>'],
  scripts: ['<script type="module" src="/src/main.tsx"></script>'],
};
