#!/usr/bin/env node
/**
 * The backlinks ledger: who points at us, and is the link still there.
 *
 * WHY IT IS NOT `ledger.md`. That file records what WE FIRED. This records what
 * EXISTS, and the difference is not bookkeeping: a surface can be `fired` and
 * produce no link, which is the normal case. More importantly a link can DIE with
 * nothing in this repository changing - a post deleted, a list entry dropped in a
 * rewrite, a page edited and our URL going with it. Nothing else here would notice.
 *
 * THE STATUS CODE IS NOT THE CHECK. A page returns 200 with our link edited out of
 * it just as happily as with the link present. So this asserts our domain appears
 * in the BODY, the same way `assert-crawlable.mjs` reads the body of our own pages
 * rather than trusting a 200.
 *
 * A FAILED FETCH IS NOT EVIDENCE OF ABSENCE. No network, a timeout, a host that
 * refuses an automated client - each of those is `unchecked`, NEVER `gone`. This
 * repo has twice concluded a thing was dead from a probe that simply could not
 * reach it (`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`), and
 * here the wrong reading is expensive: `gone` is the alarm state, so a network
 * blip would raise it for every row at once.
 *
 * `gone` IS STICKY, AND THAT IS THE POINT. `backlinks-checked.json` remembers the
 * last date each URL was seen live. Without that memory a link that dies is
 * indistinguishable from one that never existed, and the whole follow-up value of
 * this file is being able to tell those apart.
 *
 * Usage:
 *   node scripts/reach/backlinks.mjs              # re-check every row, print the board
 *   node scripts/reach/backlinks.mjs --offline    # read the record, fetch nothing
 *   node scripts/reach/backlinks.mjs --html       # also write backlinks.html
 *   node scripts/reach/backlinks.mjs --control    # prove it can answer both ways
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rows as ledgerRows } from "../outreach-ledger.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/backlinks.md");
const REC = join(REPO, "docs/outreach/backlinks-checked.json");
const PAGE = join(REPO, "docs/outreach/backlinks.html");
const SITE = "ellaz.fun";
const OPEN = "<!-- backlinks:rows -->";
const CLOSE = "<!-- /backlinks:rows -->";
const STATUSES = ["live", "gone", "claimed", "expected", "unchecked"];
const MARK = { live: "●", claimed: "◐", gone: "○", expected: "◌", unchecked: "?" };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The hand-authored rows, read from the fenced region of `backlinks.md`.
 *
 * The region markers are what make this parse-able without owning the whole file:
 * prose above and below can be rewritten freely, and only what is between them is
 * data. A missing marker THROWS rather than returning nothing - an empty parse is
 * the shape that reports a clean sweep over a table it never read.
 */
export function parseRows(md) {
  const a = md.indexOf(OPEN), b = md.indexOf(CLOSE);
  if (a < 0 || b < 0) throw new Error(`backlinks: ${OPEN} / ${CLOSE} markers are missing from backlinks.md`);
  const out = [];
  for (const line of md.slice(a + OPEN.length, b).split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|") || /^\|\s*-+/.test(t) || /^\|\s*URL\s*\|/i.test(t)) continue;
    const c = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((s) => s.trim());
    if (c.length < 5 || !/^https?:\/\//.test(c[0])) continue;
    const status = c[2].toLowerCase();
    if (!STATUSES.includes(status)) throw new Error(`backlinks: unknown status "${c[2]}" on ${c[0]}`);
    out.push({ url: c[0], source: c[1], status, first: c[3], recheck: c[4], notes: c[5] ?? "" });
  }
  return out;
}

/**
 * Has Search Console's Links report ever been exported?
 *
 * This deliberately answers a YES/NO about the EXPORT, not a count of links. The
 * reader is `gsc-links.mjs`; duplicating its parsing here would be a second answer
 * to one question. What the board needs from GSC is only whether an empty "live"
 * section means MEASURED ZERO (a finding - the lane produced nothing) or UNMEASURED
 * (a gap - nobody looked), and those are acted on differently.
 */
export function gscExported(repo, readdir = readdirSync) {
  const dir = join(repo, "docs/outreach/exports");
  if (!existsSync(dir)) return { measured: false };
  const hit = readdir(dir).filter((f) => /link/i.test(f));
  return { measured: hit.length > 0, files: hit };
}

/** The check record: what we have seen, and when we last saw it live. */
export function loadRecord() {
  if (!existsSync(REC)) return { checked: null, seen: {} };
  try { return JSON.parse(readFileSync(REC, "utf8")); } catch { return { checked: null, seen: {} }; }
}

/**
 * Is our domain in the body of that page?
 *
 * Three outcomes, deliberately not two. `false` means we fetched it and our link
 * is not there; `null` means we could not fetch it, which says nothing at all.
 */
export async function pointsAtUs(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
    });
    if (!res.ok) return { ok: null, why: `HTTP ${res.status}` };
    const body = await res.text();
    return { ok: body.includes(SITE), why: `${body.length} B` };
  } catch (e) {
    return { ok: null, why: String(e.message || e).slice(0, 60) };
  }
}

