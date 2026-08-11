#!/usr/bin/env node
/**
 * The first visit has a byte budget, and this is what enforces it.
 *
 * WHY THIS EXISTS. The plan carried a 76,000 B gz ceiling from the day the
 * payload work started, and nothing ever read it. `assert-first-visit.mjs`
 * checks WHICH assets a first visit fetches - shell only, no game chunks, no
 * lab, no analytics - and that check is good and stays. It has never counted
 * bytes. So the payload went 69,624 -> 72,984 -> 74,290 -> 79,489 with every
 * step honestly measured, honestly reported, and completely unstoppable,
 * because a number in a document cannot fail a build.
 *
 * That is the same shape as the 21 approved thumbnails that sat unshipped for
 * four days: a commitment written in prose, owned by no task, read by no check.
 *
 * WHAT IT COUNTS. Every script and stylesheet `index.html` fetches eagerly,
 * plus `index.html` itself, gzipped - which is what a browser actually pulls
 * before a child can choose a game. Not the precache manifest (the service
 * worker fetches that in the background, after paint) and not lazy chunks.
 *
 * RAISING THE CEILING IS ALLOWED AND IS SUPPOSED TO BE DELIBERATE. Edit
 * `CEILING` here, in a commit, with a reason. That is the whole point: the
 * number becomes a decision with a diff instead of a drift nobody sees.
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = process.env.DIST_DIR || "dist";

/**
 * The base this build was made for, read from the artifact rather than from the
 * environment - the same `distBase()` as `assert-first-visit.mjs`, deliberately,
 * because two gates reading the same `dist/` must not disagree about what it is.
 *
 * This gate shipped without it and failed the Pages build on its first run: under
 * `/ellaz/` the document references `/ellaz/assets/shell-*.js` while the file on
 * disk is `dist/assets/shell-*.js`, so stripping only the leading slash looked
 * for `ellaz/assets/...` and found nothing. Loudly, which is the one good part -
 * a gate that had quietly counted zero bytes would have passed.
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

/**
 * Bytes, gzipped, for a first visit.
 *
 * 86,000 as of 2026-08-07 (was 82,000). History, so the next person raising it
 * can see what they are joining:
 *   69,624  2026-08-02  live baseline after the payload work
 *   72,984  2026-08-04  the app moved onto real URLs (page-* runtime)
 *   74,290  2026-08-06  the theme layer, carrying a second complete value set
 *   79,489  2026-08-07  21 drawn game scenes (~3.5 KB) + the boards work
 *   80,345  2026-08-07  the boards redesign (+302)
 *
 * THE ARGUMENT FOR THE 4 KB, because the line above this one asks for one.
 *
 * A commit-level sweep of all 60 commits since the 2026-08-02 baseline, one
 * extractor and one env throughout, attributes the growth precisely rather than
 * approximately. Every delta below is measured, not estimated:
 *
 *   +4,624  090fe08  the game drawings  <- measured against its DIRECT parent
 *   +1,762  04bfd6d  cloud backup
 *   +1,332  4777ce8  the name pool
 *     +498  9b3a7c8  restore and undo
 *     +302  c360bdb  the boards redesign
 *     +179  657dbb8  the two themes
 *   -2,551           the pages + chunking work GAVE BACK
 *
 * The "~3.5 KB" above is right and now sharper: emptying the ART map at HEAD,
 * with the module shape and every export preserved, moves the first visit
 * 80,345 -> 76,465. The drawings cost 3,880 B gz, 4.8% of everything a child
 * fetches before choosing a game. They are also above the fold on the one
 * screen every session starts on, so deferring them buys bytes and spends a
 * visible emoji-to-art flash on the primary surface.
 *
 * Why 4 KB and not less: the six measured deltas run 179 to 4,624, a 26x
 * spread. 4,000 B is FOUR median-sized features (median 915) or ONE art-sized
 * one. It is not "three features" - quoting the mean over that spread would be
 * a forecast the data does not support.
 *
 * Why it is safe in absolute terms: the researched initial-shell budget for
 * this class of app is 130-170 KB gz on low-end Android over 4G. At ~80 KB the
 * site sits at roughly half.
 *
 * The unit is Node zlib at its default level, which is what `gzBytes` below
 * uses. It is exact and consistent, and it is a PROXY for wire bytes rather
 * than wire bytes: the same four assets fetched live and compressed with system
 * `gzip -9` measure 79,812, and what the server negotiates is its own business.
 * Compare like with like - never a number from here against one from elsewhere.
 *
 * The tightness above was deliberate and it stays deliberate: 5,655 B of
 * headroom is one art-sized feature, and the next one still has to be argued
 * for here.
 *
 * 2026-08-11: 86,000 -> 88,000. The argument, since this file demands one.
 *
 * `/` used to ship a 29-byte body - `<div id="root"></div>` and nothing else.
 * Googlebot renders JavaScript so it eventually saw the grid, but no answer
 * engine does: Vercel's analysis of 500M+ GPTBot fetches found zero JavaScript
 * execution, ClaudeBot and PerplexityBot behave the same, and Anthropic's own
 * docs say their fetch tool does not support JS-rendered sites. So the site's
 * canonical entry, the x-default target and the most-linked page on the site
 * was a blank page to ChatGPT, Claude, Perplexity and Copilot, while `/en/` -
 * an emitted document - was fine. Months, invisible, on the Hebrew-first half.
 *
 * The fix emits the real Hebrew home ahead of #root. Measured cost of the whole
 * change: 84,883 -> 86,653, so 1,770 B gz for 130 words, an h1 and 22 crawlable
 * links on the one page that had none. That is the single best byte-for-reach
 * trade this project has made; the art map cost 3,880 B to make the grid pretty.
 *
 * 88,000 restores ~1.3 KB of headroom, which is deliberately still tight - it is
 * one median feature (915 B), not an art-sized one. The next one still has to be
 * argued for here, exactly as before.
 *
 * Not spent on: `DOCUMENT_CSS`. The emitted home is plain semantic markup styled
 * by a dozen lines already in the shell stylesheet, because inlining the ~300
 * document CSS lines onto the one page that IS the first visit would have cost
 * several times what the content did.
 */
