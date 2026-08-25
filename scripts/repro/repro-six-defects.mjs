/**
 * The six live defects, measured on a BUILT artifact rather than reasoned about.
 *
 * Run it against either arm:
 *   node scripts/repro/repro-six-defects.mjs dist-before
 *   node scripts/repro/repro-six-defects.mjs dist-after
 *
 * Exits 1 when any defect is still present, so the "after" arm is the gate and
 * the "before" arm is the control that proves each check can actually fire.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = process.argv[2] ?? "dist";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

// No port: see shot-arms.mjs. never-invent-a-port.md forbids picking a free one
// and this repo's own 5180 is routinely held by a dev server.
const serve = (dist) => async (route, request) => {
  let p = normalize(decodeURI(new URL(request.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, p);
  if (existsSync(file) && !extname(file)) file = join(file, "index.html");
  if (!existsSync(file)) file = join(dist, "404.html");
  if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
  route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body: await readFile(file) });
};

const browser = await chromium.launch();
/**
 * A profile with something PLAYED in it, because the defect hides without one.
 *
 * The duplicate boards link was gated on `recent.length > 0`, so a fresh
 * browser context reports ONE link on the broken build and the control looks
 * like it passes. That is this repo's own recorded trap
 * (a-row-that-grows-with-the-catalog-must-wrap.md: "an empty profile hides
 * this bug completely, which is why it survived a screenshot review") and it
 * caught this probe on its first run.
 */
const SEED = {
  v: 1,
  coins: 1240,
  stars: 24,
  owned: [],
  placed: {},
  games: { snake: { lastPlayedAt: 1756000000000 }, memory: { lastPlayedAt: 1755900000000 } },
};

const open = async (path, w, h, seed = false) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route("**/*", serve(DIST));
  if (seed)
    await ctx.addInitScript(`try{localStorage.setItem("ellaz:profile:v1",'${JSON.stringify(SEED)}')}catch{}`);
  const page = await ctx.newPage();
  await page.goto(`http://ellaz.local${path}`, { waitUntil: "load" });
  await page.waitForSelector("header", { timeout: 15000 });
  await page.waitForTimeout(400);
  return { ctx, page };
};

const rows = [];
const check = (id, ok, detail) => rows.push({ id, ok, detail });

// ---- 2, 3, 5: the home screen -------------------------------------------
for (const [w, h] of [[390, 844], [1440, 900]]) {
  // SEEDED: a returning player. See SEED above - a first visit cannot see the
  // duplicate at all, and a 24-star two-digit balance is the width case the
  // stars-only ruling was really about.
  const { ctx, page } = await open("/", w, h, true);

  const boards = await page.$$eval('a[href*="/boards"]', (as) =>
    as.filter((a) => a.offsetParent !== null).map((a) => Math.round(a.getBoundingClientRect().width)),
  );
  check(`${w} boards links`, boards.length === 1, `${boards.length} visible, widths [${boards}]`);

  const wallet = await page.$eval('[aria-label*="coin"], [aria-label*="star"]', (el) => el.getAttribute("aria-label"));
  check(`${w} wallet shows coins`, /coin/i.test(wallet ?? ""), `aria-label="${wallet}"`);

  // THE GLYPH'S CENTRE against the BUTTON's centre. A width check cannot see
  // this: the button is the right size and the svg is simply at the start of
  // its line box. Measured on the rendered rects, never on the source.
  const theme = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => /theme|ערכת|tema/i.test(b.getAttribute("aria-label") ?? ""));
    if (!btn) return null;
    const svg = btn.querySelector("svg");
    if (!svg) return null;
    const b = btn.getBoundingClientRect(), g = svg.getBoundingClientRect();
    return { dx: Math.round((g.left + g.width / 2) - (b.left + b.width / 2)),
             dy: Math.round((g.top + g.height / 2) - (b.top + b.height / 2)) };
  });
  check(`${w} theme glyph centred`, theme !== null && Math.abs(theme.dx) <= 1 && Math.abs(theme.dy) <= 1,
        theme ? `dx=${theme.dx} dy=${theme.dy}` : "no theme button found");

  const over = await page.evaluate(() => {
    const bar = document.querySelector("header");
    if (!bar) return -1;
    return [...bar.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().width > bar.getBoundingClientRect().width + 1).length;
  });
  check(`${w} nothing wider than the bar`, over === 0, `${over} elements`);
  await ctx.close();
}

// ---- 4: the globe on an emitted page ------------------------------------
for (const [path, w] of [["/games/snake/", 390], ["/games/snake/", 1440], ["/world/", 390], ["/boards/", 390], ["/he/games/snake/", 390]]) {
  const { ctx, page } = await open(path, w, 844);
  const g = await page.evaluate(() => {
    const d = document.querySelector("header .lang");
    if (!d) return null;
    const bar = document.querySelector("header .in");
    const sum = d.querySelector("summary").getBoundingClientRect();
    const wal = document.querySelector(".wallet-wrap").getBoundingClientRect();
    const home = document.querySelector(".hbtn.home").getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const rtl = getComputedStyle(document.documentElement).direction === "rtl";
    // "in the trailing group" = nearer the wallet than the home button, in
    // whichever direction this page reads.
    const toWallet = Math.abs((rtl ? sum.left - wal.right : wal.left - sum.right));
    const toHome = Math.abs((rtl ? home.left - sum.right : sum.left - home.right));
    return { toWallet: Math.round(toWallet), toHome: Math.round(toHome), h: Math.round(sum.height), w: Math.round(sum.width), rtl, barW: Math.round(b.width) };
  });
  check(`${path} @${w} globe present`, g !== null, g ? `${g.w}x${g.h}, ${g.toWallet}px from the wallet, ${g.toHome}px from home` : "absent");
  if (g) {
    check(`${path} @${w} globe leads the trailing group`, g.toWallet < g.toHome, `wallet ${g.toWallet} vs home ${g.toHome}`);
    check(`${path} @${w} globe holds the tap target`, g.h >= 44 && g.w >= 44, `${g.w}x${g.h}`);
    // The sheet must OPEN and its links must be real.
    const sheet = await page.evaluate(() => {
      const d = document.querySelector("header .lang");
      d.open = true;
      const s = d.querySelector(".langsheet").getBoundingClientRect();
      const links = [...d.querySelectorAll(".langsheet a")].map((a) => a.getAttribute("href"));
      const cur = d.querySelector(".langsheet b")?.textContent?.trim();
      return { left: Math.round(s.left), right: Math.round(s.right), vw: innerWidth, links, cur };
    });
    // A MARGIN, not merely "not off screen". At 170px wide the sheet's left
    // edge landed at -3 on a 390 phone - inside the tolerance a >= 0 check
    // would have allowed and still flush against the bezel.
    check(
      `${path} @${w} sheet clears both edges`,
      sheet.left >= 4 && sheet.right <= sheet.vw - 4,
      `left ${sheet.left}, right ${sheet.right} of ${sheet.vw}; current "${sheet.cur}"`,
    );
    check(`${path} @${w} sheet offers 3 alternates`, sheet.links.length === 3, `${sheet.links.length}`);
  }
  await ctx.close();
}

await browser.close();
let bad = 0;
for (const r of rows) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.id.padEnd(42)} ${r.detail}`);
}
console.log(`\n${DIST}: ${rows.length - bad}/${rows.length} ok`);
process.exit(bad ? 1 : 0);
