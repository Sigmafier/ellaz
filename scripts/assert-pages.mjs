#!/usr/bin/env node
// Assert that the emitted content pages are real, complete, and correct for the
// host they were built for.
//
// Run after `npm run build`:  node scripts/assert-pages.mjs
// Run it TWICE — once with no BASE_PATH and once with BASE_PATH=/ellaz/ —
// because half of these failures are base-dependent and each deploy workflow
// only ever sees one arm.
//
// The failures this exists to catch are all invisible from a green build:
//
//   * a page that lost its prose but kept its shell
//   * a canonical carrying the base, so the Pages copy advertises
//     https://ellaz.fun/ellaz/games/snake/ — a URL that has never existed
//   * an internal link to /games/n2048/ when the game's id is "2048"
//   * a JSON-LD block that stopped parsing after a quote landed in the prose
//   * a NavigationRoute back in sw.js, hijacking every page for returning
//     visitors and nobody else
//   * `cp dist/index.html dist/404.html` in a workflow, overwriting the real 404
//   * a page that carries the prose but not the runtime, so the frame stays a
//     black box and the game never mounts - perfect in every check that reads
//     the HTML, broken for every human who opens it
//
// Every check below is followed by a negative control at the bottom of the file
// that plants the exact defect and requires the check to fire. A check nobody
// has watched fail is not a check.
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.env.DIST_DIR ?? "dist";

/** The prose floor per page, as a RATCHET. It only ever goes up. */
const MIN_WORDS = 550;

const failures = [];
const fail = (msg) => failures.push(msg);

// ---------------------------------------------------------------------------
// Extractors. Defined once, so the negative controls exercise the same code the
// real assertions do — a control that runs a different matcher proves nothing.
// ---------------------------------------------------------------------------

/** Visible words: strip head, script, style and tags, then count. */
export function proseWords(html) {
  const body = html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function canonicalOf(html) {
  const m = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html);
  return m ? m[1] : null;
}

/** Every asset the page tells a browser to fetch before it renders. */
export function eagerAssets(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"[^>]*rel="modulepreload"/gi)) out.push(m[1]);
  return out;
}

/** Local stylesheet links, base-relative. The Google Fonts one is skipped. */
export function localStylesheets(html) {
  const out = [];
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)) {
    if (!/^https?:/i.test(m[1])) out.push(m[1]);
  }
  return out;
}

/** What `#game-frame` contains in the EMITTED html. Must be nothing. */
export function frameContents(html) {
  const m = /<div id="game-frame"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return m ? m[1].trim() : null;
}

export function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
}

/** Same-site hrefs only: no scheme, no fragment-only, no mailto. */
export function internalLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"/gi)) {
    const href = m[1];
    if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
    out.push(href);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The real run
// ---------------------------------------------------------------------------

