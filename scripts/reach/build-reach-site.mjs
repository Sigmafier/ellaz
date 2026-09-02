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
 * AND THE ONE-CLICK WAY TO APPLY ACCESS DOES NOT COVER THE PRODUCTION URL. Pages'
 * own "Enable access policy" protects PREVIEW deployments and, in Cloudflare's
 * words, "not your *.pages.dev domain or custom domain". So the deploy publishes to
 * a named BRANCH, whose stable alias is a preview URL. See deploy-reach.yml.
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
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { coverage, gscExported, html, loadRecord, parseRows, pointsAtUs, resolve1, WATCHED } from "./backlinks.mjs";
import { rows as ledgerRows } from "../outreach-ledger.mjs";
import { loadPosts, parsePosts } from "./posts.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/backlinks.md");
const OUT = join(REPO, "dist-reach");
const SERIES = join(REPO, "docs/outreach/exports/series.json");

/**
 * `backlinks.mjs::esc` is not exported, so this is a second copy of the exact
 * same textContent-style escape rather than a raw-HTML shortcut - the board
 * must never trust a byte read from series.json (a hand-edited file) any more
 * than it trusts a URL read from backlinks.md.
 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** UNMEASURED, never a silent 0 - the same law `gsc-performance.mjs` prints by. */
const cell = (v) => (v === null || v === undefined ? "UNMEASURED" : esc(String(v)));

/**
 * `docs/outreach/exports/series.json`, written by `gsc-performance.mjs --series`.
 * Read defensively: a hand-edited or half-written file must not take the whole
 * board down with it, so a parse failure reads exactly like a missing file.
 */
export function loadSeries(repo = REPO) {
  if (!existsSync(SERIES)) return null;
  try {
    const rows = JSON.parse(readFileSync(SERIES, "utf8"));
    return Array.isArray(rows) && rows.length ? rows : null;
  } catch {
    return null;
  }
}

/**
 * "Search, weekly" - the trend the board exists to eventually show, one row per
 * `performance-YYYY-MM-DD/` export. Missing entirely is not an error: the series
 * starts empty and grows one Tuesday at a time (see the README's own section).
 */
export function weeklySearchSection(rows) {
  if (!rows || !rows.length)
    return `<h2>Search, weekly</h2><p class=empty>no export yet. Run
    <code>npm run reach:perf:series</code> after adding a
    docs/outreach/exports/performance-YYYY-MM-DD/ folder.</p>`;
  const win = (r) => (r.firstDay || r.lastDay) ? `${cell(r.firstDay)} .. ${cell(r.lastDay)}` : "UNMEASURED";
  const tr = (r) => `<tr><td>${cell(r.exported)}</td><td>${win(r)}</td>
    <td>${cell(r.clicks)}</td><td>${cell(r.impressions)}</td><td>${cell(r.position)}</td>
    <td>${r.ai ? cell(r.ai.impressions) : "UNMEASURED"}</td></tr>`;
  return `<h2>Search, weekly</h2>
<table class=series>
<thead><tr><th>exported</th><th>window</th><th>clicks</th><th>impressions</th>
<th>position</th><th>AI impressions</th></tr></thead>
<tbody>${rows.map(tr).join("")}</tbody></table>
<style>table.series{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
table.series th,table.series td{padding:6px 8px;text-align:start;border-bottom:1px solid #2b2938}
table.series th{color:var(--dim);text-transform:uppercase;letter-spacing:.06em;font-size:11px}
table.series td{color:var(--fg)}</style>`;
}

/** `Disallow: /` is honest here in a way it is not on ellaz.fun: this hostname
 *  advertises no path anybody wanted kept quiet, so the file publishes nothing. */
const ROBOTS = "User-agent: *\nDisallow: /\n";
const HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n";

