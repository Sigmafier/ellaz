#!/usr/bin/env node
/**
 * Prospects: is this destination worth spending a letter on, and where is its door.
 *
 * WHY IT IS NOT `backlinks.mjs`. That one asks "is our link still there" of pages
 * that already carry it. This asks "would a link here be worth anything, and can I
 * reach a human" of pages that do not. Opposite question, opposite failure mode: a
 * false negative there loses a link we had, a false positive here spends a letter -
 * and letters are the scarce thing, because every one of them needs the operator.
 *
 * THE READING THAT MATTERS IS `rel`, ON AN INNER PAGE. A homepage links to its own
 * social accounts and tells you nothing (`reach-playbook` C8). A destination that
 * nofollows everything can still be worth a listing for its readers, but it must
 * never enter an authority count, and the only way to know which it is is to count
 * the attribute on real outbound anchors.
 *
 * ZERO IS THREE DIFFERENT ANSWERS AND THEY MUST NOT COLLAPSE:
 *   - `blind`     the matcher found NO external anchors. Says nothing about the
 *                 page; says the instrument read nothing. Never a verdict.
 *   - `dormant`   anchors found, but the page is old. A live-looking graveyard is
 *                 this repo's most repeated destination error - Tapuz, then
 *                 freetech4teachers, both 200 and both years cold.
 *   - `unchecked` the fetch failed FOR OUR REASONS. 403 and 429 are usually a
 *                 user-agent block or a rate limit, not an outage, so they are
 *                 retried once and then reported as unchecked - NEVER as bad.
 *
 * AND `nofollow: 0` IS ONLY BELIEVABLE FROM A MATCHER PROVEN TO SEE ONE. A regex
 * that cannot express `nofollow` reports every page as perfectly dofollow and reads
 * like very good news. `--control` parses a fixture carrying one of each and fails
 * if it cannot report both; the same control runs on EVERY invocation, because a
 * gate you have to remember to run is one nobody runs.
 *
 * Usage:
 *   node scripts/reach/prospects.mjs                 # check every row in prospects.md
 *   node scripts/reach/prospects.mjs <url> [<url>]   # check URLs directly, record nothing
 *   node scripts/reach/prospects.mjs --control       # prove the matcher answers both ways
 *   node scripts/reach/prospects.mjs --offline       # read the record, fetch nothing
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/prospects.md");
const REC = join(REPO, "docs/outreach/prospects-checked.json");
const SITE = "ellaz.fun";
const OPEN = "<!-- prospects:rows -->";
const CLOSE = "<!-- /prospects:rows -->";

/** Two real user agents. A host that refuses the first often serves the second. */
const AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

/**
 * Hosts that are never evidence of outward linking: the destination's own domain,
 * the social accounts every site links to, and the CDN plumbing. Counting these is
 * how a homepage reads as "43 outbound links" when it links nowhere.
 */
const NOISE =
  /facebook\.|twitter\.|\bx\.com|instagram\.|pinterest\.|linkedin\.|youtube\.|youtu\.be|tiktok\.|whatsapp\.|t\.me|\/cdn-cgi\/|gravatar\.|w3\.org|schema\.org|gmpg\.org/i;

const today = () => new Date().toISOString().slice(0, 10);

/** Anchors, with their whole opening tag, so `rel` is still attached to the href. */
export function anchors(html) {
  return html.match(/<a\s[^>]*href\s*=\s*"https?:\/\/[^"]+"[^>]*>/gi) ?? [];
}

const hrefOf = (tag) => (tag.match(/href\s*=\s*"([^"]+)"/i) ?? [])[1] ?? "";
const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return ""; } };

/**
 * The measurement. `host` is the page's own host, excluded so a site's internal
 * navigation cannot inflate the count.
 *
 * `nofollow` is matched on the rel ATTRIBUTE rather than anywhere in the tag,
 * because a URL or a class name containing the word would otherwise count - the
 * false-positive sibling of the trap in
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`.
 */
export function measure(html, host) {
  const out = { external: 0, dofollow: 0, nofollow: 0, sponsored: 0, hosts: [], linksToUs: false };
  const seen = new Set();
  for (const tag of anchors(html)) {
    const href = hrefOf(tag);
    const h = hostOf(href);
    if (!h) continue;
    if (href.includes(SITE)) out.linksToUs = true;
    if (h === host || h.endsWith(`.${host}`) || host.endsWith(`.${h}`)) continue;
    if (NOISE.test(href)) continue;
    out.external++;
    if (!seen.has(h)) { seen.add(h); out.hosts.push(h); }
    const rel = (tag.match(/\brel\s*=\s*"([^"]*)"/i) ?? [])[1] ?? "";
    if (/\bnofollow\b/i.test(rel)) out.nofollow++; else out.dofollow++;
    if (/\bsponsored\b/i.test(rel)) out.sponsored++;
  }
  return out;
}

