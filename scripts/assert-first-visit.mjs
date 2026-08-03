#!/usr/bin/env node
// Assert that a FIRST VISIT downloads only shell assets.
//
// Run after `npm run build`:  node scripts/assert-first-visit.mjs
//
// TWO delivery paths, and they are independent. A chunk reaches a child's
// first visit if EITHER is true, so both are checked here:
//
//   1. index.html    — `<script src>` and `<link rel="modulepreload">`. The
//                      browser fetches these eagerly, on the very first paint,
//                      service worker or not.
//   2. sw.js         — the workbox precache manifest, governed by globIgnores.
//
// This script checked only (2) until 2026-08-03, and that gap shipped: the
// dev-only Juice Lab was correctly excluded from the precache AND correctly
// behind a dev route guard, yet a module-scope `lazy(() => import(…))` kept it
// in the production module graph, so Vite wrote a modulepreload for it into
// index.html and every child downloaded 27 KB gz of tournament scaffolding.
// The precache check passed, truthfully and uselessly. Verified live at
// https://ellaz.fun before the fix.
//
// WHY THIS EXISTS
// The workbox glob is `**/*.{html,css,js,svg,woff2}` — it sweeps EVERYTHING.
// Anything not named in `globIgnores` is precached on first visit, so adding a
// lazy chunk without extending that list moves the bytes from one request to
// another and leaves the first visit exactly as heavy as before. The build stays
// green. The bundle report looks better. Nothing improved.
//
// WHY THE MATCHER IS UNQUOTED
// The minified sw.js writes `{url:"index.html",revision:"..."}` — a bare
// identifier key, NOT JSON. A `"url":"` matcher finds zero entries, so every
// assertion under it passes over an empty list and reports success. That exact
// false green has fired twice in this project's history. Verified again on
// 2026-08-02: `grep -c '"url":"' dist/sw.js` => 0, `url:"` => 11.
//
// A matcher nobody has watched FAIL is not a matcher, so this script ends by
// running the same extractor over a planted manifest and requiring it to find
// the forbidden entries. If the control does not fire, the script exits
// non-zero even when the real assertion "passed".
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.env.DIST_DIR ?? "dist";

/**
 * Pull every precached URL out of a service-worker source.
 * Single definition on purpose: the real check and the negative control MUST
 * exercise the same code, or the control proves nothing about the check.
 */
export function extractPrecacheUrls(swSource) {
  return [...swSource.matchAll(/[{,]url:"([^"]+)"/g)].map((m) => m[1]);
}

// An ALLOWLIST, not a denylist, and the distinction is the whole point.
//
// A denylist of known-bad prefixes (game-, vendor-phaser-, ...) cannot catch the
// failure it exists to catch. When a chunk has no manualChunks branch, Rollup
// names it `module-<hash>.js` — so the very case worth catching is the one with
// no prefix to match. Measured 2026-08-02: a keyed build with the dynamic import
// but no `vendor-analytics` branch precached `module-BPhPDZCf.js`, 222 KiB of
// PostHog, and the denylist version of this script printed "OK".
//
// So: name what MAY be precached, and fail everything else. A new shell asset is
// a deliberate decision that edits this list; a stray chunk is a bug that stops
// the build.
//
// The patterns match a FULL dist-relative path, not a basename, and that
// distinction is load-bearing since the content pages landed. `games/2048/
// index.html` has the basename `index.html`, which the old basename matcher
// waved through as "the app shell" — so all 46 emitted pages could have been
// precached and this script would have printed OK over roughly a megabyte of
// prose downloaded before a child picks a game.
const ALLOWED = [
  { re: /^index\.html$/, why: "the app shell" },
  { re: /^manifest\.webmanifest$/, why: "PWA manifest" },
  { re: /^(icon|favicon)\.svg$/, why: "app icons" },
  { re: /^assets\/shell-[A-Za-z0-9_-]+\.(js|css)$/, why: "shared app code + styles" },
  { re: /^assets\/index-[A-Za-z0-9_-]+\.js$/, why: "entry chunk" },
  { re: /^assets\/vendor-react-[A-Za-z0-9_-]+\.js$/, why: "React runtime" },
  { re: /^assets\/workbox-window\.prod\.es5-[A-Za-z0-9_-]+\.js$/, why: "SW registration" },
];

/** Known offenders, used only to print a more useful message. Not the gate. */
const KNOWN_BAD = [
  { prefix: "game-", why: "per-game chunk — runtime-cached on first play" },
  { prefix: "vendor-analytics-", why: "PostHog — deferred past first paint" },
  { prefix: "vendor-phaser-", why: "engine for one game — runtime-cached" },
  { prefix: "lab-", why: "dev-only Juice Lab — nothing links to it" },
  {
    prefix: "module-",
    why: "an UNNAMED chunk — it has no manualChunks branch, so there is no prefix to exclude. Name it in vite.config manualChunks first, then add that name to globIgnores",
  },
];

/**
 * The base this build was made for. Read from the artifact rather than from the
 * environment: the gate should describe the `dist/` in front of it, not the
 * shell variable that happens to be set now.
 */
function distBase() {
  try {
    return JSON.parse(readFileSync(join(DIST, "pages.json"), "utf8")).base;
  } catch {
    return "/";
  }
}
const BASE = distBase();

/** A URL as it appears under `dist/`: no base, no leading slash. */
const rel = (url) => (url.startsWith(BASE) ? url.slice(BASE.length) : url).replace(/^\//, "");

function sizeOf(url) {
  try {
    return statSync(join(DIST, url)).size;
  } catch {
    return 0; // revisioned entries like index.html always exist; be forgiving.
  }
}

/**
 * Every asset index.html tells the browser to fetch before anything renders.
 * `<script src>` and `<link rel="modulepreload">` are both eager — a preload is
 * not a hint the browser may ignore, it is a download.
 */
export function extractEagerHtmlAssets(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) out.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) out.push(m[1]);
  // href may precede rel in the emitted tag; catch that ordering too.
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"[^>]*rel="modulepreload"/g)) out.push(m[1]);
  return [...new Set(out)];
}

