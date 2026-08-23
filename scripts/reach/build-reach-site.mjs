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
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gscExported, html, loadRecord, parseRows, pointsAtUs, resolve1 } from "./backlinks.mjs";
import { rows as ledgerRows } from "../outreach-ledger.mjs";
import { loadPosts, parsePosts } from "./posts.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/backlinks.md");
const OUT = join(REPO, "dist-reach");

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
  const out = [];
  for (const r of rows) {
    const probe = offline ? { ok: null, why: "offline" } : await pointsAtUs(r.url, fetchImpl);
    out.push(resolve1(r, probe, rec.seen));
  }
  const checked = offline ? (rec.checked ?? "never") : new Date().toISOString().slice(0, 10);
  const page = html(out, gscExported(REPO), checked, surfaces, posts);
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
  const np = posts.reduce((a, f) => a + f.posts.length, 0);
  console.log(`posts:      ${np} readable from ${posts.length} draft(s) · ` +
    posts.map((f) => `${f.file} ${f.posts.length}/${f.declared}`).join(" · "));
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
    { surface: "A list PR", file: "dev.md", status: "fired", fired: "2026-08-12", due: "2026-11-10", notes: "", who: "wait", next: "Nothing to do." },
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

  // And the artifact itself, because "it built" says nothing about what is in it.
  const { files } = await buildPages(md, rec, { offline: true, surfaces });
  const has = (f, re, what) => cases.push([re.test(files[f]), `${f} carries ${what}`, files[f].slice(0, 40)]);
  has("index.html", /noindex/, "noindex");
  has("robots.txt", /Disallow: \/$/m, "Disallow: /");
  has("_headers", /X-Robots-Tag/, "X-Robots-Tag");
  cases.push([!/ellaz\.fun\/games/.test(files["index.html"]), "no ellaz.fun page links leak in", "-"]);
  has("index.html", /do next &middot; 1 waiting on you/, "the do-next count");
  has("index.html", /A group/, "an open surface");
  has("index.html", />closed</, "a separate closed section");
  // ...and the closed surface appears ONCE. Asserting the section merely EXISTS
  // survives a do-next list that also carries every closed row - the page renders,
  // the heading is there, and the closed work is listed as work to do. (Mutation
  // M3, 2026-08-23: it survived the weaker assertion and was caught by this one.)
  cases.push([(files["index.html"].match(/A dead list/g) ?? []).length === 1,
    "a closed surface is listed once, not in both", `${(files["index.html"].match(/A dead list/g) ?? []).length}x`]);
  // A surface with no instruction must SAY so. Dropping it silently is how a board
  // reports a clean sweep over work nobody wrote down.
  const mute = await buildPages(md, rec, { offline: true, surfaces: [{ ...surfaces[0], next: "" }] });
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
  cases.push([/line one/.test(H) && /posts ready to send/.test(H), "the page carries the post text", "-"]);
  cases.push([(H.match(/<pre /g) ?? []).length === (H.match(/<button/g) ?? []).length,
    "every post block has its own copy button", `${(H.match(/<pre /g) ?? []).length} pre / ${(H.match(/<button/g) ?? []).length} button`]);
  const driftPage = await buildPages(md, rec, { offline: true, surfaces, posts: [{ ...q, declared: 3 }] });
  cases.push([/declares 3 and 1 could be read/.test(driftPage.files["index.html"]), "an unreadable body is reported on the page", "-"]);
  cases.push([!/could be read/.test(H), "...and is not reported when every body parsed", "-"]);

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