const CEILING = 88_000;

function gzBytes(path) {
  return gzipSync(readFileSync(path)).length;
}

const indexPath = join(DIST, "index.html");
if (!existsSync(indexPath)) {
  console.error(`assert-payload: no ${indexPath} - run the build first.`);
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);

// A first visit that fetches NOTHING is a broken build, not a tiny one. Without
// this the whole gate passes vacuously on an empty index.html - which is the
// failure mode of every check that measures an absence.
if (refs.length === 0) {
  console.error("assert-payload: index.html references no js or css. Refusing to pass.");
  process.exit(1);
}

const rows = [];
let total = gzBytes(indexPath);
rows.push([total, "index.html"]);

for (const ref of refs) {
  const path = join(DIST, rel(ref));
  if (!existsSync(path)) {
    console.error(`assert-payload: index.html references ${ref}, which is not in ${DIST}.`);
    process.exit(1);
  }
  const size = gzBytes(path);
  total += size;
  rows.push([size, ref]);
}

rows.sort((a, b) => b[0] - a[0]);
for (const [size, name] of rows) {
  console.log(`  ${String(size).padStart(7)} B gz  ${name}`);
}

const pct = Math.round((total / CEILING) * 100);
console.log(`\nfirst visit: ${total.toLocaleString()} B gz of ${CEILING.toLocaleString()} (${pct}%)`);

if (total > CEILING) {
  console.error(
    `\nFAIL  first visit is ${(total - CEILING).toLocaleString()} B gz over the ceiling.\n` +
      `      Either make it smaller, or raise CEILING in scripts/assert-payload.mjs\n` +
      `      in this commit with a reason. Do not raise it silently.`,
  );
  process.exit(1);
}

console.log(`OK  first visit is within budget (${(CEILING - total).toLocaleString()} B gz spare).`);
