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
 *
 * AND READ HOW MUCH BODY. A 200 carrying the whole correct document and no
 * content is the third shape of this failure, and it is the one a status check
 * can never see. Measured on the live site 2026-08-11: `https://ellaz.fun/` -
 * the canonical Hebrew home, the x-default target, the most linked URL here -
 * served a 29-byte body of `<div id="root"></div>` while `/en/`, emitted as a
 * real document, served 252 words and 26 links. Every gate in this repo read
 * `dist/`, where both are correct, so the asymmetry stood for months.
 *
 * That is not merely slow indexing. Googlebot renders JavaScript; the answer
 * engines do not. Vercel's analysis of 500M+ GPTBot fetches found zero
 * JavaScript execution, and Anthropic documents the same of its own fetcher.
 * So a client-rendered page is ABSENT from every answer engine while ranking
 * normally in Google, which is exactly why nobody notices.
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

/**
 * What a non-rendering crawler actually gets: words, links and headings, from
 * the BODY of the raw HTML.
 *
 * Three exclusions, and every one of them is load-bearing rather than tidiness:
 *
 *   BODY ONLY.  This is the one that matters here, and the reading that proves
 *               it is surprising: `https://ellaz.fun/` scores 96 WORDS with
 *               tags stripped across the whole document, on a body of 29
 *               bytes. Every one of those 96 is an HTML comment in the HEAD,
 *               explaining why the viewport tag allows pinch-zoom. So a floor
 *               set anywhere under 96 passes an empty shell forever, and the
 *               number looks reassuringly non-zero while it does. The head is
 *               metadata; counting it measures the SEO tags, not the page.
 *   NO COMMENTS. Narrower than it looks, and worth stating precisely rather
 *               than as a general tidiness rule: the generic `<[^>]*>` strip
 *               below already eats any comment with no `>` inside it. This
 *               line earns its place on comments that DO contain one - a
 *               `<div>`, an `->`, an `=>` - where the generic strip stops at
 *               that first `>` and leaves the tail behind as countable prose.
 *               Common enough in real comments to be worth the line.
 *   NO SCRIPT.  JSON-LD is a block of prose to a tag-stripper. A page can carry
 *               a rich `ItemList` and show a visitor nothing.
 *
 * Returns counts rather than a verdict, so the caller decides what a floor is
 * and this stays testable against planted input.
 */
export function bodyStats(html) {
  // Index arithmetic, NOT a regex, and that is a fix rather than a style choice.
  //
  // This was `/<body[^>]*>([\s\S]*)<\/body>/i`, which is QUADRATIC on input
  // holding many `<body` and no `</body>`: the engine retries from every start,
  // drives the greedy `[\s\S]*` to end-of-input, then backtracks one character
  // at a time hunting a close tag that is not there. Measured, doubling the
  // input roughly quadrupled the time - 15 KB took 77 ms and 117 KB took 8.8 s.
  //
  // No live page can reach it (every one carries exactly one balanced pair, and
  // the largest is 38 KB), so this is a robustness fix and not an outage. It is
  // still worth making, because this is the one gate here whose whole job is to
  // notice when the server serves something we did not build - malformed input
  // is the case it exists FOR, so it must not be the case that stalls it.
  //
  // indexOf/lastIndexOf cannot backtrack, so the shape is gone rather than
  // tuned. `lastIndexOf` preserves the old greedy behaviour of taking the LAST
  // `</body>`, which a test pins.
  const lower = html.toLowerCase();
  const open = lower.indexOf("<body");
  const gt = open === -1 ? -1 : html.indexOf(">", open);
  const close = lower.lastIndexOf("</body>");
  const body = gt !== -1 && close > gt ? html.slice(gt + 1, close) : "";
  const markup = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = markup
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    words: text ? text.split(" ").length : 0,
    links: (markup.match(/<a\s[^>]*href=/gi) ?? []).length,
    h1: (markup.match(/<h1[\s>]/gi) ?? []).length,
  };
}

