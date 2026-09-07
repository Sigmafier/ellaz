#!/usr/bin/env node
/**
 * What BLOCKS the first paint — read off the SERVED bytes, never off `dist/`.
 * ===========================================================================
 *
 * On 2026-09-07 PageSpeed reported 350 ms (desktop) and 1,300 ms (mobile) of
 * render blocked on `fonts.googleapis.com`, and the home page's `<head>` did
 * not mention fonts at all. Both were true. The request came from the FIRST
 * LINE of our own shell stylesheet:
 *
 *     @import"https://fonts.googleapis.com/css2?family=Heebo…";
 *
 * which makes a five-hop serial chain — document, entry JS, shell CSS, the
 * font CSS, the woff2 — where hops four and five are not discoverable until
 * hop three has downloaded AND parsed. No preload can shorten it, and no
 * preconnect can help a URL nothing has seen yet; Lighthouse said so in its
 * own words ("No additional origins are good candidates for preconnecting").
 *
 * WHY NO EXISTING GATE COULD SEE IT. `npm test`, `build:check`,
 * `assert-payload`, `assert-first-visit`, `assert-pages`, `assert-crawlable`
 * and `assert-live` were every one of them green over this, every day, for
 * months. They read `dist/`, the chunk graph, the emitted documents and the
 * live *asset hashes* — and not one of them reads the first line of a
 * stylesheet or the SHAPE of a served `<head>`. The absence was the defect.
 * That is why this gate fetches, and why it fetches the CSS as well as the
 * HTML: the failure lived one file deeper than anything was looking.
 *
 * ALSO WHY IT IS ITS OWN SCRIPT rather than a branch inside `assert-live`.
 * That one compares built bytes to live bytes; this one reads the shape of a
 * served head. Folding them would make one green tick stand for two unrelated
 * claims, and then neither could be trusted alone.
 *
 * Run `--control` to prove it can still fire. It plants each defect into a
 * synthetic page and requires all of them detected, AND requires the
 * NEAR-MISS cases to stay silent — a first-party `@import` (this repo really
 * has one, `global.css:1` imports `./tokens.css`) and a deferred third-party
 * script are both legitimate, so a matcher that simply banned `@import` or
 * banned third-party scripts would pass every positive test ever written and
 * be wrong.
 */

const ORIGIN = process.env.FAST_ORIGIN ?? "https://ellaz.fun";

/**
 * The three page SHAPES this site emits, not three arbitrary URLs. `/` is the
 * app shell (no inline critical CSS); `/he/` is the same shell in the locale
 * whose font subset differs; a game page is the emitted-document path, which
 * carries an inline <style> AND the shell stylesheet and so has historically
 * been the one that loads the fonts twice.
 */
const PAGES = (process.env.FAST_PAGES ?? "/,/he/,/games/snake/")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

/** The face body text is set in. It is the one that must not arrive late. */
const BODY_FACE = "heebo";

/** Which subset a locale's readers actually render, for the preload check. */
const SUBSET_OF_LOCALE = { he: "hebrew" };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ellaz-fast-check";

let failures = 0;
const fail = (msg) => {
  console.error(`FAIL  ${msg}`);
  failures++;
};
const ok = (msg) => console.log(`  ok  ${msg}`);

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  return { status: res.status, body: await res.text(), url: res.url };
}

const headOf = (html) => {
  const i = html.search(/<\/head>/i);
  return i === -1 ? html : html.slice(0, i);
};

/**
 * Cross-origin relative to the PAGE, which is the only definition that
 * matters: a same-origin request reuses a connection that is already open,
 * a cross-origin one costs a DNS lookup and a TLS handshake first.
 */
function isThirdParty(href, pageUrl) {
  try {
    const u = new URL(href, pageUrl);
    return u.host !== new URL(pageUrl).host;
  } catch {
    return false;
  }
}

/**
 * Both spellings. Source CSS is `@import url("…")`; minified CSS is
 * `@import"…"` with no space and no `url()`, which is what actually ships —
 * a matcher written against the source form alone reads the artifact as
 * clean. This repo has made exactly that mistake before, on a webfont regex.
 */
const IMPORT_RE =
  /@import\s*(?:url\(\s*)?(?:"([^"]*)"|'([^']*)'|([^"')\s;]+))/gi;

/**
 * Read the WHOLE url, then decide. `;` terminates a CSS statement and also
 * appears inside the value we are matching — `wght@400;600;800` — so a
 * pattern that stops at the first `;` reports a URL that is not the URL it
 * matched, and the operator chasing it looks up the wrong request. The first
 * version of this file did exactly that and printed
 * `…css2?family=Heebo:wght@400`, silently dropping two weights and a whole
 * second family. Quoted forms are read to their closing quote; only the bare
 * `url(...)` form may stop at a delimiter.
 * See .claude/rules/a-diagnostic-that-truncates-what-it-compares.md
 */
