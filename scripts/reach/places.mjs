#!/usr/bin/env node
/**
 * Places: where the OPERATOR could post about the site, and what stands in the way.
 *
 * WHY IT IS NOT `prospects.mjs`. That one asks "would a link here carry authority" of
 * pages that already exist and already link out - it reads `rel` on real anchors. This
 * one asks a narrower, earlier question: "may we post here at all, and through what
 * door" - of communities, boards and portals nobody has approached yet. A `prospects.md`
 * TAKE says a link would count; a `places.md` TAKE says a post would be welcome. Neither
 * implies the other, and this script never writes a link-authority verdict.
 *
 * FOUR FACTS, EVERY CANDIDATE, EVERY RUN - never a guess in their place:
 *   (a) RULES   - does the destination's own rules/terms/guidelines page carry an
 *                 advertising or self-promotion clause. Quoted, not summarised, so the
 *                 next reader can judge it rather than trust a paraphrase.
 *   (b) FRESH   - the SECTION's own newest date, not the platform's homepage.
 *   (c) REL     - dofollow/nofollow on the section's real outbound anchors, via the
 *                 SAME `measure()` this repo already controls in `prospects.mjs`.
 *   (d) DOOR    - what account the destination needs to post at all (form / account /
 *                 email / channel / login-wall / none). This one is platform knowledge,
 *                 not a network reading - Facebook does not publish "you need an
 *                 account" as a fetchable fact - so it is carried in `places.md`'s own
 *                 table, beside the two URLs the script DOES fetch.
 *
 * ZERO IS THREE ANSWERS, same discipline as prospects.mjs:
 *   - `blind`      a page fetched fine and carried no readable prose - a client-rendered
 *                  shell, a bot challenge, an empty title. Says nothing about the rule.
 *   - `unchecked`  the fetch failed FOR OUR REASONS - 403, 429, a redirect to a login
 *                  page, a timeout. Reddit's own rules pages are exactly this today
 *                  (measured 2026-09-02: every one of the five target subreddits
 *                  redirects `old.reddit.com` to `/login/` now, which it did not
 *                  always do - RCH5's whole point is to read the destination TODAY,
 *                  never from what a note or a training memory says it used to do).
 *   - a verdict    only once a page was actually read.
 *
 * THE SUGGESTED VERDICT IS A SUGGESTION, NOT A VERDICT. It flags a FORBIDDING clause -
 * a negation word (no/not/avoid/prohibited/forbidden/must not, or אין/אסור/אוסר/איננו)
 * within 60 characters of the matched advertising/spam word - and calls that `dropped`.
 * It cannot tell "we forbid unsolicited ad posts" from "we do not want spam, here is
 * where to post your game" - Armor Games' own help page says both in one paragraph.
 * `places.md` overrides it in prose exactly where `prospects.md` already overrides
 * `verdict()` by hand (commonsense.org demoted by host-count, kidsaitools measured by
 * hand). The JSON record keeps BOTH the raw facts and the suggestion, so an override
 * is checkable rather than asserted.
 *
 * THE MATCHER IS CONTROLLED ON EVERY RUN, same shape as prospects.mjs `--control`: a
 * fixture carrying a real forbidding clause, a real permitting mention, and a plain
 * anchor pair - and it must read all three correctly or nothing below is believed.
 *
 * Usage:
 *   node scripts/reach/places.mjs             # check every row in places.md
 *   node scripts/reach/places.mjs --control    # prove the matchers, fetch nothing
 *   node scripts/reach/places.mjs --offline    # read the record, fetch nothing
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { anchors, measure, door as findDoor, freshness, readsAsDocument } from "./prospects.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(REPO, "docs/outreach/places.md");
const REC = join(REPO, "docs/outreach/places-checked.json");
const OPEN = "<!-- places:rows -->";
const CLOSE = "<!-- /places:rows -->";

const AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Strip tags/scripts/styles to plain text. Used for both the word-count "is this a
 * real document" check and the rules-clause search - HTML tag soup between "no" and
 * "advertising" would otherwise defeat the proximity check below.
 */
