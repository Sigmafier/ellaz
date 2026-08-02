#!/usr/bin/env node
// Assert that the PWA precache manifest contains only shell assets.
//
// Run after `npm run build`:  node scripts/assert-precache.mjs
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

/** Chunks that must never reach a first visit. Prefix is a build contract. */
const FORBIDDEN = [
  { prefix: "game-", why: "per-game chunk — runtime-cached on first play" },
  { prefix: "vendor-analytics-", why: "PostHog — deferred past first paint" },
  { prefix: "vendor-phaser-", why: "engine for one game — runtime-cached" },
  { prefix: "lab-", why: "dev-only Juice Lab — nothing links to it" },
];

const basename = (url) => url.slice(url.lastIndexOf("/") + 1);

function sizeOf(url) {
  try {
    return statSync(join(DIST, url)).size;
  } catch {
    return 0; // revisioned entries like index.html always exist; be forgiving.
  }
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
    const name = basename(url);
    const hit = FORBIDDEN.find((f) => name.startsWith(f.prefix));
    if (hit) violations.push({ url, ...hit });
  }

  const total = urls.reduce((n, u) => n + sizeOf(u), 0);
  const kib = (total / 1024).toFixed(2);

  console.log(`precache: ${urls.length} entries, ${kib} KiB`);
  for (const u of urls) console.log(`  ${(sizeOf(u) / 1024).toFixed(2).padStart(8)} KiB  ${u}`);

  // ---- negative control -------------------------------------------------
  // Same extractor, a manifest with one planted entry per forbidden prefix.
  // This must find all of them; if it finds none, the extractor silently
  // matches nothing and the real assertion above was vacuous.
  const planted = `precacheAndRoute([${FORBIDDEN.map(
    (f, i) => `{url:"assets/${f.prefix}PLANTED${i}.js",revision:null}`,
  ).join(",")}]);`;
  const controlUrls = extractPrecacheUrls(planted);
  const controlHits = controlUrls.filter((u) =>
    FORBIDDEN.some((f) => basename(u).startsWith(f.prefix)),
  );
  const controlOk = controlHits.length === FORBIDDEN.length;
  console.log(
    `negative control: extractor found ${controlHits.length}/${FORBIDDEN.length} planted entries` +
      ` — ${controlOk ? "FIRES (matcher is live)" : "DEAD"}`,
  );
  if (!controlOk) {
    console.error("FAIL  the matcher did not fire on planted entries. Every result above is void.");
    process.exit(1);
  }
  // -----------------------------------------------------------------------

  if (violations.length > 0) {
    console.error(`\nFAIL  ${violations.length} chunk(s) precached that must not be:`);
    for (const v of violations) console.error(`  ${v.url}\n    ${v.why} — add it to globIgnores`);
    process.exit(1);
  }

  console.log("\nOK  precache holds shell assets only.");
}

main();