const importedUrls = (css) =>
  [...css.matchAll(IMPORT_RE)].map((m) => m[1] ?? m[2] ?? m[3]).filter(Boolean);

/** Render-blocking means: a stylesheet with no `media` that excludes screen. */
function blockingStylesheets(head, pageUrl) {
  const out = [];
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const media = tag.match(/media\s*=\s*["']([^"']+)["']/i)?.[1];
    if (media && /^\s*print\s*$/i.test(media)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) out.push(new URL(href, pageUrl).href);
  }
  return out;
}

async function checkPage(path) {
  const pageUrl = new URL(path, ORIGIN).href;
  console.log(`\n${pageUrl}`);
  const page = await get(pageUrl);
  if (page.status !== 200) {
    fail(`${path} answered HTTP ${page.status}`);
    return;
  }
  const head = headOf(page.body);
  const locale = path.split("/").filter(Boolean)[0] ?? "en";

  // 1 — a third-party @import inside anything that blocks render.
  const sheets = blockingStylesheets(head, page.url);
  let imported = 0;
  for (const sheet of sheets) {
    const css = await get(sheet);
    if (css.status !== 200) {
      fail(`${path} — blocking stylesheet ${sheet} answered HTTP ${css.status}`);
      continue;
    }
    for (const href of importedUrls(css.body)) {
      if (!isThirdParty(href, page.url)) continue;
      imported++;
      fail(
        `${path} — ${sheet.replace(ORIGIN, "")} @imports a third-party stylesheet:\n` +
          `        ${href}\n` +
          `        Nothing can preload it: it is not discoverable until this file\n` +
          `        has downloaded and parsed. Name the font in the document head.`,
      );
    }
  }
  if (sheets.length && !imported) ok(`no third-party @import in ${sheets.length} blocking stylesheet(s)`);

  // 1b — a third-party stylesheet linked straight from <head>. Same cost as
  // the @import above and a different code path: on 2026-09-07 a game page
  // carried BOTH, loading the same two families twice over two origins,
  // because `layout.ts` emits a <link> that the app shell never receives and
  // `global.css` @imports the same URL for everyone. Two font paths that can
  // drift is one more than this site can check.
  const foreignSheets = sheets.filter((s) => isThirdParty(s, page.url));
  for (const s of foreignSheets) {
    fail(
      `${path} — render-blocking stylesheet on a third-party origin:\n` +
        `        ${s}\n` +
        `        The first paint waits on a DNS lookup and a TLS handshake to a\n` +
        `        host we do not control. Serve it ourselves.`,
    );
  }
  if (sheets.length && !foreignSheets.length) ok(`all ${sheets.length} blocking stylesheet(s) are first-party`);

  // 2 — a third-party script in <head> that is not deferred.
  let eager = 0;
  for (const tag of head.match(/<script\b[^>]*>/gi) ?? []) {
    const src = tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src || !isThirdParty(src, page.url)) continue;
    if (/\bdefer\b/i.test(tag)) continue;
    eager++;
    fail(
      `${path} — third-party script in <head>, not deferred:\n` +
        `        ${src}\n` +
        `        Every visitor and every audit pays for this before anyone has\n` +
        `        asked for anything. Inject it on the first interaction instead.`,
    );
  }
  if (!eager) ok("no eager third-party script in <head>");

  // 3 — the body face is preloaded from this page's own head.
  const wantSubset = SUBSET_OF_LOCALE[locale];
  const preloads = (head.match(/<link\b[^>]*>/gi) ?? []).filter(
    (t) => /rel\s*=\s*["']?preload/i.test(t) && /as\s*=\s*["']?font/i.test(t),
  );
  const hrefs = preloads.map((t) => t.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? "");
  const body = hrefs.filter((h) => h.toLowerCase().includes(BODY_FACE));
  if (!body.length) {
    fail(
      `${path} — the body face (${BODY_FACE}) is not preloaded in this page's head.\n` +
        `        ${preloads.length} font preload(s) found. A font declared only in CSS\n` +
        `        starts downloading after that CSS parses, which is the whole bug.`,
    );
  } else if (wantSubset && !body.some((h) => h.toLowerCase().includes(wantSubset))) {
    fail(
      `${path} — preloads ${BODY_FACE} but not the '${wantSubset}' subset this locale renders:\n` +
        `        ${body.join(", ")}\n` +
        `        A preload for a subset the reader never draws is pure waste, and\n` +
        `        the subset they DO draw is still discovered late.`,
    );
  } else if (body.some((h) => isThirdParty(h, page.url))) {
    fail(`${path} — the body face is preloaded from a third-party origin: ${body.join(", ")}`);
  } else {
    ok(`body face preloaded${wantSubset ? ` (${wantSubset} subset)` : ""}: ${body.join(", ")}`);
  }
}