/**
 * A door, or nothing. A destination with no reachable human is not a prospect.
 *
 * THE DOOR MUST BE ON THE DESTINATION'S OWN HOST. The first version matched
 * `/about|/contact|...` against every anchor on the page with no host check, so a
 * roundup that links to somebody else's About page handed back THAT site's door -
 * measured 2026-08-30, when weareteachers.com's door came back as a page on
 * `nature.org`. The operator would have written a letter about our games to a
 * conservation charity, and nothing downstream could have caught it: the URL is
 * real, it returns 200, and it is an About page.
 *
 * A `mailto:` is kept host-free on purpose - an address printed on a page is
 * almost always the page owner's, and there is no host to check it against - but
 * it is reported as `email` so the operator can see which kind of evidence it is.
 */
export function door(html, host) {
  const mail = html.match(/mailto:([^"'?\s>]+@[^"'?\s>]+)/i);
  if (mail) return { kind: "email", at: mail[1] };
  for (const tag of html.match(/<a\s[^>]*href\s*=\s*"[^"]+"[^>]*>/gi) ?? []) {
    const href = hrefOf(tag);
    if (!/\/(contact|about|submit|suggest|tip|write-for-us)\b/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, `https://${host}/`); } catch { continue; }
    const h = abs.host.replace(/^www\./, "");
    if (h !== host && !h.endsWith(`.${host}`) && !host.endsWith(`.${h}`)) continue;
    return { kind: "page", at: abs.href };
  }
  return null;
}

/**
 * Freshness. Structured dates first because they are unambiguous; a visible year is
 * the fallback and is deliberately weak - it establishes the page is not from 2019,
 * never that it is current. A page with no date at all is `unknown`, which is a
 * reason to look by hand, not a reason to pass.
 *
 * THE NEWEST STRUCTURED DATE, NOT THE FIRST. A page carries both
 * `article:published_time` and `article:modified_time`, and the published one comes
 * first in the head - so reading the first match answers "when was this written",
 * while the question being asked is "is this page still tended". Measured
 * 2026-08-30: weareteachers.com's roundup was ruled `dormant` on its 2023-07-03
 * published date while its modified date, three tags later in the same document,
 * read 2026-07-28. That is one of the largest teacher publications in the US,
 * dofollowing 208 external anchors, written off by five weeks of the wrong tag.
 *
 * The text fallback already took the maximum, for exactly this reason. These two
 * paths answering the same question differently is what let it through.
 */
export function freshness(html) {
  const structured = [
    ...html.matchAll(
      /<(?:meta|time)[^>]*(?:property|name|itemprop|datetime)\s*=\s*"?[^">]*(?:modified|published|date)[^">]*"?[^>]*content\s*=\s*"(\d{4}-\d{2}-\d{2})/gi,
    ),
    ...html.matchAll(/<time[^>]*datetime\s*=\s*"(\d{4}-\d{2}-\d{2})/gi),
  ].map((m) => m[1]).sort(); // ISO sorts chronologically
  if (structured.length) {
    const newest = structured[structured.length - 1];
    const oldest = structured[0];
    return {
      on: newest,
      how: structured.length === 1 ? "structured" : `newest of ${structured.length} structured dates (oldest ${oldest})`,
    };
  }
  const years = [...html.matchAll(/\b(20[12][0-9])\b/g)].map((m) => Number(m[1]));
  if (years.length) return { on: String(Math.max(...years)), how: "a year in the text" };
  return { on: null, how: "none found" };
}

/**
 * Did we receive the page, or something standing in front of it? See the note in
 * `get`. Pure, so the control below can exercise both directions with no network.
 */
export function readsAsDocument(body) {
  return (body.match(/<a\s/gi) ?? []).length > 0;
}

async function get(url) {
  let last = "";
  for (const ua of AGENTS) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
        headers: { "user-agent": ua, accept: "text/html,application/xhtml+xml" },
      });
      const body = await res.text();
      // A 2xx IS NOT A READ. Measured 2026-08-30: three library pages answered
      // `HTTP 202` with a well-formed ~2 KB document carrying an empty <title>,
      // zero anchors and `awsWafCookieDomainList` - an AWS WAF challenge. `res.ok`
      // is true for 202, so all three were measured, and all three were reported
      // `blind` with the line "no external anchors found". That is a verdict about
      // a page nobody fetched, printed in the same column as real readings.
      //
      // The test is ANCHORS, not size or status. Every real destination page has
      // links - navigation at the very least - so zero of them on a 2xx means the
      // body is not the document that was asked for. A page with internal links and
      // no external ones still reports `blind`, which is what `blind` is for.
      //
      // This repo already gates its OWN site against a 200 carrying no content
      // (`assert:crawlable`, after the Hostinger bot challenge). Same failure, read
      // from the other side of the wire.
      if (res.ok && !readsAsDocument(body)) {
        const waf = /awsWafCookieDomainList|cf-browser-verification|__cf_chl|Incapsula|_Incapsula_|distil/i.test(body);
        return {
          ok: false,
          why: `HTTP ${res.status} carrying no anchors (${body.length} B)` +
            (waf ? " - a bot challenge, not the page" : " - not the document"),
        };
      }
      if (res.ok) return { ok: true, code: res.status, body, url: res.url };
      last = `HTTP ${res.status}`;
      if (![403, 406, 429, 503].includes(res.status)) return { ok: false, why: last };
    } catch (e) {
      last = String(e?.message ?? e).slice(0, 80);
    }
  }
  return { ok: false, why: last || "no response" };
}