export async function buildPages(md, rec, { offline = false, fetchImpl = fetch, surfaces = [], posts = [] } = {}) {
  const rows = parseRows(md);
  // An empty parse is the shape that publishes a blank board OVER a real one and
  // reads as "nothing to report". Refuse, the same way the checker does.
  if (!rows.length) throw new Error("build-reach-site: the table parsed to ZERO rows - refusing to publish an empty board.");
  // And the same argument for the other half, which is the half a person opens this
  // board FOR. A ledger that parses to nothing renders a page saying "0 waiting on
  // you" - not an empty section, a confident all-clear over a table it never read.
  if (!surfaces.length) throw new Error("build-reach-site: ZERO surfaces read from ledger.md - refusing to publish a board that would say there is nothing to do.");
  // AND THE THIRD REFUSAL: a fired surface nothing watches.
  //
  // The coverage gate lives in `backlinks.mjs` and, until this line, only ever ran when
  // a person typed `npm run reach:backlinks` - which is the one condition it cannot
  // rely on, because the gap it catches opens BETWEEN sessions. This is the job that
  // runs daily and on every `docs/outreach/*.md` push, so this is where it belongs.
  //
  // It REFUSES rather than warning, for the same reason the two above do: a banner on
  // a page is exactly the mechanism that let seven fired surfaces sit unwatched for a
  // day. The previous board stays published while this is red, so the cost is a stale
  // board and a daily failing run - which is the alarm, and the fix is one line.
  const cov = coverage(surfaces, rows);
  if (cov.length)
    throw new Error(`build-reach-site: ${cov.length} fired surface(s) have a verdict date and no instrument.\n  ` +
      cov.join("\n  ") +
      "\nAdd a row to docs/outreach/backlinks.md, or an exempt entry naming why no page\n" +
      "could ever carry the link, in WATCHED in scripts/reach/backlinks.mjs.");
  const out = [];
  for (const r of rows) {
    const probe = offline ? { ok: null, why: "offline" } : await pointsAtUs(r.url, fetchImpl);
    out.push(resolve1(r, probe, rec.seen));
  }
  const checked = offline ? (rec.checked ?? "never") : new Date().toISOString().slice(0, 10);
  const page = html(out, gscExported(REPO), checked, surfaces, posts) + weeklySearchSection(loadSeries(REPO));
  if (!/noindex/.test(page)) throw new Error("build-reach-site: the page carries no noindex - refusing to publish it.");
  return { rows: out, files: { "index.html": page + "\n", "robots.txt": ROBOTS, "_headers": HEADERS } };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--control")) return control();
  const surfaces = ledgerRows(REPO);
  // The posts follow the LEDGER's order, not the folder's, so the text for the
  // surface at the top of do-next is the first one a thumb reaches.
  const posts = loadPosts(REPO, [...new Set(surfaces.filter((s) => s.who === "you").map((s) => s.file))]);
  const { rows, files } = await buildPages(readFileSync(SRC, "utf8"), loadRecord(), {
    offline: argv.includes("--offline"),
    surfaces, posts,
  });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(join(OUT, name), body);

  const n = (s) => rows.filter((r) => r.status === s).length;
  console.log(`\npopulation: ${rows.length} row(s) from docs/outreach/backlinks.md`);
  console.log(`links:      ${n("live")} live · ${n("claimed")} claimed · ${n("gone")} gone · ${n("unchecked")} unchecked`);
  const w = (x) => surfaces.filter((s) => s.who === x).length;
  console.log(`surfaces:   ${surfaces.length} from ledger.md · ${w("you")} waiting on you · ${w("wait")} on a clock · ${w("last")} held back · ${w("done")} closed`);
  console.log(`watched:    ${WATCHED.size} fired surface(s) mapped · ` +
    `${[...WATCHED.values()].filter((v) => v === null).length} exempt with a reason`);
  const np = posts.reduce((a, f) => a + f.posts.length, 0);
  console.log(`posts:      ${np} readable from ${posts.length} draft(s) · ` +
    posts.map((f) => `${f.file} ${f.posts.length}/${f.declared}`).join(" · "));
  // A post with no destination and no instruction renders as a wall of Hebrew with
  // nowhere to put it. Printed, never inferred - guessing a room from a post's tone
  // is exactly the "suggested fix read as an instruction" shape.
  const thin = posts.flatMap((f) => f.posts).filter((x) => !x.go || !x.do);
  if (thin.length) console.log(`NO Go/Do: ${thin.map((x) => x.heading).join(" · ")} - add **Go**: <url> and **Do**: <one line> to the draft`);
  const unread = posts.filter((f) => f.declared > f.posts.length);
  if (unread.length) console.log(`UNREADABLE POST BODIES: ${unread.map((f) => f.file).join(", ")} - published as a note, not dropped`);
  const mute = surfaces.filter((s) => s.who !== "done" && !s.next.trim());
  if (mute.length) console.log(`NO INSTRUCTION: ${mute.map((s) => s.surface).join(", ")} - the board will say so rather than invent one`);
  const gone = rows.filter((r) => r.status === "gone");
  if (gone.length) console.log(`GONE (published, not hidden): ${gone.map((r) => r.url).join(", ")}`);
  console.log(`wrote:      ${OUT}/{${Object.keys(files).join(",")}}`);
  console.log(`OK  built. It is private only while Cloudflare Access is on it.\n`);
}