export function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A client-rendered shell (GameJolt, Pinterest, TikTok) has anchors but no prose. */
export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const AD_RE = /advertis\w*|self.?promot\w*|promotion\w*|\bspam\w*|no links?\b|פרסומ\w*|ספאם|קידום מכיר\w*|שיווק\w*/gi;
const FORBID_RE = /\b(no|not|never|avoid|prohibit\w*|forbid\w*|must not|may not|don'?t|disallow\w*)\b|אין\b|אינ\w*|אסור\w*|אוסר\w*/i;

/**
 * (a) THE RULES FACT. Finds every advertising/self-promotion/spam mention, quotes up
 * to 200 chars of context around the first one, and flags whether a negation word sits
 * within 60 chars before it. Returns null when the matcher found nothing - a genuinely
 * different state from "found a permitting mention", and `blind`/`unchecked` upstream
 * already covers "the page could not be read at all".
 */
export function rulesClause(text) {
  const m = AD_RE.exec(text);
  AD_RE.lastIndex = 0;
  if (!m) return null;
  const start = Math.max(0, m.index - 100);
  const quote = text.slice(start, m.index + m[0].length + 100).trim().slice(0, 200);
  // Both sides: "not permitted" sits AFTER the ad-word ("advertising ... not
  // permitted") as often as before it ("no self-promotion"). A window on one
  // side only misses the other construction - proven by the control fixtures.
  const around = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
  return { quote, forbidding: FORBID_RE.test(around) };
}

/* ----------------------------------------------------------------- control */

const FIXTURE_FORBID =
  "All content must be original. Self-promotion and unsolicited advertising are not " +
  "permitted anywhere on this board, in any thread.";
const FIXTURE_PERMIT =
  "Made something? This board welcomes self-promotion in the Show-and-Tell thread - " +
  "that is exactly what it is for.";
const FIXTURE_HE_FORBID = "התוכן שאתה מפרסם אסור להיות פרסומי או לקדם מכירה של מוצר.";
const FIXTURE_ANCHORS = `
<a href="https://alpha.example/one">dofollow</a>
<a href="https://beta.example/two" rel="nofollow">nofollow</a>
`;

export function control() {
  const bad = [];
  const forbid = rulesClause(FIXTURE_FORBID);
  if (!forbid || !forbid.forbidding) bad.push({ field: "forbid(en)", got: forbid, want: "forbidding:true" });
  const permit = rulesClause(FIXTURE_PERMIT);
  if (!permit || permit.forbidding) bad.push({ field: "permit(en)", got: permit, want: "forbidding:false" });
  const he = rulesClause(FIXTURE_HE_FORBID);
  if (!he || !he.forbidding) bad.push({ field: "forbid(he)", got: he, want: "forbidding:true" });
  const m = measure(FIXTURE_ANCHORS, "host.test");
  if (m.dofollow !== 1 || m.nofollow !== 1) bad.push({ field: "measure", got: m, want: "dofollow:1 nofollow:1" });
  if (wordCount(plainText("<html><body><p>only four words here</p></body></html>")) !== 4)
    bad.push({ field: "wordCount", got: wordCount(plainText("<p>only four words here</p>")), want: 4 });
  if (readsAsDocument("<a href=\"x\">x</a>") !== true) bad.push({ field: "readsAsDocument", got: false, want: true });
  return { pass: bad.length === 0, bad };
}

/* -------------------------------------------------------------------- rows */

export function parseRows(md) {
  const a = md.indexOf(OPEN), b = md.indexOf(CLOSE);
  if (a < 0 || b < 0) throw new Error(`places.md: missing ${OPEN} / ${CLOSE} markers`);
  return md.slice(a + OPEN.length, b)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|\s*-+/.test(l) && !/^\|\s*Name\b/i.test(l))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length >= 5)
    .map(([name, section, rules, doorKind, note]) => ({
      name, section: section === "-" ? null : section, rules: rules === "-" ? null : rules,
      doorKind, note: note ?? "",
    }));
}

async function get(url) {
  let last = "";
  for (const ua of AGENTS) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": ua, accept: "text/html,application/xhtml+xml" },
      });
      const body = await res.text();
      if (res.ok && !readsAsDocument(body)) {
        return { ok: false, blind: true, why: `HTTP ${res.status} carrying no anchors (${body.length} B) - not the document` };
      }
      if (res.ok) {
        const text = plainText(body);
        if (wordCount(text) < 40) {
          return { ok: false, blind: true, why: `HTTP ${res.status}, ${wordCount(text)} words of prose - a client-rendered shell, not the document` };
        }
        return { ok: true, code: res.status, body, text, url: res.url };
      }
      last = `HTTP ${res.status}`;
      // A redirect INTO a login page resolves as 200 at the login URL once `fetch`
      // follows it - so the login wall shows up as a URL, not a status code.
      if (/\/login\b|\/signin\b|accounts\.google|log-in/i.test(res.url) && res.url !== url) {
        return { ok: false, why: `redirected to a login page (${res.url}) - login wall` };
      }
      if (![403, 406, 429, 503].includes(res.status)) return { ok: false, why: last };
    } catch (e) {
      last = String(e?.message ?? e).slice(0, 80);
    }
  }
  return { ok: false, why: last || "no response" };
}

/** A fetch that LANDS on a login/signin URL even with a 200 - the shape `get()` above
 * cannot see because it only inspects a non-2xx response's final URL. */
function looksLikeLoginWall(finalUrl) {
  return /\/login\b|\/signin\b|accounts\.google|log-in/i.test(finalUrl);
}

