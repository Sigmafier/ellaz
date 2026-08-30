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
  // `bing-*` is excluded. The matcher is /link/i, and `bing-links-2026-11-27.csv`
  // matches it - so once Bing became a second producer into this one folder, a Bing
  // export would have suppressed this board's "nobody exported Search Console's Links
  // report" banner on the strength of a different engine. The banner is about whether
  // GOOGLE has been read, and no Bing file can answer that.
  const hit = readdir(dir).filter((f) => /link/i.test(f) && !/^bing-/i.test(f));
  return { measured: hit.length > 0, files: hit };
}

/** The check record: what we have seen, and when we last saw it live. */
export function loadRecord() {
  if (!existsSync(REC)) return { checked: null, seen: {} };
  try { return JSON.parse(readFileSync(REC, "utf8")); } catch { return { checked: null, seen: {} }; }
}

/**
 * NAMED and LINKED are two different facts, and only one of them is a backlink.
 *
 * A page that writes "we like ellaz.fun" in its prose contains our domain and
 * points nobody at us. `body.includes()` cannot tell those apart, and for a row a
 * human already confirmed that is fine - the question there is only whether the
 * page still mentions us at all. For a row being PROMOTED it is not fine, because
 * nobody has looked at that page and the machine's reading is the whole evidence.
 *
 * WRITE THE MATCHER AGAINST THE ARTIFACT, NOT AGAINST AN EXPECTATION. Served HTML
 * quotes an href with `"`, with `'`, or with nothing at all, and minifiers emit all
 * three; the attribute may sit behind any number of other attributes and any amount
 * of whitespace including newlines. The control below feeds it all four shapes plus
 * a prose-only page, because a matcher that cannot report the negative reports every
 * page as linking to us and one that cannot report the positive reports none.
 *
 * It CANNOT see an anchor a script builds after load, and there is no fix for that
 * from here. That case reads `named` at best and `absent` at worst - which is why
 * `named` is printed loudly rather than folded into "no".
 */