/** Each control must be able to produce the OPPOSITE reading, or it tests nothing. */
async function control() {
  const md = readFileSync(SRC, "utf8");
  const rec = { checked: "2026-01-01", seen: {} };
  const surfaces = [
    { surface: "A group", file: "hebrew.md", status: "draft", fired: "-", due: "-", notes: "", who: "you", next: "Post it." },
    // NAMED AFTER A REAL WATCHED SURFACE, because the coverage refusal is live in
    // `buildPages` and a fixture surface no `WATCHED` key matches reds every cell
    // below - which is the gate working, and useless as a fixture. Its own control is
    // the `coverageFires` cell at the end, which asserts an UNWATCHED fired surface
    // does refuse. Both directions, or this line silently disarms the third refusal.
    { surface: "awesome-pwa (list PR)", file: "dev.md", status: "fired", fired: "2026-08-12", due: "2026-11-10", notes: "", who: "wait", next: "Nothing to do." },
    { surface: "A dead list", file: "dev.md", status: "dropped", fired: "-", due: "-", notes: "", who: "done", next: "Closed." },
  ];
  const cases = [];
  const ok = async (name, fn, want) => {
    let got = "no refusal";
    try { await fn(); } catch (e) { got = e.message; }
    const pass = want === null ? got === "no refusal" : got.includes(want);
    cases.push([pass, name, got.slice(0, 72)]);
  };

  // POSITIVE CONTROL FIRST: without it every refusal below passes vacuously on a
  // builder that refuses everything, which is the failure mode a gate cannot see.
  await ok("a real table builds", () => buildPages(md, rec, { offline: true, surfaces }), null);
  await ok("an empty table refuses", () =>
    buildPages(md.replace(/\|.*\n/g, ""), rec, { offline: true, surfaces }), "ZERO rows");
  await ok("a table with no markers refuses", () =>
    buildPages(md.replace("<!-- backlinks:rows -->", ""), rec, { offline: true }), "markers are missing");
  // The half a person actually opens this board for. A ledger that parses to nothing
  // renders "0 waiting on you", which is an all-clear rather than an empty section.
  await ok("zero surfaces refuses", () =>
    buildPages(md, rec, { offline: true, surfaces: [] }), "ZERO surfaces");
  // THE THIRD REFUSAL, both directions. The happy-path cell above is the negative:
  // a fixture whose fired surface IS in `WATCHED` builds. This is the positive, and
  // without it renaming that fixture to a watched name silently disarms the gate.
  await ok("a fired surface nothing watches refuses", () =>
    buildPages(md, rec, { offline: true, surfaces: [...surfaces,
      { surface: "A door nobody mapped", file: "dev.md", status: "fired", fired: "2026-08-30", due: "2026-11-28", notes: "", who: "wait", next: "-" }] }),
    "no instrument");
  // And a ledger that parses to fired-nothing is BLIND, not covered - the shape that
  // reports a clean sweep over a table it never read.
  await ok("a ledger with no fired surface at all is BLIND", () =>
    buildPages(md, rec, { offline: true, surfaces: [surfaces[0]] }), "BLIND");

  // And the artifact itself, because "it built" says nothing about what is in it.
  const { files } = await buildPages(md, rec, { offline: true, surfaces });
  const has = (f, re, what) => cases.push([re.test(files[f]), `${f} carries ${what}`, files[f].slice(0, 40)]);
  has("index.html", /noindex/, "noindex");
  has("robots.txt", /Disallow: \/$/m, "Disallow: /");
  has("_headers", /X-Robots-Tag/, "X-Robots-Tag");
  cases.push([!/ellaz\.fun\/games/.test(files["index.html"]), "no ellaz.fun page links leak in", "-"]);
  has("index.html", /1 surface\(s\) waiting on you/, "the do-next count");
  has("index.html", /A group/, "an open surface");
  has("index.html", /<summary>closed/, "a separate closed section");
  // ...and the closed surface appears ONCE. Asserting the section merely EXISTS
  // survives a do-next list that also carries every closed row - the page renders,
  // the heading is there, and the closed work is listed as work to do. (Mutation
  // M3, 2026-08-23: it survived the weaker assertion and was caught by this one.)
  cases.push([(files["index.html"].match(/A dead list/g) ?? []).length === 1,
    "a closed surface is listed once, not in both", `${(files["index.html"].match(/A dead list/g) ?? []).length}x`]);
  // A surface with no instruction must SAY so. Dropping it silently is how a board
  // reports a clean sweep over work nobody wrote down.
  // The fired surface rides along because the coverage refusal's BLIND arm fires on a
  // ledger with no fired row at all - correct against the real ledger, and a fixture
  // artefact here. Dropping the BLIND arm to make this cell pass would remove the one
  // check that stops a broken ledger parse reading as full coverage.
  const mute = await buildPages(md, rec, { offline: true, surfaces: [{ ...surfaces[0], next: "" }, surfaces[1]] });
  cases.push([/no instruction written/.test(mute.files["index.html"]), "a surface with no instruction says so", "-"]);
  // Positive control for that one: with an instruction, the placeholder is absent.
  cases.push([!/no instruction written/.test(files["index.html"]), "...and does not say so when there is one", "-"]);

  // The posts half. Two conventions exist in this folder and both are real; a parser
  // that reads one silently publishes a board with half the work missing.
  const QUOTED = "## Post 1 - a room\n\n**Where**: a group.\n\n> line one\n>\n> line two\n\nprose after.\n";
  const FENCED = "## Post 1 - a sub\n\n**Title**:\n\n```\nT\n```\n\n**Body**:\n\n```\nB one\nB two\n```\n";
  const q = parsePosts(QUOTED, "q.md"), f = parsePosts(FENCED, "f.md");
  cases.push([q.posts.length === 1 && q.posts[0].body === "line one\n\nline two", "the blockquote convention parses", JSON.stringify(q.posts[0]?.body)]);
  cases.push([q.posts[0]?.where === "a group.", "...and its Where line", JSON.stringify(q.posts[0]?.where)]);
  cases.push([f.posts[0]?.title === "T" && f.posts[0]?.body === "B one\nB two", "the fenced convention parses", JSON.stringify(f.posts[0]?.body)]);
  // A declared heading whose body cannot be read must be COUNTED. Dropped, a draft
  // whose format drifts renders as "no posts", which reads as nothing to send.
  const drift = parsePosts("## Post 1 - a room\n\njust prose, no quote and no fence.\n", "d.md");
  cases.push([drift.declared === 1 && drift.posts.length === 0, "a body-less heading is declared, not parsed away", `${drift.declared}/${drift.posts.length}`]);

  const withPosts = await buildPages(md, rec, { offline: true, surfaces, posts: [q] });
  const H = withPosts.files["index.html"];
  // Two claims, split: the TEXT must be on the page, and it must be READABLE
  // rather than only copyable. It shipped `hidden` for one build, which is a card
  // that asks you to paste something you have never seen. (2026-08-29.)
  cases.push([/line one/.test(H), "the page carries the post text", "-"]);
  cases.push([!/<pre[^>]*\bhidden\b/.test(H), "...and it is readable, not copy-only", "-"]);
  cases.push([(H.match(/<pre /g) ?? []).length === (H.match(/<button/g) ?? []).length,
    "every post block has its own copy button", `${(H.match(/<pre /g) ?? []).length} pre / ${(H.match(/<button/g) ?? []).length} button`]);
  const driftPage = await buildPages(md, rec, { offline: true, surfaces, posts: [{ ...q, declared: 3 }] });
  cases.push([/declares 3 and 1 could be read/.test(driftPage.files["index.html"]), "an unreadable body is reported on the page", "-"]);

  // The destination. A name is something to search for; a URL is something to press,
  // and this board is read on a phone.
  const GO = "## Post 1 - a room\n\n**Go**: https://example.test/g/1\n\n**Do**: Read the rules, then post.\n\n> body\n";
  const g = parsePosts(GO, "g.md").posts[0];
  cases.push([g?.go === "https://example.test/g/1", "the Go url parses", JSON.stringify(g?.go)]);
  cases.push([g?.do === "Read the rules, then post.", "the Do line parses", JSON.stringify(g?.do)]);
  const goPage = await buildPages(md, rec, { offline: true, surfaces, posts: [{ file: "g.md", declared: 1, posts: [g] }] });
  cases.push([/<a\b[^>]*href="https:\/\/example\.test\/g\/1"/.test(goPage.files["index.html"]), "a URL Go becomes a real link", "-"]);
  const noRoom = parsePosts(GO.replace("https://example.test/g/1", "none verified yet"), "n.md").posts[0];
  const noRoomPage = await buildPages(md, rec, { offline: true, surfaces, posts: [{ file: "n.md", declared: 1, posts: [noRoom] }] });
  cases.push([/none verified yet/.test(noRoomPage.files["index.html"])
    && !/<a\b[^>]*href="[^"]*none verified/.test(noRoomPage.files["index.html"]),
    "a sentence Go is printed, never linked", "-"]);
  cases.push([parsePosts(GO.replace(/\*\*Do\*\*:.*\n/, ""), "x.md").posts[0]?.do === "",
    "a missing Do is empty, not inherited from a sibling", "-"]);
  cases.push([!/could be read/.test(H), "...and is not reported when every body parsed", "-"]);

  // --- the weekly search section --------------------------------------------
  //
  // Unit-tested against `weeklySearchSection` directly rather than the real
  // series.json, so this control does not depend on - or corrupt - whatever the
  // repo's own export history happens to hold on the day it runs.
  const noSeries = weeklySearchSection(null);
  cases.push([/no export yet/.test(noSeries), "an absent series.json says 'no export yet'", "-"]);
  cases.push([/reach:perf:series/.test(noSeries), "...and names the command that creates one", "-"]);
  const seriesRows = [
    { exported: "2026-08-21", firstDay: "2026-08-04", lastDay: "2026-08-18", days: 13,
      clicks: 8, impressions: 231, position: 33.7, ai: null },
    // a raw < in a field would corrupt the page if this were ever raw HTML - the
    // POSITIVE CONTROL for the escaping half, same shape as `has()` above.
    { exported: "<script>2026-09-02", firstDay: "2026-08-03", lastDay: "2026-08-30", days: 28,
      clicks: 33, impressions: 959, position: 21.1, ai: { impressions: 67, clicks: null } },
  ];
  const seriesHtml = weeklySearchSection(seriesRows);
  cases.push([/Search, weekly/.test(seriesHtml), "a real series renders its heading", "-"]);
  cases.push([/231/.test(seriesHtml) && /959/.test(seriesHtml), "...and both rows' numbers", "-"]);
  cases.push([(seriesHtml.match(/UNMEASURED/g) ?? []).length === 1,
    "a null ai prints UNMEASURED, not 0 or blank",
    `${(seriesHtml.match(/UNMEASURED/g) ?? []).length}x`]);
  cases.push([!/<script>2026-09-02/.test(seriesHtml) && /&lt;script&gt;2026-09-02/.test(seriesHtml),
    "a hostile value from series.json is escaped, never raw HTML", "-"]);
  // And the section is actually IN the built page, not merely a function nobody calls.
  const withSeries = await buildPages(md, rec, { offline: true, surfaces });
  cases.push([/no export yet|Search, weekly/.test(withSeries.files["index.html"]),
    "the built page carries the weekly-search section either way", "-"]);

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