/**
 * The floor a page in the SITEMAP has to clear.
 *
 * Every URL, with no per-page allowlist. A sitemap entry is a request that
 * Google index that URL, so "this one is allowed to be empty" is a
 * contradiction rather than an exception - and an allowlist is the thing that
 * would quietly grow to cover the next shell.
 *
 * 60 WORDS, and the number moved once already for a reason worth keeping.
 *
 * It was 120, set against "the thinnest content page runs ~750 words". That
 * stopped being true the same afternoon: the fix for the empty home emits a
 * deliberately compact document - 130 words, 22 links - so `/` became the
 * thinnest page on the site and cleared the floor by TEN WORDS. A gate with 8%
 * margin against real, correct content is not a gate, it is a tripwire under
 * the copy: trim a sentence from the Hebrew home and the daily email reds on a
 * page that is completely fine, which is how a daily email stops being read.
 *
 * And the margin was even thinner than it looked, because the 130 was measured
 * by the emitter's author and 130 here means whatever THIS function counts.
 * Two implementations of "how many words" agree until they do not.
 *
 * So: far enough below the thinnest legitimate page to survive an edit, and
 * still nowhere near a shell, which scores 0 and always will. The distance to
 * catch is 0-vs-a-real-page, and that gap is a chasm at any floor in this
 * range - there was never any value in the extra 60.
 */
const CONTENT_FLOOR = { words: 60, links: 3, h1: 1 };

/**
 * Is this page empty to a crawler? Its own function so a control can fire the
 * real comparison rather than a copy of it written in the test.
 */