async function checkOne(row) {
  const facts = { name: row.name, doorKind: row.doorKind, note: row.note, checked: today() };
  const reads = [];

  if (row.rules) {
    const r = await get(row.rules);
    if (!r.ok) {
      facts.rulesState = r.blind ? "blind" : "unchecked";
      facts.rulesWhy = r.why;
    } else if (looksLikeLoginWall(r.url)) {
      facts.rulesState = "unchecked";
      facts.rulesWhy = `redirected to a login page (${r.url})`;
    } else {
      const c = rulesClause(r.text);
      facts.rulesState = c ? "found" : "silent";
      facts.rulesQuote = c?.quote ?? null;
      facts.rulesForbidding = c?.forbidding ?? null;
      reads.push("rules");
    }
  } else {
    facts.rulesState = "unchecked";
    facts.rulesWhy = "no rules URL could be verified as real from this environment";
  }

  if (row.section) {
    const s = await get(row.section);
    if (!s.ok) {
      facts.sectionState = s.blind ? "blind" : "unchecked";
      facts.sectionWhy = s.why;
    } else if (looksLikeLoginWall(s.url)) {
      facts.sectionState = "unchecked";
      facts.sectionWhy = `redirected to a login page (${s.url})`;
    } else {
      const host = new URL(s.url).host.replace(/^www\./, "");
      const fr = freshness(s.body);
      const m = measure(s.body, host);
      facts.freshOn = fr.on;
      facts.freshHow = fr.how;
      facts.external = m.external;
      facts.dofollow = m.dofollow;
      facts.nofollow = m.nofollow;
      facts.hosts = m.hosts.length;
      reads.push("section");
    }
  } else {
    facts.sectionState = "unchecked";
    facts.sectionWhy = "no section URL could be verified as real from this environment";
  }

  // The suggested verdict - see the module docstring on why it is a suggestion.
  if (row.doorKind === "login-wall" || reads.length === 0) {
    facts.suggested = "unchecked";
  } else if (facts.rulesForbidding === true) {
    facts.suggested = "dropped";
  } else {
    facts.suggested = "TAKE";
  }
  return facts;
}

/* -------------------------------------------------------------------- main */

async function main(argv) {
  const flags = new Set(argv);

  const c = control();
  console.log(`matcher control: ${c.pass ? "PASS" : "FAIL"}`);
  if (!c.pass) {
    for (const b of c.bad) console.log(`  wrong: ${b.field} got ${JSON.stringify(b.got)}, want ${b.want}`);
    console.log("\nThe rules/rel/word-count matchers cannot be trusted. Stopping.");
    return 2;
  }
  if (flags.has("--control")) return 0;

  const rows = existsSync(SRC) ? parseRows(readFileSync(SRC, "utf8")) : [];
  console.log(`population: ${rows.length} candidate(s) from ${SRC.replace(REPO + "/", "")}\n`);
  if (rows.length === 0) {
    console.log("No candidates. That is the blind case, not a clean sweep.");
    return 1;
  }

  const prior = existsSync(REC) ? JSON.parse(readFileSync(REC, "utf8")) : {};
  const out = {};
  const tally = {};

  for (const row of rows) {
    if (flags.has("--offline")) {
      const p = prior[row.name];
      console.log(`  ?  ${row.name}  ${p ? `${p.suggested} (recorded ${p.checked})` : "never checked"}`);
      continue;
    }
    const f = await checkOne(row);
    out[row.name] = f;
    tally[f.suggested] = (tally[f.suggested] ?? 0) + 1;
    const mark = { TAKE: "+", dropped: "x", unchecked: "?" }[f.suggested] ?? "?";
    console.log(`  ${mark}  ${row.name.padEnd(38)} ${f.suggested.padEnd(9)} door=${row.doorKind}`);
    if (f.rulesState === "found") {
      console.log(`     rules: "${f.rulesQuote}" (forbidding=${f.rulesForbidding})`);
    } else if (f.rulesState) {
      console.log(`     rules: ${f.rulesState}${f.rulesWhy ? " - " + f.rulesWhy : ""}`);
    }
    if (f.freshOn !== undefined) {
      console.log(`     section: ${f.external} external, ${f.dofollow} dofollow, ${f.nofollow} nofollow, ${f.hosts} hosts, fresh=${f.freshOn ?? "unknown"} (${f.freshHow})`);
    } else if (f.sectionState) {
      console.log(`     section: ${f.sectionState}${f.sectionWhy ? " - " + f.sectionWhy : ""}`);
    }
  }

  if (!flags.has("--offline")) {
    writeFileSync(REC, JSON.stringify(out, null, 2) + "\n");
    console.log(`\nwrote ${REC.replace(REPO + "/", "")}`);
  }
  const line = Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(", ");
  console.log(`\n${line || "nothing measured"}`);
  console.log(
    "The suggested verdict flags a negation word near an advertising/spam mention.\n" +
      "It cannot tell a forbidding clause from a 'here is where to post it' clause -\n" +
      "read the quote before acting on it. A person still drafts, and a person still posts.",
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
