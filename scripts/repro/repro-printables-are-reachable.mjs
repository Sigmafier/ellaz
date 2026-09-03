#!/usr/bin/env node
/**
 * THE PRINTABLE PACKS WERE ORPHANS, AND THIS MEASURES BOTH HALVES OF THE FIX.
 *
 * Measured on the live site 2026-09-03: `/he/print/{sudoku,maze,wordsearch,
 * coloring}/` all returned 200, and the number of anchors pointing at any of
 * them was ZERO - 0 of 47 on `/he/`, 0 of 23 on `/he/games/kids/`. Four pages a
 * teacher would bookmark, reachable only through the sitemap.
 *
 * There are TWO halves and a test can only see one of them at a time:
 *
 *   the emitted #home-doc   what a crawler and a no-JavaScript visitor read,
 *                           and the runtime DELETES it once React mounts
 *   the app's trailing shelf what everybody else sees
 *
 * So this walks the built artifact in a real browser: it reads the emitted
 * markup BEFORE boot, waits for React to remove it, and then finds the app's
 * own row - and shoots a before/after pair by REMOVING that row from the live
 * DOM, which is one tree with one variable rather than two builds.
 *
 *   node scripts/repro/repro-printables-are-reachable.mjs
 *       BASE_URL=http://localhost:5177   the server for dist/
 *       SHOT_DIR=/tmp/printables         where the pair is written
 */
import { mkdirSync } from "node:fs";

/**
 * THIS REPO HAS NO `playwright` DEPENDENCY AND MUST NOT GAIN ONE - the first
 * visit is 610 B gz under its ceiling and every dependency here is one a child
 * downloads. So the driver is imported by PATH from whichever tree already has
 * it, and the failure is a sentence rather than a stack trace, because "cannot
 * find package" reads like a broken script rather than a missing tool.
 */
const PW = process.env.PLAYWRIGHT_PATH ?? "/home/ytr_o/ellaz-sound/node_modules/playwright/index.mjs";
let chromium;
try {
  ({ chromium } = await import(PW));
} catch {
  console.error(
    `\nno playwright at ${PW}\n` +
      `  set PLAYWRIGHT_PATH to an index.mjs in a tree that has it, e.g.\n` +
      `  PLAYWRIGHT_PATH=/home/ytr_o/LimorAI-Limor/node_modules/playwright/index.mjs\n`,
  );
  process.exit(2);
}

const BASE = process.env.BASE_URL ?? "http://localhost:5177";
const SHOT_DIR = process.env.SHOT_DIR ?? "/tmp/printables";
const KINDS = ["sudoku", "maze", "wordsearch", "coloring"];
const SECTION = "דפים להדפסה";

let bad = 0;
const fail = (why) => { console.log(`  FAIL ${why}`); bad++; };
const ok = (why) => console.log(`  ok   ${why}`);

mkdirSync(SHOT_DIR, { recursive: true });
const browser = await chromium.launch();

