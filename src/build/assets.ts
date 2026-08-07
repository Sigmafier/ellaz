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
 * Dev has no bundle: Vite serves the unbundled entry and injects its own client.
 * The one tag below is what `index.html` says in source, so the dev middleware
 * boots the same app through the same module.
 */
export const DEV_HEAD_ASSETS: HeadAssets = {
  tags: ['<script type="module" src="/src/main.tsx"></script>'],
  scripts: ['<script type="module" src="/src/main.tsx"></script>'],
};