export function belowFloor(s) {
  return s.words < CONTENT_FLOOR.words || s.links < CONTENT_FLOOR.links || s.h1 < CONTENT_FLOOR.h1;
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
  /** Pages that answered like a page and carried nothing. See CONTENT_FLOOR. */
  const thin = [];
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
      } else {
        // Only measure a page that answered like one. Reporting "0 words" for
        // a 403 would bury the real finding under a symptom of it.
        const s = bodyStats(res.body);
        if (belowFloor(s)) thin.push({ url, ...s });
      }
    }
  });
  await Promise.all(workers);
  return { done, thin };
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
    const { done: checked, thin } = await walk(urls);
    console.log(`walked:  ${checked} URLs as Googlebot`);

    // --- the content floor ---------------------------------------------------
    // ADVISORY BY DEFAULT, and deliberately so. This check was written while a
    // known offender was live, and a gate that reds on day one for something
    // nobody can fix that day teaches its reader to ignore the daily email -
    // which is the failure this whole script exists to prevent. So it reports
    // the number every run and fails only when armed.
    //
    // ARM IT with `CRAWL_CONTENT_FLOOR=1` in .github/workflows/crawlable.yml,
    // in the same change that makes the last offender pass. One line, and the
    // reversible half is already proven by then.
    const armed = process.env.CRAWL_CONTENT_FLOOR === "1";
    if (thin.length === 0) {
      console.log(
        `content: all ${checked} URLs carry a real body ` +
          `(>=${CONTENT_FLOOR.words} words, >=${CONTENT_FLOOR.links} links, >=${CONTENT_FLOOR.h1} h1)`,
      );
    } else {
      const lines = thin
        .map((t) => `    ${t.words} words, ${t.links} links, ${t.h1} h1  ${t.url}`)
        .join("\n");
      const headline =
        `${thin.length} of ${checked} URLs are EMPTY to a non-rendering crawler ` +
        `(GPTBot, ClaudeBot, Perplexity - none of them run JavaScript):`;
      if (armed) fail(`${headline}\n${lines}`);
      else console.log(`\nADVISORY  ${headline}\n${lines}\n  (not failing: CRAWL_CONTENT_FLOOR is unset)`);
    }
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

    // --- the content floor, planted five ways --------------------------------
    // The first is the real thing: the shape ellaz.fun/ served on 2026-08-11,
    // a comment-heavy head over a 29-byte body. It is the control that matters,
    // because a whole-document word count reads 96 on it and looks healthy.
    [
      "the real app shell reads as empty",
      () =>
        bodyStats(
          `<html><head><!-- ${"explanation ".repeat(200)}--></head>` +
            `<body class="app-shell">  <div id="root"></div>  </body></html>`,
        ).words === 0,
    ],
    ["...and the floor rejects it", () => belowFloor({ words: 0, links: 0, h1: 0 })],
    // This control took two tries and both failures are the point.
    //
    // Draft 1 put the comment in the HEAD, so body-only already handled it and
    // deleting the comment-strip left the control green. Draft 2 moved it into
    // the body and STILL passed, because a comment with no `>` in it is eaten
    // by the generic tag strip anyway. Only a comment containing `>` - here an
    // `<aside>` and an `->` - reaches the line this control exists to guard.
    //
    // Reading the code would not have found either. Planting the defect did,
    // twice, and the second one also corrected what the doc comment above
    // claimed about which exclusion was carrying the weight.
    // The only control here that measures TIME, and it exists because a planted
    // mutation restoring the old quadratic regex survived all sixteen others.
    // It had to: that regex is functionally CORRECT and merely slow, so no
    // correctness control can see it, and the fix could be reverted in a
    // refactor with no signal at all.
    //
    // The margin is the whole design. This input took 8,785 ms before the fix
    // and 9.7 ms after - roughly 900x. A 2,000 ms budget is ~200x headroom over
    // the healthy path, so a loaded CI runner cannot trip it, while the
    // regression overshoots by 4x. A tight timing assertion would be a flaky
    // control, and a flaky control teaches its reader to ignore the whole file.
    [
      "the body scan is linear, not quadratic (<2000ms on 117KB)",
      () => {
        const t0 = process.hrtime.bigint();
        bodyStats("<body>".repeat(20_000));
        return Number(process.hrtime.bigint() - t0) / 1e6 < 2000;
      },
    ],
    // The body ends at the LAST `</body>`, not the first. A `</body>` can appear
    // earlier inside an attribute value or a script string, and stopping there
    // truncates the body and under-counts a page that is fine - a FALSE RED on
    // the daily email, which is the failure mode this whole script guards.
    //
    // This control exists because a planted mutation swapping lastIndexOf for
    // indexOf SURVIVED the other fourteen. The comment on bodyStats had claimed
    // the behaviour was pinned by a test; it was pinned in a scratch harness and
    // not here, which is the same thing as not pinned.
    [
      "the body ends at the LAST </body>, not the first",
      () => bodyStats("<body><p>a</p></body><p>beta gamma delta</p></body>").words === 4,
    ],
    [
      "a body comment containing '>' is not content",
      () =>
        bodyStats(
          `<body><!-- see <aside> and a -> b: ${"explanation ".repeat(200)}-->` +
            `<div id="root"></div></body>`,
        ).words === 0,
    ],
    [
      "head prose never counts as page content",
      () =>
        bodyStats(
          `<html><head><title>${"word ".repeat(300)}</title>` +
            `<meta name="description" content="${"word ".repeat(300)}" /></head>` +
            `<body><div id="root"></div></body></html>`,
        ).words === 0,
    ],
    [
      "JSON-LD in the body is markup, not prose",
      () =>
        bodyStats(
          `<body><script type="application/ld+json">{"name":"${"word ".repeat(300)}"}</script>` +
            `<div id="root"></div></body>`,
        ).words === 0,
    ],
    // The emitted Hebrew home, at its measured size. This control is the whole
    // reason the floor is 60 and not 120: at 120 this case passed by ten words,
    // and the next edit to that copy would have reded the daily email on a page
    // that was correct. Pinning it here means a future floor raise has to walk
    // past a control named after the page it would break.
    [
      "the compact emitted home clears the floor with room",
      () => {
        // 1 (h1) + 107 (paragraph) + 22 (link labels) = the 130 that was
        // reported. Note the link labels COUNT: a first draft of this fixture
        // put 129 words in the paragraph and measured 152, which is the same
        // two-implementations-of-word-count problem this floor was lowered for,
        // reproduced inside its own control. Worth leaving written down.
        const s = bodyStats(
          `<body><h1>משחקים</h1><p>${"מילה ".repeat(107)}</p>` +
            Array.from({ length: 22 }, (_, i) => `<a href="/games/g${i}/">ג</a>`).join("") +
            `</body>`,
        );
        // The `* 2` is the load-bearing half. Without it this passes at a floor
        // of 120 - by ten words - and the control stops guarding the thing it
        // is named after.
        return s.words === 130 && s.links === 22 && !belowFloor(s) && s.words >= CONTENT_FLOOR.words * 2;
      },
    ],
    [
      "a real emitted page clears the floor",
      () => {
        const s = bodyStats(
          `<body><h1>משחק נחש</h1><p>${"מילה ".repeat(200)}</p>` +
            `<a href="/">א</a><a href="/en/">ב</a><a href="/world/">ג</a><a href="/boards/">ד</a></body>`,
        );
        return !belowFloor(s) && s.h1 === 1 && s.links === 4;
      },
    ],
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
