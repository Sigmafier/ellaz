#!/usr/bin/env node
/**
 * Is the LIVE site actually crawlable? The one gate that reads the network.
 * ===========================================================================
 *
 * Every other gate in this repo asserts against `dist/` - `assert-pages`,
 * `assert-precache`, `assert-first-visit`, and the whole test suite. On
 * 2026-08-08 that turned out to be a blind spot the exact size of a real
 * outage: Hostinger's CDN was answering every crawler with a 403 JavaScript
 * challenge while the site loaded perfectly in a browser, Google reported
 * "Sitemap could not be read" with 0 discovered pages, and not one gate here
 * could see it. The artifact on disk was flawless. Nobody was serving it.
 *
 * The toggle that caused it lives in a vendor control panel, so no commit, no
 * build and no deploy touches it - which means git history is structurally
 * blind to the single setting that decides whether this site is indexable.
 * That is what this script is for, and it is why it must run on a SCHEDULE
 * rather than in a build: there is no push to hang it off.
 *
 * WHY THE SITEMAP WALK IS THE TEST, not a separate hammer. The challenge does
 * not arm on the first request - it arms on a run of them from one IP, which
 * is precisely the shape a crawler makes when it reads a sitemap and then
 * fetches what the sitemap lists. Roughly 40 requests in two minutes was
 * enough. So walking all 48 URLs is both the coverage check AND the trigger
 * test, and a separate burst would only be extra load for no extra signal.
 *
 * Read the BODY, never just the status. A challenge is served with a valid
 * `text/html` body and, in the case that started this, HTTP 403 - but a vendor
 * is free to serve one with 200, and then a status-only check reports green
 * over an interstitial. Both are checked, independently.
 */

const ORIGIN = process.env.CRAWL_ORIGIN ?? "https://ellaz.fun";

/** What Googlebot sends. The whole point is to be treated as a crawler. */
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) " +
  "ellaz-crawlability-check";

/** Small, so the walk stays crawl-shaped rather than a denial of service. */
const CONCURRENCY = 4;

let failures = 0;
function fail(msg) {
  console.error(`FAIL  ${msg}`);
  failures++;
}

/**
 * Does this response look like a bot-challenge interstitial?
 *
 * Matched on the BODY, because the status is not reliable: the Hostinger
 * challenge used 403, but nothing stops a vendor serving one with 200, and a
 * status-only check would call that green while a crawler sees nothing.
 * Markers are deliberately vendor-plural - the next one will not be Hostinger.
 */
export function looksLikeChallenge(body) {
  const markers = [
    "checking your browser",
    "just a moment",
    "enable javascript",
    "jschallengeurl",
    "cf-browser-verification",
    "ddos-guard",
    "please wait for up to",
  ];
  const hay = body.slice(0, 4000).toLowerCase();
  return markers.some((m) => hay.includes(m));
}

/** An XML sitemap starts with a declaration or a urlset - never a doctype. */
export function looksLikeXml(body) {
  const head = body.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<?xml") || head.startsWith("<urlset");
}

/** Does robots.txt shut crawlers out of the whole site? */
export function robotsBlocksEverything(txt) {
  // Only the `User-agent: *` group matters here; a `Disallow: /` under a
  // named bot is a deliberate choice, not an outage.
  const lines = txt.split(/\r?\n/).map((l) => l.trim());
  let inStar = false;
  for (const line of lines) {
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      inStar = ua[1].trim() === "*";
      continue;
    }
    const dis = line.match(/^disallow:\s*(.*)$/i);
    if (dis && inStar && dis[1].trim() === "/") return true;
  }
  return false;
}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return { status: res.status, body: await res.text() };
}

/** Fetch `urls` a few at a time, reporting anything a crawler could not read. */
async function walk(urls) {
  let done = 0;
  const queue = [...urls];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      // ONE retry, and only for a transport error - never for a 403 or a
      // challenge, which are answers rather than failures and would say the
      // same thing twice.
      //
      // This exists because the alternative is a daily job that reds on a
      // single flaky socket. Measured on the first live run: 1 of 48 URLs came
      // back "fetch failed", and both immediate re-runs were clean 48/48. A
      // gate that cries wolf gets ignored, and an ignored gate is the exact
      // outcome this script was written to prevent.
      let res;
      try {
        res = await get(url);
      } catch {
        try {
          res = await get(url);
        } catch (err) {
          fail(`${url} — request failed twice: ${err.message}`);
          continue;
        }
      }
      done++;
      // Challenge FIRST, then status. The two overlap - the outage that
      // prompted this served a challenge with 403 - and of the two, only the
      // challenge tells the reader where to go. "HTTP 403" sends someone into
      // the code; "a bot challenge" sends them to the CDN panel, which is the
      // only place the problem has ever actually been.
      if (looksLikeChallenge(res.body)) {
        fail(`${url} — a bot challenge (HTTP ${res.status}), not the page. A crawler cannot solve it.`);
      } else if (res.status !== 200) {
        fail(`${url} — HTTP ${res.status}`);
      }
    }
  });
  await Promise.all(workers);
  return done;
}