function checkIndexHtml() {
  let html;
  try {
    html = readFileSync(join(DIST, "index.html"), "utf8");
  } catch {
    console.error(`FAIL  no ${DIST}/index.html — run \`npm run build\` first.`);
    process.exit(1);
  }

  const assets = extractEagerHtmlAssets(html);
  if (assets.length === 0) {
    console.error("FAIL  index.html lists no eager assets — the matcher is broken, not the build.");
    process.exit(1);
  }

  const bad = [];
  for (const a of assets) {
    const name = rel(a);
    if (ALLOWED.some((x) => x.re.test(name))) continue;
    const known = KNOWN_BAD.find((f) => name.slice(name.lastIndexOf("/") + 1).startsWith(f.prefix));
    bad.push({
      a,
      why: known ? known.why : "not a known shell asset — first visit is an allowlist",
    });
  }

  console.log(`\nindex.html: ${assets.length} eager asset(s)`);
  for (const a of assets) console.log(`  ${a}`);

  if (bad.length > 0) {
    console.error(`\nFAIL  ${bad.length} chunk(s) fetched eagerly on first visit:`);
    for (const b of bad) {
      console.error(`  ${b.a}\n    ${b.why}`);
      console.error(
        "    NOTE: globIgnores cannot help here — a modulepreload is not the precache.",
      );
      console.error(
        "    Something in the production module graph still references it; a module-scope",
      );
      console.error("    lazy(() => import(…)) is the usual cause. Guard the import itself.");
    }
    process.exit(1);
  }
  console.log("OK  index.html fetches shell assets only.");
}

function main() {
  let sw;
  try {
    sw = readFileSync(join(DIST, "sw.js"), "utf8");
  } catch {
    console.error(`FAIL  no ${DIST}/sw.js — run \`npm run build\` first.`);
    process.exit(1);
  }

  const urls = extractPrecacheUrls(sw);

  // A zero-entry manifest is the shape a broken matcher produces, and it would
  // otherwise satisfy every "contains no forbidden entry" assertion below.
  if (urls.length === 0) {
    console.error("FAIL  extracted 0 precache entries — the matcher is broken, not the build.");
    process.exit(1);
  }

  const violations = [];
  for (const url of urls) {
    const name = rel(url);
    if (ALLOWED.some((a) => a.re.test(name))) continue;
    const known = KNOWN_BAD.find((f) => name.slice(name.lastIndexOf("/") + 1).startsWith(f.prefix));
    violations.push({
      url,
      why: known ? known.why : "not a known shell asset — precache is an allowlist",
    });
  }

  const total = urls.reduce((n, u) => n + sizeOf(u), 0);
  const kib = (total / 1024).toFixed(2);

  console.log(`precache: ${urls.length} entries, ${kib} KiB`);
  for (const u of urls) console.log(`  ${(sizeOf(u) / 1024).toFixed(2).padStart(8)} KiB  ${u}`);

  // ---- negative control -------------------------------------------------
  // Same extractor, a manifest with one planted entry per forbidden prefix.
  // This must find all of them; if it finds none, the extractor silently
  // matches nothing and the real assertion above was vacuous.
  //
  // `games/2048/index.html` is planted alongside them because it is the entry
  // the OLD basename matcher accepted: its basename is `index.html`, which is
  // on the allowlist. If this script is ever reverted to matching basenames,
  // this control is what says so.
  const PLANTED = [
    ...KNOWN_BAD.map((f, i) => `assets/${f.prefix}PLANTED${i}.js`),
    "games/2048/index.html",
    "en/games/snake/index.html",
  ];
  const planted = `precacheAndRoute([${PLANTED.map(
    (u) => `{url:"${u}",revision:null}`,
  ).join(",")}]);`;
  const controlUrls = extractPrecacheUrls(planted);
  const controlHits = controlUrls.filter((u) => !ALLOWED.some((a) => a.re.test(rel(u))));
  const controlOk = controlHits.length === PLANTED.length;
  console.log(
    `negative control: rejected ${controlHits.length}/${PLANTED.length} planted entries` +
      ` — ${controlOk ? "FIRES (gate is live)" : "DEAD"}`,
  );
  if (!controlOk) {
    console.error("FAIL  the matcher did not fire on planted entries. Every result above is void.");
    process.exit(1);
  }
  // -----------------------------------------------------------------------

  if (violations.length > 0) {
    console.error(`\nFAIL  ${violations.length} chunk(s) precached that must not be:`);
    for (const v of violations)
      console.error(`  ${v.url}\n    ${v.why} — add it to globIgnores`);
    process.exit(1);
  }

  console.log("\nOK  precache holds shell assets only.");

  // The other delivery path. Runs last so its failure is the last thing printed.
  checkIndexHtml();
}

main();
