#!/usr/bin/env node
/**
 * The reach board as a PUBLISHED artifact: `dist-reach/`, deployed to Cloudflare
 * Pages and put behind Cloudflare Access.
 *
 * WHY IT IS ITS OWN SITE AND NOT A PATH ON ellaz.fun. Four gates here would have
 * had to learn about it - the PWA `globIgnores` (whose `**\/*.html` glob would
 * precache it into every child's phone), `assert-pages.mjs`'s sitemap bijection,
 * `assert-first-visit.mjs`'s full-path matcher, and `assert-live.mjs`, which
 * asserts every artifact in `dist/` is FETCHABLE and would therefore red on a
 * page that correctly answers 401. A private board inside a public site is four
 * arguments with four gates that are each right; beside it, it is none.
 *
 * A SUBDOMAIN WOULD NOT HAVE HIDDEN IT EITHER. A subdomain is a separate site,
 * crawled and indexed like any other, and every TLS certificate is published to
 * public Certificate Transparency logs - so the NAME is discoverable whether or
 * not anyone links to it. Isolation is real; invisibility is not. The privacy
 * comes from Cloudflare Access, and only from there.
 *
 * SO THE THREE THINGS IN THIS FILE THAT LOOK LIKE BELT AND BRACES ARE THE
 * BRACES. `noindex` in the page, `Disallow: /` in robots.txt, `X-Robots-Tag` in
 * `_headers`: every one of them is unreachable while Access is on, because a
 * crawler never gets past the login. They exist for the window in which Access
 * is off - misconfigured, removed, or not yet applied on the very first deploy -
 * which is the only window in which anything here is exposed at all.
 *
 * IT NEVER EXITS 1 ON A DEAD LINK. `backlinks.mjs` does, and should: that is a
 * gate. This is a PUBLISHER, and a board is most worth publishing on precisely
 * the day a link died. Refusing to build then would take the report away at the
 * moment it has something to say.
 *
 * Usage:
 *   node scripts/reach/build-reach-site.mjs             # re-check, then build
 *   node scripts/reach/build-reach-site.mjs --offline   # build from the record
 *   node scripts/reach/build-reach-site.mjs --control   # prove it can refuse
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gscExported, html, loadRecord, parseRows, pointsAtUs, resolve1 } from "./backlinks.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/backlinks.md");
const OUT = join(REPO, "dist-reach");

/** `Disallow: /` is honest here in a way it is not on ellaz.fun: this hostname
 *  advertises no path anybody wanted kept quiet, so the file publishes nothing. */
const ROBOTS = "User-agent: *\nDisallow: /\n";
const HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n";

export async function buildPages(md, rec, { offline = false, fetchImpl = fetch } = {}) {
  const rows = parseRows(md);
  // An empty parse is the shape that publishes a blank board OVER a real one and
  // reads as "nothing to report". Refuse, the same way the checker does.
  if (!rows.length) throw new Error("build-reach-site: the table parsed to ZERO rows - refusing to publish an empty board.");
  const out = [];
  for (const r of rows) {
    const probe = offline ? { ok: null, why: "offline" } : await pointsAtUs(r.url, fetchImpl);
    out.push(resolve1(r, probe, rec.seen));
  }
  const checked = offline ? (rec.checked ?? "never") : new Date().toISOString().slice(0, 10);
  const page = html(out, gscExported(REPO), checked);
  if (!/noindex/.test(page)) throw new Error("build-reach-site: the page carries no noindex - refusing to publish it.");
  return { rows: out, files: { "index.html": page + "\n", "robots.txt": ROBOTS, "_headers": HEADERS } };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--control")) return control();
  const { rows, files } = await buildPages(readFileSync(SRC, "utf8"), loadRecord(), {
    offline: argv.includes("--offline"),
  });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(OUT, name), body);

  const n = (s) => rows.filter((r) => r.status === s).length;
  console.log(`\npopulation: ${rows.length} row(s) from docs/outreach/backlinks.md`);
  console.log(`board:      ${n("live")} live · ${n("claimed")} claimed · ${n("gone")} gone · ${n("unchecked")} unchecked`);
  const gone = rows.filter((r) => r.status === "gone");
  if (gone.length) console.log(`GONE (published, not hidden): ${gone.map((r) => r.url).join(", ")}`);
  console.log(`wrote:      ${OUT}/{${Object.keys(files).join(",")}}`);
  console.log(`OK  built. It is private only while Cloudflare Access is on it.\n`);
}

/** Each control must be able to produce the OPPOSITE reading, or it tests nothing. */
async function control() {
  const md = readFileSync(SRC, "utf8");
  const rec = { checked: "2026-01-01", seen: {} };
  const cases = [];
  const ok = async (name, fn, want) => {
    let got = "no refusal";
    try { await fn(); } catch (e) { got = e.message; }
    const pass = want === null ? got === "no refusal" : got.includes(want);
    cases.push([pass, name, got.slice(0, 72)]);
  };

  // POSITIVE CONTROL FIRST: without it every refusal below passes vacuously on a
  // builder that refuses everything, which is the failure mode a gate cannot see.
  await ok("a real table builds", () => buildPages(md, rec, { offline: true }), null);
  await ok("an empty table refuses", () =>
    buildPages(md.replace(/\|.*\n/g, ""), rec, { offline: true }), "ZERO rows");
  await ok("a table with no markers refuses", () =>
    buildPages(md.replace("<!-- backlinks:rows -->", ""), rec, { offline: true }), "markers are missing");

  // And the artifact itself, because "it built" says nothing about what is in it.
  const { files } = await buildPages(md, rec, { offline: true });
  const has = (f, re, what) => cases.push([re.test(files[f]), `${f} carries ${what}`, files[f].slice(0, 40)]);
  has("index.html", /noindex/, "noindex");
  has("robots.txt", /Disallow: \/$/m, "Disallow: /");
  has("_headers", /X-Robots-Tag/, "X-Robots-Tag");
  cases.push([!/ellaz\.fun\/games/.test(files["index.html"]), "no ellaz.fun page links leak in", "-"]);

  for (const [pass, name, got] of cases) console.log(`${pass ? "  ok  " : "FAIL  "}${name}${pass ? "" : `  <- ${got}`}`);
  const bad = cases.filter(([p]) => !p).length;
  console.log(bad ? `\n${bad} control(s) FAILED\n` : `\nOK  ${cases.length}/${cases.length} controls behaved\n`);
  process.exit(bad ? 1 : 0);
}

// A guarded entry point: without this, importing anything from here runs the
// whole build and prints ITS verdict into the importer's output.
// .claude/rules/a-script-that-runs-on-import-prints-its-importers-verdict.md
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) main().catch((e) => { console.error(e.message); process.exit(1); });