export function linkShape(body, site = SITE) {
  const hrefs = [...body.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  return { linked: hrefs.some((h) => h.includes(site)), named: body.includes(site), anchors: hrefs.length };
}

/**
 * Is our domain in the body of that page, and is it in an ANCHOR?
 *
 * Three outcomes for `ok`, deliberately not two. `false` means we fetched it and
 * our domain is not there; `null` means we could not fetch it, which says nothing
 * at all. `linked` is the stronger fact and is what a promotion is allowed to use.
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
    const shape = linkShape(body);
    const how = shape.linked ? "linked" : shape.named ? "NAMED, NOT LINKED" : "absent";
    return { ok: shape.named, linked: shape.linked, named: shape.named, why: `${body.length} B, ${how}` };
  } catch (e) {
    return { ok: null, why: String(e.message || e).slice(0, 60) };
  }
}

/**
 * Resolve one row against what we just fetched and what we remember.
 *
 * `claimed` IS FROZEN AND MUST STAY FROZEN. Its one row is a pull request whose page
 * renders our URL inside its own diff, so both `named` and `linked` are true of a
 * link that does not exist. No fetch can tell that page apart from a real listing,
 * which is exactly why a human decides when a `claimed` row moves.
 *
 * `expected` WAS FROZEN TOO, AND THAT WAS THE DEFECT. Measured 2026-08-30, five days
 * after the four Hebrew rows were written and eighty-nine before their verdict is due:
 * an `expected` row fed a page carrying our link still resolved to `expected`. Every
 * one of those rows would have read `expected` on 2026-11-27 whether or not a single
 * editor had published us, and `reach:backlinks` is the instrument that reads that
 * verdict now that Search Console's Links panel is known to have no link graph. The
 * fallback could not report a success. It could only report the absence of one, which
 * is the shape this repository keeps finding: a non-verdict nobody argues with.
 *
 * SO IT PROMOTES, AND ON THE STRONGER EVIDENCE. A `live` row was confirmed by a
 * person once, so re-checking it asks the cheap question - is our domain still on
 * that page at all. A promotion is the machine making a claim nobody has checked, so
 * it takes an ANCHOR: `linked`, never `named`. The difference is not theoretical
 * here, because two of the four destinations are pages that could plausibly write
 * our name in prose while linking somewhere else entirely.
 *
 * A `named` page that is not `linked` stays `expected` and is PRINTED - see `board`.
 * Folding it into "no" would hide the single most actionable state in the file: they
 * wrote about us and the link did not survive their editor.
 */
export function resolve1(row, probe, seen) {
  const was = seen[row.url];
  const lastLive = was?.lastLive ?? null;
  if (row.status === "claimed") return { ...row, probe, lastLive };
  if (probe.ok === null) return { ...row, status: "unchecked", probe, lastLive };
  if (row.status === "expected")
    return probe.linked ? { ...row, status: "live", probe, lastLive: today() } : { ...row, probe, lastLive };
  if (probe.ok) return { ...row, status: "live", probe, lastLive: today() };
  return { ...row, status: was?.lastLive ? "gone" : row.status, probe, lastLive };
}

function board(rows, gsc, checked) {
  const n = (s) => rows.filter((r) => r.status === s).length;
  const L = [];
  L.push(`BACKLINKS · ${SITE}${" ".repeat(12)}re-checked ${checked}`);
  L.push("─".repeat(54));
  L.push(`  ${MARK.live} ${n("live")} live    ${MARK.claimed} ${n("claimed")} claimed` +
         `    ${MARK.gone} ${n("gone")} gone    ${MARK.unchecked} ${n("unchecked")} unchecked`);
  // NAMED AND NOT LINKED IS THE MOST ACTIONABLE STATE IN THE FILE, so it is printed
  // above everything else rather than folded into `expected`. It means a destination
  // wrote about us and the link did not survive their editor - which is a sentence to
  // send, not a wait to continue. It has no status of its own on purpose: the five
  // statuses are hand-writable in `backlinks.md` and this one is DERIVED from a fetch,
  // so a person typing it would be recording a belief in the column reserved for
  // measurements.
  const named = rows.filter((r) => r.probe?.named && !r.probe?.linked);
  if (named.length) {
    L.push("");
    L.push("!  NAMED, NOT LINKED - they wrote our domain and no anchor points at it");
    for (const r of named) L.push(`    ${r.url}`);
  }
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

/**
 * WHICH FIRED SURFACES IS ANYTHING WATCHING? The gate that stops this file going stale.
 *
 * `ledger.md` records what we sent. This file records what we watch. Nothing connected
 * the two, so a surface could be fired with a verdict date and have NO row here - and
 * then on its verdict day the only instrument that could read it has never looked at
 * the destination. Measured 2026-08-30: 11 fired surfaces, 4 watched. Seven had a date
 * and no watcher.
 *
 * THE MAP IS HAND-KEPT AND THAT IS THE POINT - a fired surface with no entry REDS, so
 * the next send has to say which page a link would appear on, or say why there is
 * never going to be one. Both are one line. Neither can be skipped.
 * (`.claude/rules/a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md` is the
 * same hand-kept-mirror shape; there nothing checked the mirror, which is why this one
 * is checked in both directions.)
 *
 * BOTH DIRECTIONS FIRE. An unmapped fired surface reds; so does a mapped URL that is
 * not in the table, because a map pointing at a row nobody wrote watches nothing while
 * reading as covered.
 */
export const WATCHED = new Map([
  ["Hebrew directory - digitalpedagogy.co", "https://digitalpedagogy.co/"],
  ["Hebrew directory - kef-lilmod.co.il", "https://www.kef-lilmod.co.il/%D7%90%D7%AA%D7%A8%D7%99-%D7%94%D7%A2%D7%A9%D7%A8%D7%94/"],
  ["Hebrew directory - portal.macam.ac.il", "https://portal.macam.ac.il/article/educational-applications-hebrew/"],
  ["Ministry portal - pop.education.gov.il", "https://pop.education.gov.il/teaching-tools/teaching-practices/search-teaching-practices/digital-tools-building-knowledge-distance-learning/"],
  ["WeAreTeachers (letter 4)", "https://www.weareteachers.com/free-teacher-resources/"],
  ["OC Public Libraries (letter 5)", "https://libraries.oc.gov/kids/play/games"],
  ["Greenburgh Public Library (letter 6)", "https://greenburghlibrary.org/childrens/games"],
  ["itch.io", "https://ytrofr.itch.io/sudoku"],
  ["awesome-pwa (list PR)", "https://github.com/hemanth/awesome-pwa/pull/465"],
  // EXEMPT, each with the reason, because "no page to watch" is a finding and not an
  // oversight. A `null` here is a claim that no URL could ever carry the link.
  ["Newgrounds", null],   // both listings UN-PUBLISHED by the platform; the pages 404
  ["CrazyGames enquiry", null],   // an email to submissions@; a reply is not a page
]);

/** Returns the problems, empty when every fired surface is watched or exempt. */
export function coverage(ledger, rows) {
  const urls = new Set(rows.map((r) => r.url));
  const problems = [];
  const fired = ledger.filter((r) => r.status === "fired" || r.status === "spent");
  if (!fired.length) problems.push("BLIND: no fired surface found in ledger.md - the matcher read nothing");
  for (const r of fired) {
    // The ledger's Surface cell carries markdown emphasis and parenthetical banners, so
    // match on a PREFIX of the plain text rather than on the whole cell - which would go
    // stale the first time somebody bolds a word.
    const key = [...WATCHED.keys()].find((k) => r.surface.replace(/[*`]/g, "").startsWith(k));
    if (key === undefined)
      problems.push(`UNWATCHED: "${r.surface.replace(/[*`]/g, "").slice(0, 60)}" is ${r.status} with a verdict due ${r.due}, and nothing in backlinks.md watches it`);
    else if (WATCHED.get(key) && !urls.has(WATCHED.get(key)))
      problems.push(`DANGLING: ${key} is mapped to ${WATCHED.get(key)}, which has no row in backlinks.md`);
  }
  return problems;
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
function surfaceSection() { return ""; }   // superseded by boardSections

/**
 * ONE CARD AT A TIME - the board opens on the single next thing and nothing else.
 *
 * WHY THE SHAPE CHANGED. Measured on a 390x844 phone, 2026-08-29: the two-list
 * board was 10,365px tall - 12.3 screens, 3,272 words - and the FIRST copy button
 * sat 3.8 screens down. 39 of its 43 tap targets were under 44px. Nothing was wider
 * than the screen and there was no sideways scroll, so every width check read clean;
 * the defect was entirely in how far a thumb had to travel to do the one thing this
 * board exists for. The operator, who reads it on a phone: "ultra concise and easy
 * to use ... everything from my phone".
 *
 * THE UNIT IS AN ACTION, NOT A RECORD. A surface with posts contributes one action
 * PER POST, because what you actually do is send one letter to one place; a surface
 * without posts is one action itself. `hebrew-directories.md` is four letters behind
 * one ledger row, and a card offering four copy buttons is the wall this replaces.
 *
 * BOTH COUNTS ARE PRINTED, because they are different questions and a reader who
 * sees only one will think the other is wrong: N actions to send, M surfaces waiting.
 *
 * THE JOIN IS IN THE VIEW, which is the direction that cannot corrupt anything -
 * `ledger.md` and `backlinks.md` stay apart and a renderer has no state to drift.
 * That was already this file's rule; this only moves where the join happens.
 */
function actionsFrom(surfaces, posts) {
  const byFile = new Map();
  for (const f of posts) byFile.set(f.file, f.posts);
  const out = [];
  // A FILE MAY BE NAMED BY MORE THAN ONE LEDGER ROW - `hebrew-directories.md` is named
  // by both "Hebrew directories x4" and "Ministry catalogue (ecat)". Spending its posts
  // on the first row that claims it is what stops the same four letters appearing twice
  // and the queue reading 20 when it is 16. Measured 2026-08-29, on the first render.
  const spent = new Set();
  for (const s of surfaces.filter((x) => x.who === "you")) {
    const ps = spent.has(s.file) ? [] : (byFile.get(s.file) || []);
    if (ps.length) { spent.add(s.file); for (const p of ps) out.push({ surface: s, post: p }); }
    else out.push({ surface: s, post: null });
  }
  // A POST WHOSE FILE NO LEDGER ROW CLAIMS MUST STILL APPEAR. Joining posts to
  // surfaces means an unclaimed draft has nowhere to hang, and dropping it renders
  // a board that is indistinguishable from one where the draft was never written -
  // the exact failure the mute-count below exists to prevent, arriving by a new
  // route. It is listed and MARKED, never silently omitted. (Caught by this file's
  // own controls on the one-card rewrite, 2026-08-29, because their post fixture
  // deliberately names a file no surface does.)
  for (const f of posts) {
    if (spent.has(f.file)) continue;
    for (const post of f.posts) {
      out.push({ surface: { surface: f.file, file: f.file, who: "you", next: "", due: "" },
                 post, unledgered: true });
    }
  }
  return out;
}

/** The big card. Title, why, then the two things a thumb presses. */
function card(a, i, total) {
  const s = a.surface, p = a.post;
  const title = p ? p.heading.replace(/^Post\s*[-\u2013\u2014]?\s*/i, "") : s.surface;
  // A `Go` that is a URL becomes a real button; a sentence ("no verified room yet")
  // is printed as amber text and never linked - the board is read on a phone, where
  // a name is something to go and search for and a URL is something to press.
  const go = p && p.go ? p.go : "";
  const openable = /^https?:\/\//.test(go);
  const why = plain((p && p.do) || s.next) ||
    "&mdash; no instruction written. Add one to the Do next column.";
  return `<article class=card>
  <p class=count>${i + 1} of ${total}</p>
  <h2 class=dest>${esc(title)}</h2>
  ${p && p.where ? `<p class=where>${esc(plain(p.where))}</p>` : ""}
  ${p ? `<details class=read><summary>read it first</summary><pre dir=auto>${esc(p.body)}</pre></details>
  <button type=button class=big>copy the text</button>` : ""}
  ${openable ? `<a class="big open" href="${esc(go)}">open the site</a>`
    : go ? `<p class="go none">${esc(plain(go))}</p>` : ""}
  <p class=why>${esc(why)}</p>
  ${a.unledgered ? `<p class=banner>no ledger row names ${esc(s.file)} &mdash; add one, or this
    post has no verdict date and no record that it was sent.</p>` : ""}
  <p class=src><a href="${REPO_BLOB}${esc(s.file)}">${esc(s.file)}</a>${
    s.due && /\d/.test(s.due) ? ` &middot; verdict due ${esc(s.due)}` : ""}</p>
</article>`;
}

/** A one-line row inside a folded section. 48px tall, tappable, no prose. */
function row(a) {
  const p = a.post;
  const title = p ? p.heading.replace(/^Post\s*[-\u2013\u2014]?\s*/i, "") : a.surface.surface;
  const raw = (p && p.go) || "";
  const go = /^https?:\/\//.test(raw) ? raw : "";
  // A `Go` that is a SENTENCE ("none verified yet") is the warning that there is no
  // room to post this in. Dropping it in the folded row - which the first version did
  // - hides exactly the thing a reader needs before they try, and it hides it only in
  // the compact view, so the card looks correct. Printed, never linked. (2026-08-29.)
  const warn = !go && raw ? `<span class="go none">${esc(plain(raw))}</span>` : "";
  return `<li class=r>${go ? `<a href="${esc(go)}">${esc(title)}</a>` : `<span>${esc(title)}</span>`}${warn}
    ${p ? `<details class=read><summary>read</summary><pre dir=auto>${esc(p.body)}</pre></details>
    <button type=button>copy</button>` : ""}</li>`;
}

function fold(label, count, inner, open = false) {
  if (!inner) return "";
  return `<details${open ? " open" : ""}><summary>${esc(label)}${
    count == null ? "" : ` &middot; ${count}`}</summary>${inner}</details>`;
}

function boardSections(surfaces, posts) {
  if (!surfaces.length) return "";
  const acts = actionsFrom(surfaces, posts);
  const waiting = surfaces.filter((s) => s.who === "you").length;
  const others = surfaces.filter((s) => s.who !== "you" && s.who !== "done");
  const closed = surfaces.filter((s) => s.who === "done");
  // A heading whose body the parser could not read is COUNTED and named, never
  // dropped: a draft rendering as "no posts" is indistinguishable from one that
  // never had any.
  const mute = posts.filter((f) => f.declared > f.posts.length)
    .map((f) => `${f.file} declares ${f.declared} and ${f.posts.length} could be read`);
  const later = (s) => `<li class=r><span>${esc(s.surface)}</span>
    <span class="tag ${esc(s.who)}">${esc(s.who || "?")}</span></li>`;
  return (mute.length ? `<p class=banner>${esc(mute.join("; "))}</p>` : "") +
    (acts.length ? card(acts[0], 0, acts.length) : "") +
    fold("next", acts.length - 1, acts.length > 1
      ? `<ul>${acts.slice(1).map(row).join("")}</ul>` : "") +
    fold("held back", others.length, others.length
      ? `<ul>${others.map(later).join("")}</ul>` : "") +
    fold("closed", closed.length, closed.length
      ? `<ul>${closed.map(later).join("")}</ul>` : "") +
    `<p class=sub>${acts.length} to send &middot; ${waiting} surface(s) waiting on you</p>`;
}

/**
 * The COPY button reads its own `<pre>`'s textContent, never a data attribute - so
 * what lands on the clipboard is the text a reader sees, and an escaping bug cannot
 * ship `&amp;` into somebody's contact form. The `<pre>` is `hidden` rather than
 * removed, for the same reason: the clipboard and the page must not have two sources.
 */
function copyScript() {
  return `<script>document.addEventListener("click",function(e){var b=e.target;
    if(b.tagName!=="BUTTON")return;var el=b.previousElementSibling,pre=null;
    while(el&&!pre){pre=el.tagName==="PRE"?el:el.querySelector&&el.querySelector("pre");
    el=el.previousElementSibling;}if(!pre)return;
    navigator.clipboard.writeText(pre.textContent).then(function(){
      var t=b.textContent;b.textContent="copied";setTimeout(function(){b.textContent=t},1400)},
      function(){b.textContent="could not copy"})});</script>`;
}

function postSection() { return ""; }   // folded into boardSections

/** The page. Rendered FROM the same rows, so it can never be a second source. */
export function html(rows, gsc, checked, surfaces = [], posts = []) {
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
li.post{border-inline-start-color:#3fbf7f}
p.go{margin-top:6px}p.go a{color:#3fbf7f;font-weight:600}
p.go.none{color:#e0b23f}
pre{white-space:pre-wrap;word-break:break-word;background:#14131c;border-radius:8px;
padding:12px;margin:8px 0 0;font:13px/1.6 ui-sans-serif,system-ui,sans-serif;max-height:15em;overflow:auto}
pre.title{max-height:none;font-weight:600}
button{margin-top:8px;padding:9px 16px;border:0;border-radius:8px;background:#3fbf7f;
color:#14131c;font:600 13px/1 ui-sans-serif,system-ui,sans-serif;min-height:44px;cursor:pointer}

/* ONE CARD AT A TIME. Every number below was measured on a 390px phone, and the
   two that matter are the tap height and how far the thumb travels: the board this
   replaces put its first copy button 3.8 SCREENS down and had 39 of 43 targets
   under 44px. 56px is the card's own action height - comfortably over the 44px
   platform floor, because these two are the whole point of the page. */
body{padding:16px}
.card{background:var(--card);border-radius:14px;padding:18px 16px 14px;
border-inline-start:3px solid #e0b23f}
.count{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:0}
h2.dest{font-size:22px;line-height:1.25;margin:6px 0 0;text-transform:none;letter-spacing:0;
color:var(--fg);border:0;padding:0;word-break:break-word}
.where{color:var(--dim);font-size:13px;margin:6px 0 0}
.why{color:#c7c3d6;font-size:13px;margin:14px 0 0}
.src{font-size:12px}
.big{display:block;width:100%;min-height:56px;margin-top:10px;border-radius:12px;
font:600 16px/1 ui-sans-serif,system-ui,sans-serif;text-align:center;text-decoration:none}
button.big{background:#3fbf7f;color:#14131c}
a.big.open{background:#2b2938;color:var(--fg);line-height:56px}

/* Everything that is not the next thing is one tap away, and costs no scroll. */
details{margin-top:14px;background:var(--card);border-radius:12px}
summary{min-height:52px;display:flex;align-items:center;padding:0 16px;cursor:pointer;
font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
details[open] summary{color:var(--fg)}
details>ul,details>div,details>h2,details>p{margin:0 12px 12px}
li.r{display:flex;align-items:center;gap:10px;min-height:48px;padding:6px 12px;
border-inline-start-color:#5a5768}
li.r a,li.r span{flex:1;font-size:14px;word-break:break-word}
li.r button{margin-top:0;min-height:44px;padding:0 14px}
details.read{background:transparent;margin-top:10px}
details.read>summary{min-height:40px;padding:0;font-size:13px;text-transform:none;letter-spacing:0}
details.read>pre{margin:6px 0 0}
li.r details.read{flex:0 0 auto}li.r details.read>summary{padding:0 6px}
</style><h1>Reach &middot; ${SITE}</h1>
<p class=sub>re-checked ${esc(checked)} &middot; from docs/outreach/{backlinks,ledger}.md &mdash; edit those, not this</p>
${gsc.measured ? "" : `<p class=banner><b>Nobody has exported Search Console&rsquo;s Links report</b>, so the
  live count below is what WE can see, not what Google can. Until a
  <code>Top linking sites</code> CSV lands in <code>docs/outreach/exports/</code>,
  treat it as UNMEASURED rather than as the number.</p>`}
${boardSections(surfaces, posts)}
${fold(`links \u00b7 ${n("live")} live, ${n("expected")} expected`, null, `
<div class=tiles>${["live", "claimed", "gone", "unchecked"].map(tile).join("")}</div>
${["live", "gone", "claimed", "expected", "unchecked"].map((s) => {
    const hit = rows.filter((r) => r.status === s);
    if (!hit.length && s !== "live") return "";
    return `<h2>${s}</h2>` + (hit.length ? `<ul>${hit.map(row).join("")}</ul>`
      : `<p class=empty>${gsc.measured ? "none confirmed." :
        "none. Search Console&rsquo;s Links report has never been exported, so this is UNMEASURED rather than zero."}</p>`);
  }).join("")}`)}
${copyScript()}`;
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
  // The coverage gate runs on every invocation, offline included, because it reads two
  // files and no network - and the one run where it matters is the one nobody thought
  // to make special.
  const cov = coverage(ledgerRows(REPO), rows);
  console.log(`coverage:   ${WATCHED.size} of the ledger's fired surfaces mapped, ` +
    `${[...WATCHED.values()].filter((v) => v === null).length} exempt with a reason`);
  if (cov.length) {
    console.error("");
    for (const c of cov) console.error(c);
    console.error("\nA fired surface nothing watches has a verdict date and no instrument.");
    console.error("Add its row to docs/outreach/backlinks.md, or an exempt entry naming why");
    console.error("no page could ever carry the link, in WATCHED above.");
    process.exit(1);
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
  check("claimed is never promoted", resolve1({ ...base, status: "claimed" }, { ok: true, linked: true }, seen).status, "claimed");

  // THE PROMOTION, BOTH DIRECTIONS. The second is the load-bearing one: a rule that
  // promotes on `named` passes the first check and turns every page that merely writes
  // our domain into a backlink.
  const exp = { ...base, status: "expected" };
  check("expected + an ANCHOR -> live", resolve1(exp, { ok: true, named: true, linked: true }, {}).status, "live");
  check("expected + a MENTION only -> stays expected", resolve1(exp, { ok: true, named: true, linked: false }, {}).status, "expected");
  check("expected + absent -> stays expected", resolve1(exp, { ok: false, named: false, linked: false }, {}).status, "expected");
  check("expected + fetch failed -> unchecked", resolve1(exp, { ok: null }, {}).status, "unchecked");

  // THE MATCHER, AGAINST THE SHAPES A SERVER ACTUALLY EMITS. Written from `global.css`
  // once before and it missed the minified form, which is why all four quoting shapes
  // are here rather than the one anybody writes by hand.
  const A = `<a href="https://ellaz.fun/">x</a>`;
  check("href double-quoted", linkShape(A).linked, true);
  check("href single-quoted", linkShape(`<a href='https://ellaz.fun/'>x</a>`).linked, true);
  check("href unquoted (minified)", linkShape(`<a href=https://ellaz.fun/ class=y>x</a>`).linked, true);
  check("href behind other attributes and a newline",
    linkShape(`<a\n  class="c" data-x="1"\n  href="https://ellaz.fun/games/">x</a>`).linked, true);
  check("prose mention is NAMED, not LINKED", linkShape("<p>we like ellaz.fun a lot</p>").linked, false);
  check("  and it IS named", linkShape("<p>we like ellaz.fun a lot</p>").named, true);
  check("an anchor elsewhere does not count", linkShape(`<a href="https://other.test/">ellaz.fun</a>`).linked, false);
  check("a page with no anchors at all", linkShape("<p>nothing</p>"), { linked: false, named: false, anchors: 0 });
  // The positive control on the matcher itself: it must SEE anchors, or every `linked`
  // reading above is false for the same reason and the negatives pass vacuously.
  check("the matcher finds anchors at all", linkShape(A).anchors, 1);

  // COVERAGE, both directions plus its own blind case.
  const led = (surface, status = "fired") => ({ surface, status, due: "2026-11-27" });
  const bl = (url) => ({ url });
  check("a fired surface with no map entry REDS",
    coverage([led("Some New Door (letter 9)")], []).length, 1);
  check("a mapped surface whose URL has no row REDS",
    coverage([led("itch.io")], []).length, 1);
  check("a mapped surface with its row is clean",
    coverage([led("itch.io")], [bl("https://ytrofr.itch.io/sudoku")]).length, 0);
  check("an EXEMPT surface needs no row",
    coverage([led("Newgrounds")], []).length, 0);
  check("a draft surface is not yet watched",
    coverage([led("Some New Door (letter 9)", "draft")], []).length, 1);   // BLIND, not UNWATCHED
  check("  and the reason is BLIND",
    coverage([led("Some New Door (letter 9)", "draft")], [])[0].startsWith("BLIND"), true);
  check("markdown emphasis in the Surface cell still matches",
    coverage([led("Newgrounds **(BOTH UN-PUBLISHED)**")], []).length, 0);

  // THE FOLDER HAS TWO PRODUCERS NOW. Both directions, because a matcher that answers
  // `false` to everything passes the exclusion check and reports the GSC panel
  // unmeasured forever.
  // REPO is passed rather than a made-up path: `gscExported` short-circuits on
  // `existsSync`, so a nonexistent repo returns `measured:false` before the injected
  // readdir is ever called - and every assertion below would pass without the matcher
  // running once.
  const listing = (names) => gscExported(REPO, () => names);
  check("a GSC reading note counts as read", listing(["links-panel-read-2026-08-30.md"]).measured, true);
  check("a Bing export does NOT", listing(["bing-links-2026-11-27.csv"]).measured, false);
  check("a Bing export beside a GSC note still reads the note",
    listing(["bing-links-2026-11-27.csv", "links-panel-read-2026-08-30.md"]).measured, true);
  check("an unrelated file is not a reading", listing(["README.md"]).measured, false);

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
