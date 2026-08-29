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

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

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
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

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

  /* ── The hop the HTML walk cannot make ───────────────────────────────────
     Everything above follows HTML -> assets, and that stops EXACTLY ONE HOP
     SHORT OF THE GAMES. A game chunk is never named in a document; it is named
     inside the shell chunk's own dependency map, so `game-bubbles-*.js` can be
     404 while every page and every asset a page names is 200. On 2026-08-08
     that was briefly true of two games - a child tapping bubbles or coloring
     got the error card - and this gate was green over it. Same shape as the
     outage it was written for, moved one level down.

     Following the dep map would fix those two hops and leave the next one, so
     this asserts the whole build instead: every artifact in dist/ must be
     fetchable. It cannot miss a hop because it does not count hops.

     Two deliberate exclusions. Documents are covered by the reference walk
     above and by assert-crawlable.mjs, which fetches all 48 as Googlebot.
     Dotfiles must NOT be fetchable - `.htaccess` is configuration, and a 200
     on it would be a finding in the opposite direction. */
  /* Compared by CONTENT HASH, not by "is it 200 and non-empty".

     A truncated transfer that stops at 80% is 200 with a plausible length, and
     a JS chunk missing its tail is a syntax error at import time - which leaves
     the game showing the same error card as a 404 while every status-code check
     passes. Length alone cannot see it; only the bytes can.

     It also closes a question no URL check could otherwise answer. Driving the
     live site in a browser proves the code EXECUTES, but a browser that has
     visited before serves those bytes from its own HTTP cache, so it cannot
     prove a FIRST visitor gets working code - and clearing the service worker
     does not clear that cache (measured 2026-08-08: 8 of 8 resources still came
     from cache after a full unregister-and-delete). Byte equality is the bridge:
     if the network serves exactly what was built, then "the cached bytes
     execute" and "the network bytes execute" are the same claim. */
  for (const file of distArtifacts()) {
    const res = await get(`${SITE}${BASE}${file}`, { asText: false });
    if (res.status !== 200) {
      failures.push(`${file}  HTTP ${res.status || "transport"} - built and NOT SERVED`);
      continue;
    }
    const want = sha256(readFileSync(join(DIST, file)));
    const got = sha256(res.body);
    if (want !== got) {
      failures.push(
        `${file}  200 but the bytes differ from the build` +
          `  (built ${want.slice(0, 12)} ${readFileSync(join(DIST, file)).length}B,` +
          ` served ${got.slice(0, 12)} ${res.body.length}B)`,
      );
    }
  }

  /* The 301s that carry the old English URLs.

     On 2026-08-14 English took the bare URLs and `dist/en/` stopped being
     emitted, so every `/en/...` address Google had indexed now depends entirely
     on two RewriteRules in `deploy/hostinger.htaccess`. Nothing verified them:
     `assert-crawlable.mjs` walks the sitemap and `/en/` is not in it, and the
     checks above walk `dist/`, which no longer contains that directory. If
     mod_rewrite were unavailable or the file were not uploaded, those URLs would
     404 and every gate in this repo would stay green while the site threw away
     the only ranking it had.

     Primary host only. The GitHub Pages copy runs nginx and never reads an
     .htaccess, so asserting there would fail for a reason that is not a defect. */
  if (BASE === "/") {
    const redirects = [
      ["/en/", "/"],
      ["/en/games/snake/", "/games/snake/"],
      ["/en", "/"], // the slashless form - DirectorySlash no longer covers it

      /* The removed game. `sortsize` shipped 2026-08-02, was indexed in every
         locale, and was deleted deliberately on 2026-08-14 (0207a33). It is
         asserted here for the same reason the /en/ rules above are: the whole
         behaviour lives in a RewriteRule, `dist/` has never contained the
         directory, and the sitemap has never listed it - so every other gate in
         this repo is green whether these fire or not.

         Worth the lines because the URLs were not worthless: the 2026-08-21
         Pages export has /en/games/sortsize/ at POSITION 8. Each locale keeps
         its own shelf; a Hebrew reader must not land on English. */
      ["/games/sortsize/", "/games/kids/"],
      ["/en/games/sortsize/", "/games/kids/"],
      ["/he/games/sortsize/", "/he/games/kids/"],
      ["/es/games/sortsize/", "/es/games/kids/"],
      ["/fr/games/sortsize/", "/fr/games/kids/"],
    ];
    for (const [from, to] of redirects) {
      const res = await raw(`${SITE}${from}`);
      const loc = res.location || "";
      if (res.status !== 301) {
        failures.push(
          `${from}  HTTP ${res.status || "transport"}, expected 301 to ${to}` +
            " - the .htaccess redirect is not firing, and every old English URL is lost",
        );
      } else if (new URL(loc, SITE).pathname !== to) {
        failures.push(`${from}  301 but to ${loc}, expected ${to}`);
      }
    }
    /* The control, and the reason the loop above is evidence rather than
       decoration. A checker that reported "redirects" for everything - a broken
       matcher, a follow-by-default fetch, a host answering 301 to all - would
       pass every assertion above while proving nothing. So assert the opposite
       reading is reachable: a live English page must answer 200, NOT a redirect.
       Without this the whole block can pass vacuously. */
    const live = await raw(`${SITE}/games/snake/`);
    if (live.status !== 200) {
      failures.push(
        `/games/snake/  HTTP ${live.status || "transport"}, expected 200` +
          (live.status === 301
            ? ` - a redirect HERE would send every English reader to ${live.location}`
            : ""),
      );
    } else {
      notes.push(`/en/ 301s to the bare URLs, and /games/snake/ still answers 200`);
    }

    /* The NEAR-MISS control for the sortsize rules, and the only thing that
       proves they are anchored. `/games/sort/` is a real, live game whose path
       is a strict prefix of the dead one; a rule written without the `$` - or
       with the letters unanchored - would swallow it and 301 a working page to
       a category listing, which no assertion above can see because they all
       expect a redirect. So assert the OPPOSITE reading on the closest URL the
       pattern must not touch.

       The second arm is the tail: a pattern ending in the letters rather than
       the boundary would catch anything that merely starts with them. */
    for (const [path, want] of [
      ["/games/sort/", 200], // the live neighbour the pattern must miss
      ["/games/sortsizes/", 404], // one letter past the anchor
    ]) {
      const r = await raw(`${SITE}${path}`);
      if (r.status !== want) {
        failures.push(
          `${path}  HTTP ${r.status || "transport"}, expected ${want}` +
            (r.status === 301
              ? ` - the sortsize rule is not anchored and is eating ${path} -> ${r.location}`
              : ""),
        );
      }
    }

    /* The www mirror, added 2026-08-20. Search Console showed five of the
       thirteen "Crawled - currently not indexed" URLs were www.ellaz.fun, which
       answered 200 rather than redirecting - so Google was crawling a second
       host it will never index. Same failure shape as the /en/ rule above: it
       lives entirely in a RewriteRule, and nothing in dist/ can see whether it
       fired.

       Its control is already two lines up, and the pair is unusually tight: the
       apex /games/snake/ must answer 200 while the www copy of the SAME path
       must 301. One path, two hosts, opposite readings - a checker that cannot
       tell them apart fails one of the two.

       Skipped when SITE_URL is already a www host, because then there is no
       mirror to test and the string surgery below would build www.www. */
    const apex = new URL(SITE);
    if (!apex.host.startsWith("www.")) {
      const wwwSite = `${apex.protocol}//www.${apex.host}`;
      const w = await raw(`${wwwSite}/games/snake/`);
      if (w.status !== 301) {
        failures.push(
          `${wwwSite}/games/snake/  HTTP ${w.status || "transport"}, expected 301` +
            " - the www mirror is serving pages, so Google is crawling two hosts",
        );
      } else {
        const to = new URL(w.location, wwwSite);
        if (to.host !== apex.host || to.pathname !== "/games/snake/") {
          failures.push(
            `www/games/snake/  301 but to ${w.location}, expected ${SITE}/games/snake/`,
          );
        } else {
          notes.push(`www 301s to the canonical host`);
        }
      }
    }
  }

  return { failures, notes, count: wanted.size };
}

/** One fetch that does NOT follow redirects, so a 301 is observable as a 301. */
async function raw(url) {
  try {
    const res = await fetch(url, { redirect: "manual", cache: "no-store" });
    return { status: res.status, location: res.headers.get("location") || "" };
  } catch (err) {
    return { status: 0, location: "", error: String(err) };
  }
}

/** Every built artifact that the host is expected to serve, dist-relative. */
function distArtifacts() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue; // config, not content
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (!e.name.endsWith(".html")) out.push(relative(DIST, p).split(sep).join("/"));
    }
  };
  walk(DIST);
  return out.sort();
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
