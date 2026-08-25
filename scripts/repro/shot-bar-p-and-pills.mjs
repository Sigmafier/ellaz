/**
 * TWO eyeballs for 2026-08-25, both on the real built page.
 *
 *   1. arm P before/after - the operator's pick, shipped rather than mocked.
 *   2. the icon pills in LIGHT mode, which is where they stop reading as
 *      buttons: operator, "the icon are not looking like buttons in light
 *      mode, they lose the card DS".
 *
 * The second is measured rather than eyeballed alone. `--surface-2` on `--bg`:
 *
 *     night   #262b52 on #0f1226   1.37:1   reads as a shape
 *     market  #fff3e0 on #fff6e9   1.02:1   nothing
 *
 * 3:1 is the WCAG floor for a graphical object, so the light pill is not a
 * quiet button, it is an invisible one. The wallet chip 8px away already
 * carries `boxShadow: var(--shadow-1)`, and so does every DS `Button` - the
 * pill is the one button-shaped control in the app without it.
 *
 *   node scripts/repro/shot-bar-p-and-pills.mjs
 */
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const OUT = "screenshots";
const T = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".svg":"image/svg+xml", ".png":"image/png", ".json":"application/json", ".webmanifest":"application/manifest+json", ".woff2":"font/woff2", ".txt":"text/plain", ".xml":"application/xml" };
const serve = (d) => async (r, q) => {
  let p = normalize(decodeURI(new URL(q.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
  let f = join(d, p);
  if (existsSync(f) && !extname(f)) f = join(f, "index.html");
  if (!existsSync(f)) f = join(d, "404.html");
  if (!existsSync(f)) return r.fulfill({ status: 404, body: "" });
  r.fulfill({ status: 200, contentType: T[extname(f)] ?? "application/octet-stream", body: await readFile(f) });
};

/** A real child's wallet, not an empty one and not a fantasy one. */
const SEED = { v:1, coins:1240, stars:24, owned:[], placed:{}, games:{ snake:{ lastPlayedAt: Date.now() } } };

/**
 * A STREAK, seeded on purpose. `DailyChip` renders null until there is one, so
 * a before/after taken on a fresh profile shows two identical bars and proves
 * nothing about whether the chip was removed - the control has to be able to
 * show the thing being removed.
 */
const DAILY = { v: 1, current: 5, longest: 5, days: 5, last: new Date().toISOString().slice(0, 10), paid: 3 };

/**
 * Four treatments for the three icon pills. Applied to the LIVE page, so what
 * is judged is the real control at the real size beside its real neighbours.
 *
 * Every one of them is a shape the repo ALREADY uses somewhere - none is a new
 * invention, which is the point: the pill drifted out of the DS rather than the
 * DS lacking an answer.
 */
const PILLS = {
  "pill-0-as-shipped": {},
  // What `components.tsx` Button and WalletChip both do. One declaration.
  "pill-A-ds-shadow": { boxShadow: "var(--shadow-1)" },
  // The same, on the CARD fill rather than the recessed one, so it reads as a
  // raised chip on the page instead of a dip in it.
  "pill-B-card-fill": { boxShadow: "var(--shadow-1)", background: "var(--surface)" },
  // No shadow, a hairline instead - the quietest thing that still has an edge.
  "pill-C-outline": { border: "1px solid var(--line)" },
};

const paint = (css) => {
  const h = document.querySelector("header");
  // The three round controls: the trophy link and the two buttons beside it.
  const pills = [...h.lastElementChild.children].filter((el) => {
    const b = el.getBoundingClientRect();
    return Math.abs(b.width - b.height) < 2 && b.width > 30;
  });
  for (const el of pills) Object.assign(el.style, css);
  return pills.length;
};

const shoot = async (browser, dist, name, css) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.route("**/*", serve(dist));
  await ctx.addInitScript(({ p, d }) => {
    try {
      localStorage.setItem("ellaz:profile:v1", JSON.stringify(p));
      localStorage.setItem("ellaz:daily:v1", JSON.stringify(d));
    } catch { /* incognito */ }
  }, { p: SEED, d: DAILY });
  const page = await ctx.newPage();
  await page.goto("http://ellaz.local/", { waitUntil: "load" });
  await page.waitForSelector("header", { timeout: 10000 });
  await page.waitForTimeout(900);
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme") ?? "(none - :root default)");
  // The control for the streak seed: a shot whose BEFORE arm never rendered the
  // chip cannot show it being removed.
  const streak = await page.evaluate(() => {
    const h = document.querySelector("header");
    return [...h.lastElementChild.children].length;
  });
  let n = 3;
  if (css) n = await page.evaluate(paint, css);
  await page.waitForTimeout(150);
  // A generous slice: the bar plus the top of the room card under it, so the
  // pill is judged against what is actually behind and below it.
  const box = await page.evaluate(() => {
    const b = document.querySelector("header").getBoundingClientRect();
    return { x: 0, y: 0, width: 390, height: Math.ceil(b.bottom) + 96 };
  });
  await page.screenshot({ path: join(OUT, `${name}.png`), clip: box });
  console.log(`  ${name.padEnd(28)} theme=${theme}  controls=${streak}  pills=${n}  header=${box.height - 96}px`);
  await ctx.close();
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
await shoot(browser, "dist", "bar-before-two-rows", null);
await shoot(browser, "dist-P", "bar-after-arm-P", null);
// THE SHIPPED B, drawn by the app rather than painted on by the step above.
// The mocked B put its fill on the language picker's positioning WRAPPER -
// `border-radius: 0` - so the globe came out a hard-cornered slab between two
// circles, which is a defect in the mock and not in the arm. Shipping it
// through HEADER_PILL puts it on the BUTTON, where the radius already is.
await shoot(browser, "dist-B", "bar-shipped-B", null);
// The streak chip removed - operator, "we dont need it there".
await shoot(browser, "dist-D", "bar-no-streak-chip", null);
for (const [name, css] of Object.entries(PILLS)) await shoot(browser, "dist-P", name, css);
await browser.close();
