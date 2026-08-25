#!/usr/bin/env node
/**
 * THE BETA BADGE, MEASURED ON THE ARTIFACT, IN BOTH DIRECTIONS.
 *
 * `beta-is-declared.test.ts` pins that the badge exists, is derived from one
 * field, says the right words and is not inside the ellipsising breadcrumb.
 * None of that can see WHERE IT LANDS, and where it lands was wrong.
 *
 * Measured 2026-08-25, Hebrew home at 390px: the star badge at [270,290] and
 * the beta badge at [270,305] - the same corner, one drawn over the other -
 * while English had them sixty pixels apart and looking perfect.
 *
 * The cause is worth keeping, because the code reads as if it cannot happen.
 * The star badge is declared `insetInlineStart: 7` with a comment saying that
 * is exactly so it follows the leading edge in both locales - and it also
 * carries `dir="ltr"`, because it holds a DIGIT beside a glyph and the pair
 * reorders. An element's logical insets resolve against its OWN direction, so
 * that `dir` pins the star physically LEFT everywhere and its comment has been
 * describing an intention rather than a behaviour. A logical inset on the beta
 * badge then flips under Hebrew and arrives in the star's corner.
 *
 * So this file measures rather than reads, and it checks the LOCALE THAT IS
 * NOT THE ONE ANYBODY DEVELOPS IN.
 *
 *   node scripts/repro/repro-beta-badge.mjs            (needs :5180 serving dist)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:5180";
const CARDS = [
  ["en  home", `${BASE}/`],
  ["he  home", `${BASE}/he/`],
  ["es  home", `${BASE}/es/`],
];
const PAGES = [
  ["en  page", `${BASE}/games/lettercross/`],
  ["he  page", `${BASE}/he/games/lettercross/`],
  ["fr  page", `${BASE}/fr/games/lettercross/`],
];

let bad = 0;
const fail = (why) => { console.log(`  FAIL ${why}`); bad++; };

const browser = await chromium.launch();

for (const width of [320, 390]) {
  console.log(`\n=== ${width}px ===`);

  for (const [name, url] of CARDS) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const card = page.locator("a:has(.ellaz-beta)").first();
    if (!(await card.count())) { console.log(`${name}  no badged card on this home`); await ctx.close(); continue; }
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const m = await card.evaluate((a) => {
      const box = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: r.width }; };
      const beta = a.querySelector(".ellaz-beta");
      // The star badge: the only other absolutely-positioned child.
      const star = [...a.children].find((e) => e !== beta && getComputedStyle(e).position === "absolute");
      const A = box(a), B = box(beta);
      return {
        card: A, beta: B, star: star ? box(star) : null,
        inside: B.l >= A.l - 0.5 && B.r <= A.r + 0.5,
        // Clipped INSIDE its own pill: no element is wider than its frame and
        // every overflow check reads clean, while the word is cut.
        selfClipped: beta.scrollWidth > Math.ceil(B.w),
      };
    });
    const overlap = m.star && !(m.beta.l >= m.star.r || m.beta.r <= m.star.l);
    console.log(`${name}  card[${m.card.l},${m.card.r}] beta[${m.beta.l},${m.beta.r}]` +
      (m.star ? ` star[${m.star.l},${m.star.r}]` : " star:none"));
    if (!m.inside) fail(`${name}: the badge is outside the card`);
    if (m.selfClipped) fail(`${name}: the badge's word is clipped inside its own pill`);
    if (overlap) fail(`${name}: the beta badge and the star badge are in the same corner`);
    if (!m.star) fail(`${name}: no star badge found - this probe cannot see a collision`);
    await ctx.close();
  }

  for (const [name, url] of PAGES) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const m = await page.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: r.width, sw: e.scrollWidth }; };
      return { bc: box(".urow .bc"), beta: box(".urow .beta"), tools: box(".urow .tools") };
    });
    if (!m.beta) { fail(`${name}: no badge in the utility row`); await ctx.close(); continue; }
    console.log(`${name}  bc[${m.bc.l},${m.bc.r}] beta[${m.beta.l},${m.beta.r}] tools[${m.tools.l},${m.tools.r}]`);
    if (m.beta.sw > Math.ceil(m.beta.w)) fail(`${name}: the badge is ellipsised in the row`);
    const hitsTools = !(m.beta.r <= m.tools.l || m.beta.l >= m.tools.r);
    if (hitsTools) fail(`${name}: the badge overlaps the pause/restart/expand buttons`);
    await ctx.close();
  }
}

await browser.close();
console.log(bad ? `\n${bad} failure(s)` : "\nthe badge lands clear of everything, in every locale, at both widths");
process.exit(bad ? 1 : 0);