// ---------------------------------------------------------------- the crawler
// JavaScript OFF is the honest way to read the emitted document: it is what a
// crawler that does not render takes, and it is the half the runtime deletes.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/he/`, { waitUntil: "domcontentloaded" });
  const hrefs = await page.$$eval('#home-doc a[href*="/print/"]', (as) => as.map((a) => a.getAttribute("href")));
  const texts = await page.$$eval('#home-doc a[href*="/print/"]', (as) => as.map((a) => a.textContent.trim()));
  const all = await page.$$eval("#home-doc a", (as) => as.length);
  console.log(`\nthe emitted #home-doc, JavaScript OFF: ${all} anchors, ${hrefs.length} of them printable packs`);
  for (const k of KINDS) {
    if (hrefs.includes(`/he/print/${k}/`)) ok(`/he/print/${k}/ is linked`);
    else fail(`/he/print/${k}/ is NOT linked from the emitted home`);
  }
  // The anchor text is the one part of a link a crawler reads as a description
  // of its target, so a bare game name would be throwing the page away.
  for (const t of texts) {
    if (t.includes("להדפסה")) ok(`anchor text says what the page IS: "${t.slice(0, 34)}..."`);
    else fail(`anchor text is a bare name, not the pack's own heading: "${t}"`);
  }
  // CONTROL: the other languages have no packs and must carry no links.
  for (const loc of ["", "/es", "/fr"]) {
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}${loc}/`, { waitUntil: "domcontentloaded" });
    const n = await p2.$$eval('a[href*="/print/"]', (as) => as.length).catch(() => 0);
    if (n === 0) ok(`CONTROL ${loc || "/"} carries no pack links`);
    else fail(`${loc || "/"} carries ${n} pack link(s) for pages that exist only in Hebrew`);
    await p2.close();
  }
  await ctx.close();
}

// -------------------------------------------------------------------- the app
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/he/`, { waitUntil: "load" });
  // React removes #home-doc once it has mounted over it. Waiting for that is
  // what proves this arm is reading the APP and not the emitted markup again.
  await page.waitForFunction(() => !document.querySelector("#home-doc"), null, { timeout: 15000 })
    .then(() => ok("the runtime removed #home-doc, so what follows is the app"))
    .catch(() => fail("#home-doc was never removed - this arm may be reading the emitted markup"));

  const row = page.locator("#root p", { hasText: SECTION });
  if ((await row.count()) === 1) ok("the app draws exactly one printables row");
  else fail(`the app draws ${await row.count()} printables rows`);

  const appHrefs = await page.$$eval('#root a[href*="/print/"]', (as) => as.map((a) => a.getAttribute("href")));
  for (const k of KINDS) {
    if (appHrefs.includes(`/he/print/${k}/`)) ok(`app links /he/print/${k}/`);
    else fail(`app does NOT link /he/print/${k}/`);
  }

  // Hide the consent bar for the pair. HIDDEN, never clicked: a screenshot must
  // not record a consent decision. Identical in both arms, so it cannot bias it.
  await page.evaluate(() => {
    const bar = [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.position === "fixed" && r.height > 40 && r.height < 260 && el.textContent.includes("לא תודה");
    }).pop();
    if (bar) bar.style.visibility = "hidden";
  });

  const toBottom = () => page.evaluate(() => {
    const p = [...document.querySelectorAll("#root p")].find((x) => x.textContent.includes("📲"));
    let sc = p;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (sc) sc.scrollTop = sc.scrollHeight;
    return sc ? sc.scrollHeight : 0;
  });

  const afterH = await toBottom();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/after.png`, clip: { x: 0, y: 470, width: 390, height: 374 } });
  ok(`AFTER  written, page content ${afterH}px`);

  // BEFORE: the same tree with one variable removed.
  const removed = await page.evaluate((section) => {
    const p = [...document.querySelectorAll("#root p")].find((x) => x.textContent.includes(section));
    if (!p) return 0;
    // OUTER height, margins included. The first version of this returned the
    // border box and then compared it against the page's layout delta, which
    // does include the margin - so it reported a 28px discrepancy that was the
    // row's own `marginTop` and nothing else. The check was wrong, not the code.
    const cs = getComputedStyle(p);
    const h = Math.round(
      p.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom),
    );
    p.remove();
    return h;
  }, SECTION);
  if (removed > 0) ok(`BEFORE arm: removed the row, ${removed}px tall`);
  else fail("BEFORE arm: nothing was removed, so the pair has no variable");
  const beforeH = await toBottom();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/before.png`, clip: { x: 0, y: 470, width: 390, height: 374 } });
  ok(`BEFORE written, page content ${beforeH}px`);

  // WHAT THIS DOES NOT ASSERT, and why. Two earlier versions tried to pin the
  // page's shrinkage to the row's own height - first the border box (96, off by
  // its 28px marginTop) and then the outer box (137, now off the OTHER way by
  // 13). Adjacent margins COLLAPSE, so neither number can be right, and both
  // read as a confident measurement of the code when they were a bug in the
  // check. The invariant that matters is the one below: the row was there, it
  // is gone, and the page got shorter by a sane amount.
  const gone = (await page.locator("#root p", { hasText: SECTION }).count()) === 0;
  if (gone) ok("BEFORE arm really has no printables row");
  else fail("BEFORE arm still shows the row - the pair has no variable");
  const delta = afterH - beforeH;
  if (delta > 0 && delta < 300) ok(`the page is ${delta}px shorter without the row (its box was ${removed}px; margins collapse)`);
  else fail(`page shrank by ${delta}px, which is not one row - the arms differ by something else`);

  await ctx.close();
}

await browser.close();
console.log(`\n${bad === 0 ? "OK" : "FAIL"}  ${bad} problem(s).  pair: ${SHOT_DIR}/before.png ${SHOT_DIR}/after.png`);
process.exit(bad ? 1 : 0);
