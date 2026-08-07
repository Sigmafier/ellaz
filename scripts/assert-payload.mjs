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
 * Bytes, gzipped, for a first visit.
 *
 * 82,000 as of 2026-08-07. History, so the next person raising it can see what
 * they are joining:
 *   69,624  2026-08-02  live baseline after the payload work
 *   72,984  2026-08-04  the app moved onto real URLs (page-* runtime)
 *   74,290  2026-08-06  the theme layer, carrying a second complete value set
 *   79,489  2026-08-07  21 drawn game scenes (~3.5 KB) + the boards work
 * The headroom above 79,489 is deliberate but small: enough that an ordinary
 * change does not trip it, tight enough that another 3 KB has to be argued for.
 */
const CEILING = 82_000;

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
  const path = join(DIST, ref.replace(/^\//, ""));
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