/**
 * Fetch, or report and stop.
 *
 * The two opening requests used to be bare `await get(...)`, so an unreachable
 * host threw an unhandled rejection and the whole check died in a Node stack
 * trace - technically red, but the reader gets a module-loader backtrace where
 * they needed the words "the site did not answer". Found by a negative control
 * that reported 0 failures against a dead port, which is the wrong number for
 * a site that is completely down.
 */
async function getOrFail(url, what) {
  try {
    return await get(url);
  } catch (err) {
    fail(`${what} — ${ORIGIN} did not answer: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`crawling ${ORIGIN} as Googlebot\n`);

  // --- robots.txt -----------------------------------------------------------
  const robots = (await getOrFail(`${ORIGIN}/robots.txt`, "robots.txt")) ?? { status: 0, body: "" };
  if (robots.status !== 200 && robots.status !== 0) fail(`robots.txt — HTTP ${robots.status}`);
  else if (looksLikeChallenge(robots.body)) fail("robots.txt — served a bot challenge");
  else if (robotsBlocksEverything(robots.body)) {
    fail("robots.txt disallows / for every crawler — the site is closed to search");
  }

  // --- the sitemap ----------------------------------------------------------
  const sm = (await getOrFail(`${ORIGIN}/sitemap.xml`, "sitemap.xml")) ?? { status: 0, body: "" };
  if (sm.status !== 200 && sm.status !== 0) fail(`sitemap.xml — HTTP ${sm.status}`);
  if (looksLikeChallenge(sm.body)) {
    fail("sitemap.xml — served a bot challenge, so Google reads no sitemap at all");
  } else if (!looksLikeXml(sm.body)) {
    fail(`sitemap.xml — not XML. First bytes: ${JSON.stringify(sm.body.slice(0, 60))}`);
  }

  const urls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

  // A sitemap that parses to zero URLs satisfies every per-URL assertion
  // below forever - the same zero-population trap the other gates refuse.
  if (urls.length === 0) {
    fail("the sitemap lists no URLs — nothing below was actually checked");
  } else {
    console.log(`sitemap: ${urls.length} URLs`);
    const checked = await walk(urls);
    console.log(`walked:  ${checked} URLs as Googlebot`);
  }

  // --- negative controls ----------------------------------------------------
  // Every check above can only be trusted if it is capable of firing. These
  // run the SAME functions over planted input.
  const controls = [
    ["a challenge interstitial", () => looksLikeChallenge("<html><h1>Checking your browser before accessing. Just a moment...</h1>")],
    ["a cloudflare-style challenge", () => looksLikeChallenge("<html><body>cf-browser-verification</body></html>")],
    ["a real page is NOT a challenge", () => !looksLikeChallenge("<html><body>משחק נחש חינם</body></html>")],
    ["html served where XML belongs", () => !looksLikeXml("<!DOCTYPE html><html>")],
    ["real XML passes", () => looksLikeXml('<?xml version="1.0"?><urlset>')],
    ["robots blocking everything", () => robotsBlocksEverything("User-agent: *\nDisallow: /")],
    ["robots allowing everything", () => !robotsBlocksEverything("User-agent: *\nAllow: /")],
    ["a named-bot block is not an outage", () => !robotsBlocksEverything("User-agent: BadBot\nDisallow: /")],
  ];
  let fired = 0;
  for (const [name, probe] of controls) {
    if (probe()) fired++;
    else fail(`negative control DEAD: "${name}" — every result above is void`);
  }
  console.log(`negative control: ${fired}/${controls.length} planted cases detected`);

  if (failures > 0) {
    console.error(
      `\nFAIL  ${failures} problem(s). If these are 403s or challenges, check ` +
        `hPanel → Performance → CDN → Manage → Security BEFORE touching any code: ` +
        `.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`,
    );
    process.exit(1);
  }
  console.log("\nOK  the live site is crawlable: every sitemap URL served a real page.");
}

// Importable for tests without firing the walk.
if (process.argv[1] && process.argv[1].endsWith("assert-crawlable.mjs")) await main();
