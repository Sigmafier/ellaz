#!/usr/bin/env node
/* Does the LIVE site serve the build we just made?
   ===========================================================================

   Every other gate in this repo reads `dist/`. `assert-crawlable.mjs` reads the
   network but only asks "does a crawler get a page". Neither can see the one
   failure that has actually taken this site down: a deploy that reports success
   while transferring only some of the files.

   The symptom is specific and it is invisible from every check we had. The
   documents all return 200 - they are the OLD documents, or the NEW ones - and
   the hashed JS they reference returns 404. A browser gets a blank screen. A
   status-code sweep over the routes reports a perfectly healthy site, which is
   exactly what it did on 2026-08-08 while ellaz.fun was blank.

   So this asserts the thing that actually matters, and it is a stronger claim
   than "the site is up":

       the asset set the LIVE html references == the asset set the LOCAL
       dist html references, AND every one of them is fetchable.

   Equality is the load-bearing half. "Every asset 200s" is satisfied by a site
   that is entirely stale - the old html and the old assets are consistent with
   each other, and nothing of this deploy arrived. Only comparing against the
   dist we just built distinguishes "the site works" from "my build is live",
   and a deploy gate that cannot tell those apart is not a deploy gate.

   Node built-ins only, like assert-crawlable.mjs: a check that must install 400
   packages before it can tell you the site is down fails for its own reasons. */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/* SITE_URL is an ORIGIN, and BASE_PATH is separate from it, because the two
   hosts differ in exactly that way: ellaz.fun serves from `/`, the Pages copy
   from `/ellaz/`. Folding the base into the origin would double it - the html
   already contains base-prefixed asset paths, so `${origin}/${asset}` is
   correct only when the origin carries no path of its own. */