/**
 * Resolve one row against what we just fetched and what we remember.
 *
 * `claimed` and `expected` are NEVER promoted by a fetch here - a PR page mentions
 * ellaz.fun in its own diff, so "the string is on the page" is true of a link that
 * does not exist yet. Only a row already asserting a real link is re-checked.
 */
export function resolve1(row, probe, seen) {
  const was = seen[row.url];
  if (row.status === "claimed" || row.status === "expected") return { ...row, probe, lastLive: was?.lastLive ?? null };
  if (probe.ok === null) return { ...row, status: "unchecked", probe, lastLive: was?.lastLive ?? null };
  if (probe.ok) return { ...row, status: "live", probe, lastLive: today() };
  return { ...row, status: was?.lastLive ? "gone" : row.status, probe, lastLive: was?.lastLive ?? null };
}

function board(rows, gsc, checked) {
  const n = (s) => rows.filter((r) => r.status === s).length;
  const L = [];
  L.push(`BACKLINKS · ${SITE}${" ".repeat(12)}re-checked ${checked}`);
  L.push("─".repeat(54));
  L.push(`  ${MARK.live} ${n("live")} live    ${MARK.claimed} ${n("claimed")} claimed` +
         `    ${MARK.gone} ${n("gone")} gone    ${MARK.unchecked} ${n("unchecked")} unchecked`);
  for (const s of ["live", "gone", "claimed", "expected", "unchecked"]) {
    const hit = rows.filter((r) => r.status === s);
    if (!hit.length && s !== "live") continue;
    L.push("");
    L.push(`${MARK[s]} ${s.toUpperCase()}`);
    if (!hit.length) {
      L.push(gsc.measured ? "    none confirmed." : "    none. GSC's Links report has never been exported,");
      if (!gsc.measured) L.push("    so this is UNMEASURED, not zero. `npm run reach:links`");
      continue;
    }
    for (const r of hit) {
      L.push(`    ${r.url}`);
      L.push(`      ${r.source} · first ${r.first} · re-check ${r.recheck}` +
             (r.lastLive ? ` · last live ${r.lastLive}` : "") +
             (r.probe?.why ? ` · ${r.probe.why}` : ""));
    }
  }
  return L.join("\n");
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const REPO_BLOB = "https://github.com/Sigmafier/ellaz/blob/main/docs/outreach/";
/** Markdown emphasis is noise in a rendered cell; the link syntax is worse. */
const plain = (s) => String(s).replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*`\[\]]/g, "");

/**
 * The surfaces half: what to DO, read from `ledger.md`.
 *
 * WHY BOTH HALVES ARE ON ONE PAGE WHEN THE TWO FILES MUST STAY APART. They answer
 * different questions - what EXISTS versus what WE DID - and collapsing the records
 * would let a belief be mistaken for a measurement. But a person opening this board
 * has one question, "what now", and the honest answer needs both: zero links is only
 * actionable beside the list of surfaces that have not been fired. So the RECORDS
 * stay separate and the VIEW joins them, which is the direction that cannot corrupt
 * anything - a renderer has no state to drift.
 *
 * THE ORDER IS THE LEDGER'S ROW ORDER, untouched. Sorting here would be a second
 * opinion about priority, held in a file nobody edits when they re-prioritise.
 */
function surfaceSection(surfaces) {
  if (!surfaces.length) return "";
  const open = surfaces.filter((s) => s.who !== "done");
  const closed = surfaces.filter((s) => s.who === "done");
  const yours = open.filter((s) => s.who === "you").length;
  let i = 0;
  const item = (s) => {
    const num = s.who === "you" ? `<b class=num>${++i}</b>` : `<b class="num ${s.who}">&middot;</b>`;
    return `<li class="s ${s.who}">${num}<div><h3>${esc(s.surface)}
      <span class="tag ${s.who}">${esc(s.who || "?")}</span><span class=tag>${esc(s.status)}</span></h3>
      <p class=n>${esc(plain(s.next)) || "&mdash; no instruction written. Add one to the Do next column."}</p>
      <p><a href="${REPO_BLOB}${esc(s.file)}">${esc(s.file)}</a>${
        s.due && /\d/.test(s.due) ? ` &middot; verdict due ${esc(s.due)}` : ""}</p></div></li>`;
  };
  return `<h2>do next &middot; ${yours} waiting on you</h2><ul>${open.map(item).join("")}</ul>` +
    (closed.length ? `<h2>closed</h2><ul>${closed.map(item).join("")}</ul>` : "");
}

/** The page. Rendered FROM the same rows, so it can never be a second source. */
export function html(rows, gsc, checked, surfaces = []) {
  const n = (s) => rows.filter((r) => r.status === s).length;
  const tile = (s) => `<div class=t><b class="${s}">${n(s)}</b><span>${s}</span></div>`;
  const row = (r) => `<li class="${r.status}"><a href="${esc(r.url)}">${esc(r.url)}</a>
    <p>${esc(r.source)} &middot; first seen ${esc(r.first)} &middot; re-check ${esc(r.recheck)}${
      r.lastLive ? ` &middot; last live ${esc(r.lastLive)}` : ""}</p>
    ${r.notes ? `<p class=n>${esc(plain(r.notes))}</p>` : ""}</li>`;
  return `<!doctype html><meta charset=utf-8><title>Backlinks &middot; ${SITE}</title>
<meta name=viewport content="width=device-width,initial-scale=1">
<meta name=robots content="noindex,nofollow">
<style>
:root{--bg:#14131c;--fg:#e9e7f2;--dim:#9a96ad;--card:#1e1c29}
*{box-sizing:border-box}body{margin:0;padding:24px;background:var(--bg);color:var(--fg);
font:15px/1.55 ui-sans-serif,system-ui,sans-serif}h1{font-size:19px;margin:0 0 4px}
.sub{color:var(--dim);font-size:13px;margin:0 0 20px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:24px}
.t{background:var(--card);border-radius:10px;padding:14px}.t b{display:block;font-size:26px}
.t span{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);
margin:22px 0 8px;border-top:1px solid #2b2938;padding-top:14px}
ul{list-style:none;margin:0;padding:0}li{background:var(--card);border-radius:10px;
padding:12px 14px;margin-bottom:8px;border-inline-start:3px solid var(--dim)}
li.live{border-color:#3fbf7f}li.gone{border-color:#e0574b}li.claimed{border-color:#e0b23f}
li.expected{border-color:#5a5768}li.unchecked{border-color:#7a76ff}
b.live{color:#3fbf7f}b.gone{color:#e0574b}b.claimed{color:#e0b23f}b.unchecked{color:#7a76ff}
a{color:var(--fg);word-break:break-all}p{margin:4px 0 0;color:var(--dim);font-size:13px}
p.n{color:#c7c3d6;font-size:12px}.empty{color:var(--dim);font-size:13px}
li.s{display:flex;gap:12px;align-items:flex-start;border-inline-start-color:#5a5768}
li.s.you{border-inline-start-color:#e0b23f}li.s.last{border-inline-start-color:#7a76ff}
li.s.done{opacity:.55}h3{font-size:14px;margin:0 0 4px;font-weight:600}
.num{flex:0 0 26px;height:26px;border-radius:8px;background:#2b2938;color:var(--dim);
font-size:13px;display:grid;place-items:center;margin-top:1px}
.num:not(.wait):not(.last):not(.done){background:#e0b23f;color:#14131c}
.tag{display:inline-block;margin-inline-start:6px;padding:1px 7px;border-radius:99px;
background:#2b2938;color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:.07em;
vertical-align:middle;font-weight:600}.tag.you{background:#e0b23f;color:#14131c}
.tag.last{background:#7a76ff;color:#fff}
.banner{background:#2b2938;border-inline-start:3px solid #7a76ff;border-radius:10px;
padding:12px 14px;margin-bottom:20px;font-size:13px;color:#c7c3d6}
</style><h1>Reach &middot; ${SITE}</h1>
<p class=sub>re-checked ${esc(checked)} &middot; from docs/outreach/{backlinks,ledger}.md &mdash; edit those, not this</p>
${gsc.measured ? "" : `<p class=banner><b>Nobody has exported Search Console&rsquo;s Links report</b>, so the
  live count below is what WE can see, not what Google can. Until a
  <code>Top linking sites</code> CSV lands in <code>docs/outreach/exports/</code>,
  treat it as UNMEASURED rather than as the number.</p>`}
${surfaceSection(surfaces)}
<h2>links that exist</h2>
<div class=tiles>${["live", "claimed", "gone", "unchecked"].map(tile).join("")}</div>
${["live", "gone", "claimed", "expected", "unchecked"].map((s) => {
    const hit = rows.filter((r) => r.status === s);
    if (!hit.length && s !== "live") return "";
    return `<h2>${s}</h2>` + (hit.length ? `<ul>${hit.map(row).join("")}</ul>`
      : `<p class=empty>${gsc.measured ? "none confirmed." :
        "none. Search Console&rsquo;s Links report has never been exported, so this is UNMEASURED rather than zero."}</p>`);
  }).join("")}`;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--control")) return control();
  const md = readFileSync(SRC, "utf8");
  const rows = parseRows(md);
  if (!rows.length) { console.error("backlinks: the table parsed to ZERO rows - refusing to report."); process.exit(1); }
  const rec = loadRecord();
  const offline = argv.includes("--offline");
  const out = [];
  for (const r of rows) {
    const probe = offline ? { ok: null, why: "offline" } : await pointsAtUs(r.url);
    out.push(resolve1(r, probe, rec.seen));
  }
  const gsc = gscExported(REPO);
  const checked = offline ? (rec.checked ?? "never") : today();
  console.log(`\n${board(out, gsc, checked)}\n`);
  console.log(`population: ${out.length} row(s) read from docs/outreach/backlinks.md`);
  if (!offline) {
    const seen = { ...rec.seen };
    for (const r of out) seen[r.url] = { status: r.status, lastLive: r.lastLive, checked };
    writeFileSync(REC, JSON.stringify({ checked, seen }, null, 2) + "\n");
    console.log(`record:     docs/outreach/backlinks-checked.json`);
  }
  if (argv.includes("--html")) {
    writeFileSync(PAGE, html(out, gsc, checked, ledgerRows(REPO)) + "\n");
    console.log(`page:       file://${PAGE}`);
  }
  const gone = out.filter((r) => r.status === "gone");
  if (gone.length) { console.error(`\nGONE: ${gone.map((r) => r.url).join(", ")}`); process.exit(1); }
  console.log(`OK  ${out.filter((r) => r.status === "live").length} live, nothing lost.\n`);
}

/**
 * The controls. Each one must be able to produce the OPPOSITE reading, or it is
 * a test of nothing - a matcher that never fires reports every link as gone, and
 * one that always fires reports every link as live.
 */
function control() {
  const fake = (body, status = 200) => async () => ({ ok: status < 400, status, text: async () => body });
  const cases = [];
  const check = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want });

  const md = `${OPEN}\n| URL | Source | Status | First seen | Re-check | Notes |\n|---|---|---|---|---|---|\n` +
    `| https://a.test/ | x | live | 2026-01-01 | 2026-04-01 | n |\n${CLOSE}`;
  check("parses a row", parseRows(md).length, 1);
  check("no marker throws", (() => { try { parseRows("nothing"); return false; } catch { return true; } })(), true);
  check("bad status throws",
    (() => { try { parseRows(md.replace("| live |", "| alive |")); return false; } catch { return true; } })(), true);

  const seen = { "https://a.test/": { lastLive: "2026-01-01" } };
  const base = { url: "https://a.test/", source: "x", status: "live", first: "2026-01-01", recheck: "-" };
  check("present -> live", resolve1(base, { ok: true }, seen).status, "live");
  check("absent + was live -> gone", resolve1(base, { ok: false }, seen).status, "gone");
  check("absent + never live -> unchanged", resolve1(base, { ok: false }, {}).status, "live");
  check("fetch failed -> unchecked, NOT gone", resolve1(base, { ok: null }, seen).status, "unchecked");
  check("claimed is never promoted", resolve1({ ...base, status: "claimed" }, { ok: true }, seen).status, "claimed");

  return Promise.all([
    pointsAtUs("https://a.test/", fake(`<a href="https://${SITE}/">x</a>`)).then((r) => check("body has us", r.ok, true)),
    pointsAtUs("https://a.test/", fake("<p>nothing</p>")).then((r) => check("body lacks us", r.ok, false)),
    pointsAtUs("https://a.test/", fake("", 404)).then((r) => check("404 -> null", r.ok, null)),
    pointsAtUs("https://a.test/", async () => { throw new Error("ENOTFOUND"); }).then((r) => check("throw -> null", r.ok, null)),
  ]).then(() => {
    for (const c of cases) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.name}${c.ok ? "" : ` (got ${JSON.stringify(c.got)})`}`);
    const bad = cases.filter((c) => !c.ok).length;
    console.log(bad ? `\n${bad} control(s) FAILED.` : `\nOK  ${cases.length}/${cases.length} controls behaved.`);
    process.exit(bad ? 1 : 0);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) main().catch((e) => { console.error(`backlinks: ${e.message}`); process.exit(1); });