/**
 * The controls. A gate is not trustworthy because it is green — it is
 * trustworthy because it was watched going red on a planted defect and
 * staying quiet on a legitimate near-miss.
 */
function control() {
  const CASES = [
    {
      name: "third-party @import in a blocking stylesheet (minified spelling)",
      fires: true,
      css: '@import"https://fonts.googleapis.com/css2?family=Heebo";body{margin:0}',
    },
    {
      name: "third-party @import, source spelling with url()",
      fires: true,
      css: '@import url("https://fonts.googleapis.com/css2?family=X");',
    },
    {
      name: "protocol-relative third-party @import",
      fires: true,
      css: '@import"//fonts.googleapis.com/css2?family=X";',
    },
    // NEAR MISSES. A matcher that merely banned `@import` passes every case
    // above and is wrong: this repo's own global.css:1 imports ./tokens.css.
    { name: "NEAR MISS — first-party relative @import", fires: false, css: '@import "./tokens.css";' },
    {
      name: "NEAR MISS — first-party absolute @import",
      fires: false,
      css: '@import"https://ellaz.fun/assets/tokens.css";',
    },
  ];
  const PAGE = "https://ellaz.fun/";
  let wrong = 0;
  console.log("negative control — planted defects and legitimate near-misses\n");
  for (const c of CASES) {
    let fired = false;
    for (const m of c.css.matchAll(IMPORT_RE)) if (isThirdParty(m[1], PAGE)) fired = true;
    const good = fired === c.fires;
    if (!good) wrong++;
    console.log(`  ${good ? "ok  " : "WRONG"} ${c.name} — ${fired ? "fired" : "silent"}`);
  }

  // The truncation regression, pinned. This is not a hypothetical: the URL
  // below is the real one, and the first version of this gate printed only
  // its first 44 characters.
  const FULL =
    "https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap";
  const read = importedUrls(`@import"${FULL}";`)[0];
  const whole = read === FULL;
  if (!whole) wrong++;
  console.log(
    `  ${whole ? "ok  " : "WRONG"} the matched url is reported WHOLE, not truncated at the first ';'` +
      (whole ? "" : `\n        got: ${read}`),
  );

  const SHEETS = [
    { name: "third-party <link rel=stylesheet> in head", fires: true, href: "https://fonts.googleapis.com/css2?family=X" },
    { name: "NEAR MISS — first-party stylesheet", fires: false, href: "/assets/shell-abc.css" },
  ];
  for (const c of SHEETS) {
    const fired = isThirdParty(c.href, PAGE);
    const good = fired === c.fires;
    if (!good) wrong++;
    console.log(`  ${good ? "ok  " : "WRONG"} ${c.name} — ${fired ? "fired" : "silent"}`);
  }

  const SCRIPTS = [
    { name: "eager third-party script in head", fires: true, tag: '<script async src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>' },
    { name: "NEAR MISS — deferred third-party script", fires: false, tag: '<script defer src="https://cdn.example.com/a.js"></script>' },
    { name: "NEAR MISS — first-party module script", fires: false, tag: '<script type="module" src="/assets/index-abc.js"></script>' },
    { name: "NEAR MISS — inline script, no src", fires: false, tag: "<script>window.dataLayer=[]</script>" },
  ];
  for (const c of SCRIPTS) {
    const tag = c.tag.match(/<script\b[^>]*>/i)[0];
    const src = tag.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    const fired = Boolean(src) && isThirdParty(src, PAGE) && !/\bdefer\b/i.test(tag);
    const good = fired === c.fires;
    if (!good) wrong++;
    console.log(`  ${good ? "ok  " : "WRONG"} ${c.name} — ${fired ? "fired" : "silent"}`);
  }

  console.log(
    wrong === 0
      ? `\nOK  ${CASES.length + SHEETS.length + SCRIPTS.length + 1}/${CASES.length + SHEETS.length + SCRIPTS.length + 1} cases classified correctly.`
      : `\nFAIL  ${wrong} case(s) classified WRONG — this gate cannot be trusted.`,
  );
  process.exit(wrong === 0 ? 0 : 1);
}

async function main() {
  if (process.argv.includes("--control")) return control();
  console.log(`reading what blocks the first paint on ${ORIGIN}`);
  for (const p of PAGES) await checkPage(p);
  if (failures) {
    console.error(`\nFAIL  ${failures} blocking problem(s) on the served pages.`);
    process.exit(1);
  }
  console.log(`\nOK  ${PAGES.length} page(s): nothing third-party blocks the first paint.`);
}

main().catch((e) => {
  console.error(`FAIL  ${e.stack ?? e}`);
  process.exit(1);
});