/**
 * The verdict. It is deliberately not a score: a number invites ranking destinations
 * against each other, and these are not comparable - a `.gov.il` that nofollows is
 * worth more attention than a blog that does not.
 */
/**
 * ANCHORS ARE NOT DESTINATIONS, AND THE DIFFERENCE DECIDED A LETTER.
 *
 * `libraries.oc.gov/kids/play/games` measured **167 external dofollow anchors** on
 * 2026-08-30 and was ranked second in the whole file on that number. Reading the
 * hosts behind them: `ocpl.org`, `catalog.ocpl.org`, `ocpl.libcal.com`,
 * `ocpl.overdrive.com`, `ocpl.kanopy.com`, `ocpl.beanstack.org`, plus a dozen
 * "Friends of the X Library" nonprofits - the county's own ecosystem, external only
 * because `ocpl.org` is a different registrable domain from `oc.gov`. The genuinely
 * third-party sites it links to are **four**: funbrain, nick, nickjr, pbskids.
 *
 * A host check cannot see an ORGANISATION, and no list of noise domains will ever
 * contain somebody else's sibling domain. So the threshold moves onto the thing that
 * is not inflatable by repetition: how many DISTINCT hosts this page is willing to
 * send a reader to. 167 anchors across 27 hosts and 167 anchors to one host are the
 * same number and opposite facts.
 */
export function verdict(m, fresh) {
  if (m.external === 0) return { v: "blind", why: "no external anchors found - the matcher read nothing" };
  const year = Number(fresh.on?.slice(0, 4));
  const cold = Number.isFinite(year) && year < new Date().getFullYear() - 1;
  if (cold) return { v: "dormant", why: `newest date on the page is ${fresh.on}` };
  if (m.dofollow === 0) return { v: "nofollow", why: `all ${m.external} external anchors are nofollow - readers only, never authority` };
  const n = m.hosts.length;
  if (m.dofollow >= 5 && n >= 5)
    return { v: "TAKE", why: `${m.dofollow} of ${m.external} external anchors are dofollow, across ${n} distinct hosts` };
  if (m.dofollow >= 5)
    return { v: "thin", why: `${m.dofollow} dofollow anchors but only ${n} distinct host(s) - repetition, not reach` };
  return { v: "thin", why: `only ${m.dofollow} dofollow of ${m.external}, across ${n} host(s)` };
}

/* ----------------------------------------------------------------- control */

/**
 * The fixture carries one of each, plus the three things that have actually broken
 * a matcher in this repo: a `rel` on the wrong attribute, the word inside a URL,
 * and an internal link dressed as an external one.
 *
 * It runs on EVERY invocation. A control you have to ask for is a control that is
 * green because nobody ran it.
 */
const FIXTURE = `
<a href="https://alpha.example/one">plain, counts as dofollow</a>
<a href="https://beta.example/two" rel="nofollow noopener">counts as nofollow</a>
<a href="https://gamma.example/three" rel="sponsored nofollow">nofollow AND sponsored</a>
<a href="https://delta.example/nofollow-guide">the word is in the URL, not the rel</a>
<a href="https://host.test/self">same host, must be excluded</a>
<a href="https://twitter.com/someone" rel="me">noise, must be excluded</a>
<a href="https://ellaz.fun/he/">this one proves linksToUs fires</a>
`;

