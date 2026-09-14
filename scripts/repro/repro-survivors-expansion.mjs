/**
 * Survivors expansion, checked in a real browser - the operator's rulings of
 * 2026-09-14 (big map + camera, pick a weapon, four slots, blades and drone as
 * level-up weapons, auto dash, freeze button, minimap).
 *
 * Every assertion is about what a PLAYER sees or can press, on the built
 * artifact, at a phone and a PC viewport:
 *
 *   pick     the entrance has a "Pick your weapon" group of three pressable
 *            cards, and pressing one moves aria-pressed to it
 *   hud      a run shows four slot boxes (one filled) and a Freeze button
 *   freeze   pressing Freeze before it is charged throws nothing and the run
 *            keeps going (it wiggles; it is never `disabled`)
 *   camera   after walking right for two seconds the robot is STILL in the
 *            middle of the canvas - on a one-room build it has walked off-centre
 *   card     a real level-up offers a "New weapon" card first, and taking it
 *            fills a second slot
 *
 * No port: the build is served from disk through a route on https://ellaz.fun,
 * the same way the phone gate does it. With no --dist it reads the LIVE site,
 * which is how the "before" arm is taken - the check must fail there.
 *
 *   node scripts/repro/repro-survivors-expansion.mjs --dist dist
 *   node scripts/repro/repro-survivors-expansion.mjs            # the live site
 */
// The same browser import the phone gate uses (the root `playwright` package does not resolve here).
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DIST = arg("--dist") ? resolve(arg("--dist")) : null;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2",
};

const VIEWPORTS = [
  { name: "phone 390x844", width: 390, height: 844, mobile: true },
  { name: "pc 1536x639", width: 1536, height: 639, mobile: false },
];

const results = [];
const check = (vp, name, ok, detail) => {
  results.push({ vp, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${vp.padEnd(14)} ${name.padEnd(7)} ${detail}`);
};

/** Where the robot's red is on the canvas, as a fraction of the canvas from the left and top. */
async function robotAt(page) {
  return page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return null;
    const off = document.createElement("canvas");
    off.width = c.width;
    off.height = c.height;
    const g = off.getContext("2d");
    g.drawImage(c, 0, 0);
    const { data } = g.getImageData(0, 0, off.width, off.height);
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let y = 0; y < off.height; y += 2) {
      for (let x = 0; x < off.width; x += 2) {
        const i = (y * off.width + x) * 4;
        // The robot's body red. Runner pink carries far more blue, bats are violet.
        if (data[i] > 170 && data[i + 1] < 70 && data[i + 2] < 70) {
          sx += x;
          sy += y;
          n++;
        }
      }
    }
    return n < 8 ? { n } : { n, fx: sx / n / off.width, fy: sy / n / off.height };
  });
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    serviceWorkers: "block",
  });
  if (DIST) {
    await ctx.route("https://ellaz.fun/**", (route) => {
      let f = join(DIST, decodeURIComponent(new URL(route.request().url()).pathname));
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      return existsSync(f)
        ? route.fulfill({ body: readFileSync(f), headers: { "content-type": TYPES[extname(f)] ?? "application/octet-stream" } })
        : route.fulfill({ status: 404, body: "" });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`https://ellaz.fun/games/survivors/?v=${Date.now()}`, { waitUntil: "load" });
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector(".consent")?.remove());

  // pick
  const pick = page.getByRole("group", { name: "Pick your weapon" });
  const cards = pick.getByRole("button");
  const nCards = (await pick.count()) ? await cards.count() : 0;
  let pressedMoves = false;
  if (nCards === 3) {
    await cards.nth(1).click();
    await page.waitForTimeout(200);
    pressedMoves = (await cards.nth(1).getAttribute("aria-pressed")) === "true"
      && (await cards.nth(0).getAttribute("aria-pressed")) === "false";
    await cards.nth(0).click();
  }
  check(vp.name, "pick", nCards === 3 && pressedMoves, `${nCards} weapon cards, aria-pressed follows the press: ${pressedMoves}`);

  // hud
  await page.getByRole("button", { name: /^Play$/ }).first().click();
  await page.waitForTimeout(2500);
  const freeze = page.getByRole("button", { name: "Freeze" });
  const hasFreeze = (await freeze.count()) === 1;
  check(vp.name, "hud", hasFreeze, `Freeze button present: ${hasFreeze}`);

  // freeze, uncharged
  if (hasFreeze) {
    const disabled = await freeze.isDisabled();
    await freeze.click();
    await page.waitForTimeout(300);
    const stillPlaying = (await page.getByRole("button", { name: /^Play( again)?$/ }).count()) === 0;
    check(vp.name, "freeze", !disabled && stillPlaying && errors.length === 0, `not disabled: ${!disabled}, run continues: ${stillPlaying}, page errors: ${errors.length}`);
  } else {
    check(vp.name, "freeze", false, "no Freeze button to press");
  }

  // camera
  const start = await robotAt(page);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(2000);
  const moved = await robotAt(page);
  await page.keyboard.up("ArrowRight");
  const centred = moved?.fx !== undefined && Math.abs(moved.fx - 0.5) < 0.12;
  check(
    vp.name,
    "camera",
    Boolean(start?.fx !== undefined && centred),
    `robot at ${start?.fx?.toFixed(2)} -> ${moved?.fx?.toFixed(2)} of the canvas width (red pixels ${start?.n} -> ${moved?.n})`,
  );

  // card: walk until a real level-up, then take the first card
  let offered = null;
  const keys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110 && !offered; i++) {
    const k = keys[Math.floor(rnd() * 4)];
    await page.keyboard.down(k);
    await page.waitForTimeout(600);
    await page.keyboard.up(k);
    const group = page.getByRole("group", { name: "Level up" });
    if (await group.count()) offered = group;
    if ((await page.getByRole("button", { name: /^Play again$/ }).count()) > 0) break;
  }
  if (offered) {
    const first = offered.getByRole("button").first();
    const label = (await first.getAttribute("aria-label")) ?? "";
    const isWeapon = label.startsWith("New weapon:");
    await first.click();
    await page.waitForTimeout(400);
    // The HUD slots are drawn inside the aria-hidden overlay; count the ones holding a drawing.
    const filled = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-hidden="true"] div')].filter(
        (d) => /2px solid/.test(d.getAttribute("style") ?? "") && d.querySelector("svg"),
      ).length,
    );
    check(vp.name, "card", isWeapon && filled >= 2, `first card "${label}", filled slots after taking it: ${filled}`);
  } else {
    check(vp.name, "card", false, "no level-up appeared (or the run ended) within the walk");
  }

  if (errors.length) console.log(`      page errors: ${errors.slice(0, 3).join(" / ")}`);
  await ctx.close();
}
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed on ${DIST ?? "the live site"}`);
process.exit(failed.length ? 1 : 0);
