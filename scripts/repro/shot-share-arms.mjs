/**
 * WHERE the per-game share button sits - two arms, drawn over the REAL page.
 *
 * Operator, 2026-08-25: "the share card in homepage shouldmove from here. we
 * should add per game share options instead", then "eyeball me both options
 * where it would sit". So this is Bookend 1 of
 * ~/.claude/rules/quality/ux-work-mock-first-verify-real.md: an operator-
 * approved mock BEFORE production code, and neither arm is built yet.
 *
 * Both are injected into the built game page rather than hand-drawn beside it.
 * A drawing can disagree with the app; an injection cannot - it inherits the
 * real bar, the real tokens, the real breadcrumb and the real board, so what
 * the operator rules on is what would ship.
 *
 *   A  the UTILITY ROW, beside restart and full screen
 *   B  a POST-WIN PANEL over the board
 *
 * The asymmetry is the finding, not a flaw in the mock: A is one more button
 * in a row that exists, B is a component that does not exist at all -
 * `winMoment()` grants, plays, throws confetti and leaves nothing behind. B is
 * a feature and an interruption to get-straight-back-to-play; A is a button.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = process.argv[2] ?? "dist-after";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };
const serve = (dist) => async (route, request) => {
  let p = normalize(decodeURI(new URL(request.url()).pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, p);
  if (existsSync(file) && !extname(file)) file = join(file, "index.html");
  if (!existsSync(file)) file = join(dist, "404.html");
  if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
  route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body: await readFile(file) });
};

const SHARE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 15V4"/><path d="M8.5 7.2 12 3.8l3.5 3.4"/></svg>`;

// `page.evaluate` serialises the function and CLOSURES DO NOT CROSS, so the
// icon has to be an argument. It failed loudly here; the same mistake on a
// value used only in a style string fails silently and draws a mock that
// misrepresents what would ship.
const ARMS = {
  // A: one more button on the row that already carries restart and full screen.
  a: (SHARE_SVG) => {
    // `.urow > .tools` is the utility row's button group (src/build/layout.ts
    // `utilityRow`). Named exactly rather than guessed at, so this mock cannot
    // quietly draw the button somewhere the real row is not.
    const tools = document.querySelector(".urow .tools");
    if (!tools) throw new Error("no .urow .tools on this page");
    const first = tools.querySelector("button, a");
    const b = document.createElement("button");
    b.type = "button";
    b.className = first ? first.className : "ubtn";
    b.setAttribute("aria-label", "Share");
    b.innerHTML = SHARE_SVG;
    tools.insertBefore(b, first);
  },
  // B: a panel that does not exist. Drawn at the size and place it would take.
  b: (SHARE_SVG) => {
    const stage = document.querySelector(".ellaz-game-stage") ?? document.querySelector("#game-frame");
    const r = stage.getBoundingClientRect();
    const p = document.createElement("div");
    p.style.cssText = `position:fixed;left:${r.left + 10}px;top:${r.top + r.height / 2 - 96}px;width:${r.width - 20}px;
      z-index:50;background:var(--surface,#fff);border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.28);
      padding:18px 16px;text-align:center;font-family:Fredoka,system-ui,sans-serif;color:var(--text,#241C2B)`;
    p.innerHTML = `
      <div style="font-size:34px;line-height:1">🎉</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px">Stage 3 done</div>
      <div style="font-size:14px;opacity:.7;margin-top:2px">Best 1240</div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button style="flex:1;min-height:48px;border:0;border-radius:99px;background:#EE3E76;color:#fff;font:800 16px Fredoka,system-ui,sans-serif">Play again</button>
        <button style="flex:0 0 auto;min-width:48px;min-height:48px;border:0;border-radius:99px;background:var(--surface-2,#F6EFE6);color:inherit;display:flex;align-items:center;justify-content:center">
          <span style="width:22px;height:22px;display:block">${SHARE_SVG}</span>
        </button>
      </div>`;
    document.body.appendChild(p);
  },
};

const browser = await chromium.launch();
for (const [label, apply] of [["none", null], ["A-utility-row", ARMS.a], ["B-win-panel", ARMS.b]]) {
  for (const [name, w, h] of [["390", 390, 844], ["1440", 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await ctx.route("**/*", serve(DIST));
    const page = await ctx.newPage();
    await page.goto("http://ellaz.local/games/snake/", { waitUntil: "load" });
    await page.waitForSelector(".ellaz-game-stage", { timeout: 15000 });
    await page.waitForTimeout(800);
    if (apply) await page.evaluate(apply, SHARE_SVG);
    await page.waitForTimeout(200);
    // Cropped BELOW the platform bar. The two arms differ in where the share
    // BUTTON goes, and the bar above is the same in both - so including it
    // just invites a ruling on the wrong thing.
    await page.screenshot({
      path: `screenshots/share-${label}-${name}.png`,
      clip: { x: 0, y: 58, width: w, height: Math.min(560, h - 58) },
    });
    await ctx.close();
  }
}
await browser.close();
console.log("share arms captured");