/**
 * The second fixture. `measure` was controlled from the first day and `door` and
 * `freshness` were not - and both of them were wrong on 2026-08-30, on the same
 * page, in the same run. An instrument nobody controls is an instrument nobody
 * knows the state of, so these get the same treatment: a fixture carrying the exact
 * shape that broke them, parsed on every invocation.
 */
const FIXTURE2 = `
<meta property="article:published_time" content="2019-01-02T00:00:00+00:00">
<meta property="article:modified_time" content="2026-07-28T20:07:53+00:00">
<a href="https://other.example/en-us/about-us/who-we-are">somebody ELSE'S about page</a>
<a href="/contact/">the destination's own door, and the one that must win</a>
`;

/** An AWS WAF challenge, shaped like the ones measured on 2026-08-30: well-formed,
 * `</html>` present, empty title, and not one anchor. A structural check passes it. */
const WAF = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title></title>
<script>window.awsWafCookieDomainList = []; window.gokuProps = {"key":"AQID"};</script>
</head><body><div id="captcha-container"></div></body></html>`;

export function control2() {
  const f = freshness(FIXTURE2);
  const d = door(FIXTURE2, "host.test");
  const bad = [];
  // The published date is FIRST in the document and older. Reading it is the bug.
  if (f.on !== "2026-07-28") bad.push({ field: "freshness", got: f.on, want: "2026-07-28" });
  // The external About comes FIRST. Returning it is the bug.
  if (d?.at !== "https://host.test/contact/") bad.push({ field: "door", got: d?.at ?? "none", want: "https://host.test/contact/" });
  // Both directions, because a predicate that answers "no" to everything would make
  // every destination `unchecked` and never be noticed - the reading nobody argues
  // with is the reading nobody checks.
  if (readsAsDocument(WAF) !== false) bad.push({ field: "readsAsDocument(challenge)", got: true, want: false });
  if (readsAsDocument(FIXTURE2) !== true) bad.push({ field: "readsAsDocument(page)", got: false, want: true });
  // Distinct hosts, counted. On THIS fixture the two numbers coincide - 5 anchors
  // on 5 hosts - so this line pins the count and cannot, on its own, tell an
  // anchor count from a host count. Written down rather than left implied,
  // because an assertion that cannot discriminate is the thing this file is about.
  // The line below is the one that does the discriminating.
  const mh = measure(FIXTURE, "host.test");
  if (mh.hosts.length !== 5) bad.push({ field: "distinct hosts", got: mh.hosts.length, want: 5 });
  // And a page repeating ONE destination must never read as reach.
  const rep = measure(Array(9).fill('<a href="https://one.example/x">x</a>').join("\n"), "host.test");
  const vr = verdict(rep, { on: String(new Date().getFullYear()), how: "test" });
  if (vr.v !== "thin") bad.push({ field: "9 anchors to 1 host", got: vr.v, want: "thin" });
  return { pass: bad.length === 0, fresh: f, door: d, bad };
}

export function control() {
  const m = measure(FIXTURE, "host.test");
  const want = { external: 5, dofollow: 3, nofollow: 2, sponsored: 1, linksToUs: true };
  // `bad` carries BOTH sides. The first version filtered `Object.entries(want)` and
  // then printed that entry's value as the observed one, so a real failure reported
  // `nofollow got 2, want 2` - a contradiction that reads as a broken control rather
  // than a broken matcher, which is how a correct refusal gets overridden.
  // (`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`, caught here by
  // planting a blind matcher and reading the message it produced.)
  const bad = Object.entries(want)
    .filter(([k, v]) => m[k] !== v)
    .map(([k, v]) => ({ field: k, got: m[k], want: v }));
  return { pass: bad.length === 0, got: m, want, bad };
}

/* -------------------------------------------------------------------- rows */

export function parseRows(md) {
  const a = md.indexOf(OPEN), b = md.indexOf(CLOSE);
  if (a < 0 || b < 0) throw new Error(`prospects.md: missing ${OPEN} / ${CLOSE} markers`);
  return md.slice(a + OPEN.length, b)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|\s*-+/.test(l) && !/^\|\s*URL\b/i.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length >= 2 && /^https?:\/\//.test(c[0]))
    .map(([url, note]) => ({ url, note }));
}

/* -------------------------------------------------------------------- main */

async function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const urls = argv.filter((a) => /^https?:\/\//.test(a));

  // Always, before anything is believed.
  const c = control();
  console.log(
    `matcher control: ${c.pass ? "PASS" : "FAIL"} - ` +
      `${c.got.external} external, ${c.got.dofollow} dofollow, ${c.got.nofollow} nofollow, ` +
      `${c.got.sponsored} sponsored, linksToUs=${c.got.linksToUs}`,
  );
  if (!c.pass) {
    // Read from the OBJECT shape `bad` actually carries. It was destructured as a
    // pair here long after `bad` stopped being one, so the one path that exists to
    // explain a broken matcher threw `object is not iterable` instead - losing the
    // field name, losing the sentence below, and exiting 1 (which means "no
    // candidates") rather than 2 (which means "believe nothing"). Proved 2026-08-30
    // by planting a blind matcher and reading what came out.
    for (const b of c.bad) console.log(`  wrong: ${b.field} got ${b.got}, want ${b.want}`);
    console.log("\nThe matcher cannot read `rel`. Every number below would be fiction. Stopping.");
    return 2;
  }
  const c2 = control2();
  console.log(
    `door + freshness control: ${c2.pass ? "PASS" : "FAIL"} - ` +
      `newest date ${c2.fresh.on}, door ${c2.door?.at ?? "none"}`,
  );
  if (!c2.pass) {
    for (const b of c2.bad) console.log(`  wrong: ${b.field} got ${b.got}, want ${b.want}`);
    console.log("\nA reading built on any of these three is a fact about the wrong page. Stopping.");
    return 2;
  }
  if (flags.has("--control")) return 0;

  const rows = urls.length
    ? urls.map((url) => ({ url, note: "" }))
    : existsSync(SRC) ? parseRows(readFileSync(SRC, "utf8")) : [];

  console.log(`population: ${rows.length} candidate(s)${urls.length ? " (from the command line)" : ` from ${SRC.replace(REPO + "/", "")}`}\n`);
  if (rows.length === 0) {
    console.log("No candidates. That is the blind case, not a clean sweep.");
    return 1;
  }

  const prior = existsSync(REC) ? JSON.parse(readFileSync(REC, "utf8")) : {};
  const out = {};
  const tally = {};

  for (const row of rows) {
    const host = hostOf(row.url);
    if (flags.has("--offline")) {
      const p = prior[row.url];
      console.log(`  ?  ${host}  ${p ? `${p.verdict} (recorded ${p.checked})` : "never checked"}`);
      continue;
    }
    const res = await get(row.url);
    if (!res.ok) {
      tally.unchecked = (tally.unchecked ?? 0) + 1;
      out[row.url] = { ...prior[row.url], verdict: "unchecked", why: res.why, checked: today() };
      console.log(`  ?  ${host.padEnd(34)} unchecked - ${res.why}  (says nothing either way)`);
      continue;
    }
    const m = measure(res.body, host);
    const fresh = freshness(res.body);
    const d = door(res.body, host);
    const v = verdict(m, fresh);
    tally[v.v] = (tally[v.v] ?? 0) + 1;
    out[row.url] = {
      verdict: v.v, why: v.why, checked: today(),
      external: m.external, dofollow: m.dofollow, nofollow: m.nofollow,
      hosts: m.hosts.length, topHosts: m.hosts.slice(0, 12),
      fresh: fresh.on, freshHow: fresh.how, door: d, linksToUs: m.linksToUs,
      note: row.note || prior[row.url]?.note || "",
    };
    const mark = { TAKE: "+", thin: "~", nofollow: "-", dormant: "x", blind: "?" }[v.v] ?? "?";
    console.log(
      `  ${mark}  ${host.padEnd(34)} ${v.v.padEnd(9)} ext=${String(m.external).padEnd(4)}` +
        `df=${String(m.dofollow).padEnd(4)}nf=${String(m.nofollow).padEnd(4)}hosts=${String(m.hosts.length).padEnd(4)}` +
        `fresh=${fresh.on ?? "unknown"}`,
    );
    console.log(`     ${v.why}`);
    if (m.linksToUs) console.log(`     ALREADY LINKS TO US - this is a backlink, not a prospect. Move it to backlinks.md.`);
    console.log(`     door: ${d ? `${d.kind} ${d.at}` : "NONE FOUND - a destination with no reachable human is not a prospect"}`);
    if (m.nofollow === 0 && m.external > 0) {
      console.log(`     note: nofollow=0. Believable only because the control above reported 2 on the fixture.`);
    }
  }

  if (!flags.has("--offline") && !urls.length) {
    writeFileSync(REC, JSON.stringify(out, null, 2) + "\n");
    console.log(`\nwrote ${REC.replace(REPO + "/", "")}`);
  }
  const line = Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(", ");
  console.log(`\n${line || "nothing measured"}`);
  console.log(
    "A verdict is about the DESTINATION, never about whether to send. `TAKE` means a link\n" +
      "here would carry authority; whether it is worth a letter is still a person's call.",
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
