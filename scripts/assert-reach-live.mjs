#!/usr/bin/env node
/**
 * The reach board's gate, and its POLARITY IS INVERTED from every other gate here.
 *
 * `assert-live.mjs` asserts every artifact is FETCHABLE. This one asserts the
 * board is NOT - because the whole reason it is a separate site is that it holds
 * a follow-up list nobody but the operator should read, and the only thing making
 * that true is a Cloudflare Access policy that lives in a vendor dashboard, has no
 * representation in this repository, and can be removed by one click.
 *
 * SO A 200 IS THE ALARM. A published board that answers 200 to a stranger is not a
 * working deploy, it is an exposure, and it looks identical to success from every
 * other angle: the deploy is green, the page renders, the URL works.
 *
 * IT SHIPS ADVISORY, and that is deliberate rather than timid. The Pages project
 * exists before the Access policy does - somebody has to create one, then the
 * other - so on the first deploy the board IS public and an armed gate would red
 * on correct work. A gate that reds on day one for something nobody can fix that
 * day is a gate whose red means nothing by the end of the week.
 * .claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md
 *
 * ARM IT with REACH_BOARD_PROTECTED=1, in the same change that applies the policy.
 *
 * Usage:
 *   node scripts/assert-reach-live.mjs https://ellaz-reach.pages.dev
 *   REACH_BOARD_PROTECTED=1 node scripts/assert-reach-live.mjs <url>
 *   node scripts/assert-reach-live.mjs --control
 */

// A brand-new pages.dev hostname is not resolvable at the edge for a minute or
// two and answers 522. That is "not yet", not "wrong", and retrying it is the
// difference between a gate people read and a gate people re-run.
// .claude/rules/a-gate-must-tell-not-yet-from-wrong.md
const RETRYABLE = new Set([521, 522, 523, 524]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the anonymous world gets. Never follows the redirect - the redirect IS
 *  the evidence, and following it would report the login page's status instead. */
export async function probe(url, { fetchImpl = fetch, tries = 4, waitMs = 5000 } = {}) {
  let last = { verdict: "unreachable", why: "never attempted" };
  for (let i = 1; i <= tries; i++) {
    let res;
    try {
      res = await fetchImpl(url, { redirect: "manual", headers: { "user-agent": "ellaz-reach-gate" } });
    } catch (e) {
      last = { verdict: "unreachable", why: `fetch failed: ${e.message}`, attempts: i };
      if (i < tries) { await sleep(waitMs); continue; }
      return last;
    }
    if (RETRYABLE.has(res.status) && i < tries) { await sleep(waitMs); continue; }
    return classify(res, i);
  }
  return last;
}

export function classify(res, attempts = 1) {
  const loc = res.headers?.get?.("location") ?? "";
  const s = res.status;
  if (s >= 300 && s < 400 && /cloudflareaccess\.com|\/cdn-cgi\/access\//i.test(loc))
    return { verdict: "protected", why: `${s} -> Cloudflare Access`, status: s, attempts };
  if (s === 401 || s === 403) return { verdict: "protected", why: `${s}`, status: s, attempts };
  if (s === 200) return { verdict: "public", why: "200 to an anonymous fetch", status: s, attempts };
  if (s >= 300 && s < 400) return { verdict: "unknown", why: `${s} -> ${loc || "(no location)"}`, status: s, attempts };
  return { verdict: "unknown", why: `HTTP ${s}`, status: s, attempts };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--control")) return control();
  const url = argv.find((a) => a.startsWith("http"));
  if (!url) { console.error("assert-reach-live: pass the board's URL."); process.exit(1); }
  const armed = process.env.REACH_BOARD_PROTECTED === "1";

  const r = await probe(url);
  console.log(`\nboard:     ${url}`);
  console.log(`anonymous: ${r.verdict.toUpperCase()} (${r.why}${r.attempts > 1 ? `, ${r.attempts} attempts` : ""})`);
  console.log(`gate:      ${armed ? "ARMED" : "ADVISORY (arm with REACH_BOARD_PROTECTED=1)"}`);

  if (r.verdict === "protected") { console.log(`\nOK  the board is behind Access.\n`); return; }
  if (r.verdict === "public") {
    const msg = `the board answers 200 to anybody. Apply a Cloudflare Access policy to it.`;
    if (armed) { console.error(`\nEXPOSED: ${msg}\n`); process.exit(1); }
    console.log(`\nNOT PROTECTED YET: ${msg}`);
    console.log(`Zero Trust -> Access -> Applications -> Add -> Self-hosted, then arm this gate.\n`);
    return;
  }
  // Unreachable is not evidence of anything. Saying "protected" here would be the
  // failure this repo has made twice: concluding a thing is closed from a probe
  // that simply could not reach it.
  console.log(`\nUNMEASURED: could not tell. ${r.why}\n`);
  if (armed) process.exit(1);
}

function control() {
  const H = (loc) => ({ get: (k) => (k.toLowerCase() === "location" ? loc : null) });
  const cases = [
    ["Access redirect is protected", classify({ status: 302, headers: H("https://x.cloudflareaccess.com/?y") }), "protected"],
    ["cdn-cgi/access redirect is protected", classify({ status: 302, headers: H("/cdn-cgi/access/login/z") }), "protected"],
    ["401 is protected", classify({ status: 401, headers: H("") }), "protected"],
    // The positive control. Without it a classifier that answered "protected" to
    // everything would pass every case above - which is the shape of a gate that
    // cannot fail, and is strictly worse than no gate.
    ["a plain 200 is PUBLIC", classify({ status: 200, headers: H("") }), "public"],
    ["an unrelated redirect is unknown", classify({ status: 302, headers: H("https://example.com/") }), "unknown"],
    ["a 500 is unknown, never protected", classify({ status: 500, headers: H("") }), "unknown"],
  ];
  let bad = 0;
  for (const [name, got, want] of cases) {
    const pass = got.verdict === want;
    if (!pass) bad++;
    console.log(`${pass ? "  ok  " : "FAIL  "}${name}${pass ? "" : `  <- got ${got.verdict}, want ${want}`}`);
  }
  console.log(bad ? `\n${bad} control(s) FAILED\n` : `\nOK  ${cases.length}/${cases.length} controls behaved\n`);
  process.exit(bad ? 1 : 0);
}

const isMain = process.argv[1] && /assert-reach-live\.mjs$/.test(process.argv[1]);
if (isMain) main().catch((e) => { console.error(e.message); process.exit(1); });