function readManifest() {
  const path = join(DIST, "pages.json");
  if (!existsSync(path)) {
    console.error(`FAIL  no ${path} — run \`npm run build\` first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}


/**
 * The share card a page advertises, as a dist-relative file.
 *
 * `og:image` is always absolute and always points at ellaz.fun, on BOTH hosts,
 * exactly like the canonical - a scraper gets the URL with no page context, so
 * a relative one is unusable. That means the path maps straight to a file.
 */
function ogImageOf(html) {
  const m = html.match(/<meta property="og:image" content="([^"]+)"/);
  return m ? m[1] : "";
}

const OG_CEILING = 600 * 1024;

/** Every card the pages point at: exists, non-trivial, and under WhatsApp's cap. */
function checkOgCard(html, where, kind) {
  const url = ogImageOf(html);
  // The 404 has no card ON PURPOSE. Asserted rather than skipped, so the
  // exemption stays a decision instead of becoming a hole the day a card
  // silently stops being written for some other page kind too.
  if (kind === "notFound") {
    if (url) fail(`${where} advertises a share card; a 404 is never deliberately shared`);
    return;
  }
  if (!url) {
    fail(`${where} has no og:image - every link shared to WhatsApp previews with no picture`);
    return;
  }
  if (!url.startsWith("https://ellaz.fun/og/")) {
    fail(`${where} og:image is "${url}" - must be an absolute ellaz.fun URL, like the canonical`);
    return;
  }
  if (!/<meta name="twitter:card" content="summary_large_image"/.test(html)) {
    fail(`${where} has an og:image but still asks for a small twitter card`);
  }
  const file = join(DIST, url.replace("https://ellaz.fun/", ""));
  if (!existsSync(file)) {
    fail(`${where} points at ${url}, which was never written`);
    return;
  }
  const bytes = statSync(file).size;
  // A card that renders as a flat colour - art missing, or an unresolved CSS
  // var painting the whole thing black - compresses to almost nothing. The
  // floor catches that; the ceiling catches WhatsApp silently dropping it.
  if (bytes < 4096) {
    fail(`${where} card is only ${bytes} B - a flat colour, so the art did not render`);
  }
  if (bytes > OG_CEILING) {
    fail(`${where} card is ${bytes} B, over WhatsApp's ${OG_CEILING} B limit - it will be dropped`);
  }
}

function main() {
  const manifest = readManifest();
  const base = manifest.base;
  const primary = base === "/";
  const emitted = manifest.pages.filter((p) => p.emitted);

  // A zero-page run satisfies every per-page assertion below forever. Same
  // reason assert-first-visit refuses a zero-entry precache manifest.
  if (emitted.length === 0) {
    console.error("FAIL  the manifest lists no emitted pages — the emitter is broken, not the gate.");
    process.exit(1);
  }

  const known = new Set(manifest.pages.map((p) => p.path));
  /** game page -> the game chunk it preloads. Two games must never share one. */
  const preloadedGame = new Map();
  let words = Infinity;
  let thinnest = "";

  // The app's own eager asset set, as the yardstick every booting page is
  // measured against. Read once, from the artifact.
  const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
  const norm = (u) => (u.startsWith(base) ? u.slice(base.length) : u).replace(/^\//, "");
  const rootEager = eagerAssets(indexHtml).map(norm).sort();
  if (rootEager.length === 0) {
    console.error("FAIL  index.html lists no eager assets — the matcher is broken, not the build.");
    process.exit(1);
  }

  for (const page of emitted) {
    const file = join(DIST, page.file);
    if (!existsSync(file)) {
      fail(`${page.file} is in the route table but was never written`);
      continue;
    }
    const html = readFileSync(file, "utf8");
    const where = page.file;

    // --- the page is a real document -------------------------------------
    if (!/<h1[\s>]/i.test(html)) fail(`${where} has no <h1>`);
    const n = proseWords(html);
    if (page.kind === "game" && n < MIN_WORDS) {
      fail(`${where} has ${n} words of prose, floor is ${MIN_WORDS}`);
    }
    if (page.kind === "game" && n < words) {
      words = n;
      thinnest = where;
    }

    // --- language ---------------------------------------------------------
    const dir = page.locale === "he" ? "rtl" : "ltr";
    if (!new RegExp(`<html lang="${page.locale}" dir="${dir}"`).test(html)) {
      fail(`${where} should declare lang="${page.locale}" dir="${dir}"`);
    }

    // --- canonical --------------------------------------------------------
    const canonical = canonicalOf(html);
    if (canonical !== page.canonical) {
      fail(`${where} canonical is ${canonical}, expected ${page.canonical}`);
    }
    if (!primary && canonical && canonical.includes(base)) {
      fail(`${where} canonical carries the base: ${canonical} — that URL exists on neither host`);
    }

    // --- the share card ---------------------------------------------------
    checkOgCard(html, where, page.kind);

    // --- indexability -----------------------------------------------------
    const noindex = /<meta name="robots" content="noindex/i.test(html);
    if (!primary && !noindex) fail(`${where} must be noindex on the Pages duplicate`);
    if (primary && page.kind !== "notFound" && noindex) {
      fail(`${where} is noindex on the primary host`);
    }
    if (page.kind === "notFound" && !noindex) {
      fail(`${where} must be noindex — an indexable 404 body is a soft 404`);
    }

    // --- the runtime, and the two elements it is allowed to own -----------
    //
    // A page that boots the app must load EXACTLY what the app loads. The
    // names carry a content hash, so a page whose set has drifted is a page
    // running different code from the one at `/` - and the shape that failure
    // takes is a game that never mounts, on a page that looks perfect.
    // Read off the emitter's own manifest, so "which pages boot" cannot drift
    // between the route table and this gate. A page kind missing here is not a
    // soft failure: it gets held to the DOCUMENT rules instead and fails for a
    // reason that has nothing to do with what is wrong.
    const boots = page.kind === "game" || page.kind === "world" || page.kind === "boards";
    const eager = eagerAssets(html).map(norm).sort();
    if (boots) {
      // A booting page must load everything index.html loads - the names carry a
      // content hash, so a page whose set has DRIFTED is running different code.
      // It may additionally name the lazy chunks it is about to fetch anyway:
      // the content-page runtime, and on a game page that ONE game. Without
      // those two preloads the page loads in three serial round trips.
      const missing = rootEager.filter((a) => !eager.includes(a));
      if (missing.length > 0) {
        fail(
          `${where} does not load what index.html loads.\n` +
            `    missing: ${missing.join(", ")}\n    page: ${eager.join(", ") || "(none)"}`,
        );
      }
      const extra = eager.filter((a) => !rootEager.includes(a));
      const pageChunks = extra.filter((a) => /^assets\/page-[\w-]+\.js$/.test(a));
      const gameChunks = extra.filter((a) => /^assets\/game-[\w-]+\.js$/.test(a));
      const other = extra.filter((a) => !pageChunks.includes(a) && !gameChunks.includes(a));
      if (pageChunks.length !== 1) {
        fail(`${where} preloads ${pageChunks.length} page runtime chunks, expected exactly 1`);
      }
      const wantGames = page.kind === "game" ? 1 : 0;
      if (gameChunks.length !== wantGames) {
        fail(
          `${where} preloads ${gameChunks.length} game chunk(s), expected ${wantGames}` +
            (gameChunks.length ? `: ${gameChunks.join(", ")}` : ""),
        );
      }
      if (other.length > 0) fail(`${where} eagerly fetches ${other.join(", ")}`);
      if (page.kind === "game") preloadedGame.set(page.file, gameChunks[0]);
      if (localStylesheets(html).length === 0) {
        fail(`${where} boots the app with no app stylesheet — the game renders unstyled`);
      }
      if (!/<div id="game-frame"[^>]*>/.test(html)) {
        fail(`${where} boots the app but has no #game-frame to mount into`);
      }
      // React owns the CHILDREN of #game-frame. Anything emitted inside it is a
      // node React does not know about sitting in a tree it reconciles - the
      // nested-root teardown bug in a different costume.
      const inside = frameContents(html);
      if (inside) fail(`${where} emits markup inside #game-frame: ${inside.slice(0, 60)}`);
      if (!/id="game-poster"/.test(html)) {
        fail(`${where} has no poster — the frame is a black box until the game arrives`);
      }
      if (page.kind === "game" && !/id="wallet-slot"/.test(html)) {
        fail(`${where} has no #wallet-slot`);
      }
      if (!/<body[^>]+data-page="/.test(html)) {
        fail(`${where} carries no data-page — the runtime cannot tell what page it is on`);
      }
    } else if (eager.length > 0) {
      fail(`${where} is a document and should fetch nothing eagerly: ${eager.join(", ")}`);
    }
    if (/id="root"/.test(html)) {
      fail(`${where} contains #root — the app shell would boot over the prose`);
    }

    // --- structured data --------------------------------------------------
    for (const block of jsonLdBlocks(html)) {
      try {
        JSON.parse(block);
      } catch (e) {
        fail(`${where} has JSON-LD that does not parse: ${e.message}`);
      }
    }

    // --- internal links ---------------------------------------------------
    for (const link of internalLinks(html)) {
      if (!link.startsWith(base)) {
        fail(`${where} links to ${link}, which does not start with the base ${base}`);
        continue;
      }
      const path = `/${link.slice(base.length)}`.split("#")[0];
      if (path === "/" || known.has(path)) continue;
      fail(`${where} links to ${link}, which is not a page this build emits`);
    }
  }

  // A page preloading a SIBLING's chunk downloads code it can never run, and
  // it looks identical to the correct thing in every per-page check above. The
  // two locales of one game share a chunk; two different games never do.
  const byChunk = new Map();
  for (const [file, chunk] of preloadedGame) {
    const id = (/(^|\/)games\/([^/]+)\//.exec(file) ?? [])[2];
    const seen = byChunk.get(chunk);
    if (seen && seen !== id) fail(`games ${seen} and ${id} both preload ${chunk}`);
    byChunk.set(chunk, id);
  }
  if (preloadedGame.size > 0 && byChunk.size * 2 !== preloadedGame.size) {
    fail(`${byChunk.size} distinct game chunks across ${preloadedGame.size} game pages`);
  }

  // --- index.html: the app shell, head-enhanced in place --------------------
  const index = indexHtml;
  if (canonicalOf(index) !== `https://ellaz.fun/`) {
    fail(`index.html canonical is ${canonicalOf(index)}, expected https://ellaz.fun/`);
  }
  if (jsonLdBlocks(index).length === 0) {
    fail("index.html carries no JSON-LD — a crawler landing on / finds no game links at all");
  }
  for (const block of jsonLdBlocks(index)) {
    try {
      JSON.parse(block);
    } catch (e) {
      fail(`index.html JSON-LD does not parse: ${e.message}`);
    }
  }
  if (!/id="root"/.test(index)) fail("index.html lost #root — the app has nowhere to mount");

  // The workflow line `cp dist/index.html dist/404.html` would make these equal.
  if (readFileSync(join(DIST, "404.html"), "utf8") === index) {
    fail("404.html is a copy of index.html — something overwrote the real 404");
  }

  // --- the service worker ---------------------------------------------------
  const sw = readFileSync(join(DIST, "sw.js"), "utf8");
  if (/NavigationRoute/.test(sw)) {
    fail(
      "sw.js registers a NavigationRoute. Returning visitors get the app shell at every page URL " +
        "while crawlers and fresh browsers get the right page. Set navigateFallback: undefined.",
    );
  }
  if (!/ellaz-pages/.test(sw)) {
    fail("sw.js has no navigate runtimeCaching rule — offline navigation is gone entirely");
  }
  for (const page of emitted) {
    if (sw.includes(`url:"${page.file}"`)) {
      fail(`${page.file} is PRECACHED — add its directory to workbox.globIgnores`);
    }
  }

  // --- sitemap <-> filesystem ----------------------------------------------
  if (primary) {
    const sitemap = readFileSync(join(DIST, "sitemap.xml"), "utf8");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const indexable = manifest.pages.filter((p) => p.kind !== "notFound");
    for (const p of indexable) {
      if (!locs.includes(p.canonical)) fail(`sitemap is missing ${p.canonical}`);
    }
    for (const loc of locs) {
      if (!indexable.some((p) => p.canonical === loc)) fail(`sitemap advertises ${loc}, which this build does not emit`);
    }
    if (!existsSync(join(DIST, "robots.txt"))) fail("no robots.txt");
    const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
    if (!robots.includes("Sitemap: https://ellaz.fun/sitemap.xml")) {
      fail("robots.txt does not point at the sitemap");
    }
  } else {
    if (existsSync(join(DIST, "sitemap.xml"))) {
      fail("the Pages duplicate emitted a sitemap — it would invite indexing of a noindex copy");
    }
    const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
    if (!/^Disallow: \/$/m.test(robots)) fail("the Pages duplicate's robots.txt must Disallow: /");
  }

  // --- report ---------------------------------------------------------------
  const bytes = emitted.reduce((n, p) => n + statSync(join(DIST, p.file)).size, 0);
  console.log(
    `\npages: ${emitted.length} emitted, ${(bytes / 1024).toFixed(0)} KiB total, base ${base}`,
  );
  console.log(`thinnest game page: ${thinnest} at ${words} words (floor ${MIN_WORDS})`);

  runControls();

  if (failures.length > 0) {
    console.error(`\nFAIL  ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log("OK  every emitted page is a real, correctly-addressed document.");
}

// ---------------------------------------------------------------------------
// Negative controls. Each plants the exact defect its checker exists to catch
// and requires the checker to fire, using the SAME extractor the real run uses.
// ---------------------------------------------------------------------------
function runControls() {
  const controls = [
    [
      "a script tag on a content page",
      () => eagerAssets('<script src="/assets/index-abc.js"></script>').length === 1,
    ],
    [
      "a modulepreload on a content page",
      () =>
        eagerAssets('<link rel="modulepreload" href="/assets/game-snake-abc.js">').length === 1,
    ],
    [
      "a base-carrying canonical",
      () => canonicalOf('<link rel="canonical" href="https://ellaz.fun/ellaz/games/snake/" />').includes("/ellaz/"),
    ],
    [
      "JSON-LD that does not parse",
      () => {
        const [block] = jsonLdBlocks('<script type="application/ld+json">{"a":}</script>');
        try {
          JSON.parse(block);
          return false;
        } catch {
          return true;
        }
      },
    ],
    [
      "an internal link nobody emits",
      () => internalLinks('<a href="/games/n2048/">x</a>')[0] === "/games/n2048/",
    ],
    [
      "an external link is NOT treated as internal",
      () => internalLinks('<a href="https://example.com/">x</a>').length === 0,
    ],
    [
      "markup left inside the game frame",
      () => frameContents('<div id="game-frame"><p>hi</p></div>') === "<p>hi</p>",
    ],
    [
      "an empty frame reads as empty",
      () => frameContents('<div id="game-frame"></div>') === "",
    ],
    [
      "a remote stylesheet is not counted as the app's",
      () =>
        localStylesheets('<link rel="stylesheet" href="https://fonts.googleapis.com/x">').length ===
        0,
    ],
    [
      "a page stripped of its prose",
      () => proseWords("<html><body><h1>Hi</h1></body></html>") < MIN_WORDS,
    ],
    [
      "a page with no og:image",
      () => ogImageOf('<html><head><title>x</title></head></html>') === "",
    ],
    [
      "an og:image that is not an absolute ellaz.fun URL",
      () =>
        !ogImageOf('<meta property="og:image" content="/og/x.png" />').startsWith(
          "https://ellaz.fun/og/",
        ),
    ],
    [
      "prose is counted, not markup",
      () => proseWords("<html><body><p>one two three four five</p></body></html>") === 5,
    ],
  ];

  let fired = 0;
  for (const [name, probe] of controls) {
    if (probe()) fired++;
    else fail(`negative control DEAD: "${name}" did not fire — every result above is void`);
  }
  console.log(`negative control: ${fired}/${controls.length} planted defects detected`);
}

main();
