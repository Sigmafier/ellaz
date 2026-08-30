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

/** A door, or nothing. A destination with no reachable human is not a prospect. */
export function door(html, host) {
  const mail = html.match(/mailto:([^"'?\s>]+@[^"'?\s>]+)/i);
  if (mail) return { kind: "email", at: mail[1] };
  for (const tag of html.match(/<a\s[^>]*href\s*=\s*"[^"]+"[^>]*>/gi) ?? []) {
    const href = hrefOf(tag);
    if (/\/(contact|about|submit|suggest|tip|write-for-us)\b/i.test(href)) {
      try { return { kind: "page", at: new URL(href, `https://${host}/`).href }; } catch { /* skip */ }
    }
  }
  return null;
}

/**
 * Freshness. Structured dates first because they are unambiguous; a visible year is
 * the fallback and is deliberately weak - it establishes the page is not from 2019,
 * never that it is current. A page with no date at all is `unknown`, which is a
 * reason to look by hand, not a reason to pass.
 */
export function freshness(html) {
  const meta = html.match(
    /<(?:meta|time)[^>]*(?:property|name|itemprop|datetime)\s*=\s*"?[^">]*(?:modified|published|date)[^">]*"?[^>]*content\s*=\s*"(\d{4}-\d{2}-\d{2})/i,
  ) ?? html.match(/<time[^>]*datetime\s*=\s*"(\d{4}-\d{2}-\d{2})/i);
  if (meta) return { on: meta[1], how: "structured" };
  const years = [...html.matchAll(/\b(20[12][0-9])\b/g)].map((m) => Number(m[1]));
  if (years.length) return { on: String(Math.max(...years)), how: "a year in the text" };
  return { on: null, how: "none found" };
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
export function verdict(m, fresh) {
  if (m.external === 0) return { v: "blind", why: "no external anchors found - the matcher read nothing" };
  const year = Number(fresh.on?.slice(0, 4));
  const cold = Number.isFinite(year) && year < new Date().getFullYear() - 1;
  if (cold) return { v: "dormant", why: `newest date on the page is ${fresh.on}` };
  if (m.dofollow === 0) return { v: "nofollow", why: `all ${m.external} external anchors are nofollow - readers only, never authority` };
  if (m.dofollow >= 5) return { v: "TAKE", why: `${m.dofollow} of ${m.external} external anchors are dofollow` };
  return { v: "thin", why: `only ${m.dofollow} dofollow of ${m.external}` };
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
    console.log(`  wrong: ${c.bad.map(([k, v]) => `${k} got ${v}, want ${c.want[k]}`).join("; ")}`);
    console.log("\nThe matcher cannot read `rel`. Every number below would be fiction. Stopping.");
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
      fresh: fresh.on, freshHow: fresh.how, door: d, linksToUs: m.linksToUs,
      note: row.note || prior[row.url]?.note || "",
    };
    const mark = { TAKE: "+", thin: "~", nofollow: "-", dormant: "x", blind: "?" }[v.v] ?? "?";
    console.log(
      `  ${mark}  ${host.padEnd(34)} ${v.v.padEnd(9)} ext=${String(m.external).padEnd(4)}` +
        `df=${String(m.dofollow).padEnd(4)}nf=${String(m.nofollow).padEnd(4)}` +
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