const SITE = (process.env.SITE_URL || "https://ellaz.fun").replace(/\/+$/, "");
const BASE = `/${(process.env.BASE_PATH || "/").replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
const DIST = process.env.DIST_DIR || "dist";

/* Neither host is instantaneous. Hostinger's FTP write and its web tier are not
   in lockstep, and GitHub Pages can take a minute to propagate an artifact. A
   gate that reds on propagation gets ignored within a week, and an ignored gate
   is the same as no gate - which is what this whole file exists to fix. So the
   checks are retried before failing, and only the LAST attempt is reported. */
const ATTEMPTS = Number(process.env.LIVE_ATTEMPTS || 5);
const SETTLE_MS = Number(process.env.LIVE_SETTLE_MS || 15000);

/* The routes worth checking are the ones that BOOT THE APP, and they are worth
   checking because they mount DIFFERENT chunks: `/` is the shell, a game page
   additionally pulls the page runtime and that game's own chunk, so a game page
   is how we learn the lazy chunks landed too. World and boards ride the same
   page runtime and are cheap.

   `/en/` and the 42 prose pages are deliberately NOT here. They carry no hashed
   assets at all - they are emitted documents with real links and no React
   island - so they can prove nothing about a build landing, and including one
   would make the "this page references no assets" guard below fire on a page
   that is correct. Their integrity is assert-pages.mjs's job.

   This is NOT a fourth "which pages boot the app" list, and must not become
   one: there are already three (build.test.ts, assert-pages.mjs, and the
   runtime's own switch in pageContext.ts) and CLAUDE.md names adding another as
   a trap. This is a sample, not an enumeration - it needs one of each KIND. */
const ROUTES = ["/", "/games/snake/", "/world/", "/boards/"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** dist path for a route. "/games/snake/" -> dist/games/snake/index.html */
function localFile(route) {
  return join(DIST, route === "/" ? "index.html" : `${route.replace(/^\/|\/$/g, "")}/index.html`);
}

/* Only hashed build output. Not every href - the pages are full of internal
   links, and a link check is assert-pages.mjs's job, not this one. */
const ASSET_RE = /(?:src|href)\s*=\s*"([^"]*\bassets\/[A-Za-z0-9_.-]+\.(?:js|css))"/g;

function assetsIn(html) {
  const out = new Set();
  for (const m of html.matchAll(ASSET_RE)) {
    // Normalise away a leading "/" or "./" so local and live compare equal.
    out.add(m[1].replace(/^\.?\//, ""));
  }
  return out;
}

/** One transport retry. A single flaky socket must not read as an outage. */
async function get(url, { asText = true } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        cache: "no-store",
        headers: { "cache-control": "no-cache", pragma: "no-cache" },
      });
      const body = asText ? await res.text() : Buffer.from(await res.arrayBuffer());
      return { status: res.status, body, type: res.headers.get("content-type") || "" };
    } catch (err) {
      if (attempt === 1) return { status: 0, body: "", type: "", error: String(err) };
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/* Cache-buster on DOCUMENTS only. Hashed assets are immutable by construction,
   and a query string on them would measure a different cache key than the one a
   real browser asks for - which is the wrong object. Documents are the ones an
   edge cache can hold stale, so those get the buster. */
const bust = () => `_cb=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function runChecks() {
  const failures = [];
  const notes = [];
  const wanted = new Set();

  for (const route of ROUTES) {
    const file = localFile(route);
    if (!existsSync(file)) {
      failures.push(`${route}  no local ${file} - route table and dist disagree`);
      continue;
    }
    const local = assetsIn(readFileSync(file, "utf8"));
    if (local.size === 0) {
      // A page that references no build output cannot prove anything, and a
      // silently-empty expectation is how a gate passes over a dead site.
      failures.push(`${route}  local html references NO hashed assets - the extractor is broken, not the site`);
      continue;
    }

    const url = `${SITE}${BASE}${route.replace(/^\//, "")}?${bust()}`;
    const res = await get(url);
    if (res.status !== 200) {
      failures.push(`${route}  HTTP ${res.status || "transport"} ${res.error || ""}`.trim());
      continue;
    }

    const live = assetsIn(res.body);
    const missing = [...local].filter((a) => !live.has(a));
    const extra = [...live].filter((a) => !local.has(a));

    if (missing.length || extra.length) {
      failures.push(
        `${route}  LIVE HTML IS NOT THIS BUILD\n` +
          (missing.length ? `        built but not live: ${missing.join(", ")}\n` : "") +
          (extra.length ? `        live but not built: ${extra.join(", ")}` : ""),
      );
    } else {
      notes.push(`${route}  ${local.size} asset ref(s) match the build`);
    }

    for (const a of live) wanted.add(a);
    for (const a of local) wanted.add(a);
  }

  /* Now the half that the outage was: every asset the live html POINTS AT must
     actually be fetchable. A 404 here with everything above green means the
     documents landed and their chunks did not - a blank page. */
  for (const asset of [...wanted].sort()) {
    const res = await get(`${SITE}/${asset}`, { asText: false });
    if (res.status !== 200) {
      failures.push(`${asset}  HTTP ${res.status || "transport"} - referenced by the live site and NOT SERVED`);
    } else if (res.body.length === 0) {
      failures.push(`${asset}  200 but zero bytes - a truncated transfer`);
    }
  }

  /* Two files that are not assets and would each be their own silent outage:
     the service worker (a 404 leaves returning visitors on a stale cache
     forever) and the sitemap (the thing this whole week was about). */
  const sw = await get(`${SITE}${BASE}sw.js`);
  if (sw.status !== 200) failures.push(`sw.js  HTTP ${sw.status || "transport"}`);
  else if (!/precache|workbox|self\./i.test(sw.body)) failures.push("sw.js  200 but does not look like a service worker");

  /* Only the primary host emits a sitemap - the Pages copy deliberately ships
     none, and a Disallow: / robots.txt, so that the two hosts do not compete
     for the same canonical. Asserting one there would fail correctly-built
     output. */
  if (existsSync(join(DIST, "sitemap.xml"))) {
    const sm = await get(`${SITE}${BASE}sitemap.xml`);
    if (sm.status !== 200) failures.push(`sitemap.xml  HTTP ${sm.status || "transport"}`);
    else if (!sm.body.trimStart().startsWith("<?xml")) {
      failures.push(`sitemap.xml  200 but the body is not XML - starts "${sm.body.trimStart().slice(0, 40)}"`);
    }
  }

  return { failures, notes, count: wanted.size };
}

async function main() {
  if (!existsSync(DIST)) {
    console.error(`FAIL  no ${DIST}/ - build before verifying, or set DIST_DIR`);
    process.exit(1);
  }

  let result;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    result = await runChecks();
    if (result.failures.length === 0) break;
    if (attempt < ATTEMPTS) {
      console.log(`...  attempt ${attempt}/${ATTEMPTS} found ${result.failures.length} problem(s) - waiting ${SETTLE_MS / 1000}s for propagation`);
      await sleep(SETTLE_MS);
    }
  }

  for (const n of result.notes) console.log(`ok    ${n}`);
  if (result.failures.length) {
    console.error(`\nFAIL  ${SITE}${BASE} is not serving ${DIST}/  (after ${ATTEMPTS} attempts)\n`);
    for (const f of result.failures) console.error(`      ${f}`);
    console.error(
      "\n      A green deploy is not a changed website. If the upload reported success,\n" +
        "      suspect an incremental sync trusting a stale server-side ledger.\n" +
        "      See .claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md\n",
    );
    process.exit(1);
  }
  console.log(`\nOK    ${SITE}${BASE} serves this build - ${result.count} assets verified across ${ROUTES.length} routes`);
}

main().catch((err) => {
  console.error(`FAIL  ${err?.stack || err}`);
  process.exit(1);
});
