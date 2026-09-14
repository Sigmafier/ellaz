#!/usr/bin/env node
/**
 * Can a player SEE and REACH every control of every game, on every PC window?
 *
 *   node scripts/repro/repro-controls-stay-on-screen.mjs --dist dist-x   # a build on disk
 *   node scripts/repro/repro-controls-stay-on-screen.mjs --base https://ellaz.fun
 *   node scripts/repro/repro-controls-stay-on-screen.mjs --only coloring,maze --control
 *
 * WHY THIS EXISTS (2026-09-14)
 *
 * `repro-board-fills-the-window.mjs` went green on all 43 games the day every game
 * got a PC layout - and on that same live site coloring's colours were cut off the
 * bottom of a 1024x768 window, its pictures scrolled sideways past the screen edge,
 * jigsaw's piece tray hung out of its column and maze's right arrow sat under the
 * window edge. The board gate measures the BOARD. Nothing measured the controls
 * beside it, so a whole class of defect had no instrument at all. The operator found
 * it by looking: "i see the colors ... are out of the screen".
 *
 * WHAT IT ASSERTS, per game x PC window
 *
 *   every visible control inside the game panel - button, link, input, select,
 *   role=button/slider/radio, tabindex - and every child and grandchild of the
 *   game's footer and side column is
 *
 *     ON SCREEN   its box lies inside the window, not past an edge
 *     UNCLIPPED   no ancestor with overflow != visible hides any of it - a control
 *                 behind a scrollbar is a control the player does not know exists
 *
 *   within TOL px. The rect is read post-transform on purpose: what matters here is
 *   where the player sees it, not its layout box.
 *
 * SCOPE, said out loud so a green run is not read as more than it is
 *
 *   - PC windows only. A phone scrolls its page and a sideways strip is a phone
 *     idiom; that arm needs its own rules and is not claimed here.
 *   - The state a game shows on arrival. A control that only appears mid-round is
 *     not in the population.
 *   - The game panel only. Platform chrome has its own gates.
 */
import { chromium } from "file:///mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/studio/node_modules/playwright-core/index.mjs";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const BASE = (argOf("--base") ?? "http://localhost:5180").replace(/\/$/, "");
const DIST = argOf("--dist");
const ONLY = argOf("--only")?.split(",");
const CONTROL = process.argv.includes("--control");
const TOL = 2;

/* Every window a PC player plausibly has, smallest first. 1024x768 is the one
 * that found coloring; 1536x639 is the operator's own browser window. */
const WINDOWS = [
  [1024, 768],
  [1280, 720],
  [1366, 768],
  [1536, 639],
  [1920, 1080],
];

const GAMES_DIR = fileURLToPath(new URL("../../src/games/", import.meta.url));
const ids = readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${GAMES_DIR}${d.name}/meta.ts`))
  .map((d) => readFileSync(`${GAMES_DIR}${d.name}/meta.ts`, "utf8").match(/^\s*id:\s*"([^"]+)"/m)?.[1])
  .filter(Boolean)
  .sort();
if (ids.length < 40) throw new Error(`read only ${ids.length} game ids from ${GAMES_DIR} - refusing a partial population`);
const GAMES = ids.filter((id) => !ONLY || ONLY.includes(id));
if (ONLY && GAMES.length !== ONLY.length) throw new Error(`--only names a game that does not exist: ${ONLY.filter((g) => !ids.includes(g))}`);

/** In the page: every control that is cut, and the population it was drawn from. */
function probe(tol) {
  const panel = document.querySelector(".ellaz-game-panel");
  if (!panel) return { error: "no .ellaz-game-panel on this page" };
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const CONTROLS =
    "button, a[href], input, select, textarea, [role=button], [role=slider], [role=radio], [tabindex]:not([tabindex='-1'])";
  const set = new Set(panel.querySelectorAll(CONTROLS));
  for (const col of panel.querySelectorAll(".ellaz-game-footer, .ellaz-game-side"))
    for (const el of col.querySelectorAll(":scope > *, :scope > * > *")) set.add(el);

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null; // sr-only and collapsed things
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return null;
    }
    return r;
  };
  const label = (el) => {
    const t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "";
    return `${el.tagName.toLowerCase()}${cls}${t ? ` "${t}"` : ""}`;
  };

  /* A thing the BOARD clips is a game object entering or leaving play - a balloon
   * rising from under the arena's bottom edge is the game working. So a clip by an
   * ancestor strictly inside the play surface drops the element from the
   * population; a clip anywhere else is a control the player cannot see. */
  const surface = panel.querySelector(".ellaz-play-surface");
  let population = 0, inPlay = 0;
  const cut = [];
  for (const el of set) {
    const r = visible(el);
    if (!r) continue;
    let verdict = null;
    // A position:fixed box escapes every overflow clip above it, so the walk stops there.
    for (let m = el, n = el.parentElement; n && n !== document.body && getComputedStyle(m).position !== "fixed"; m = n, n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const a = n.getBoundingClientRect();
      const left = a.left + parseFloat(cs.borderLeftWidth);
      const top = a.top + parseFloat(cs.borderTopWidth);
      // clientWidth/Height are layout px; scale them by the ancestor's own transform.
      const sx = n.offsetWidth ? a.width / n.offsetWidth : 1;
      const sy = n.offsetHeight ? a.height / n.offsetHeight : 1;
      const hidden = Math.max(left - r.left, r.right - (left + n.clientWidth * sx), top - r.top, r.bottom - (top + n.clientHeight * sy));
      if (hidden > tol) {
        verdict = surface && surface !== n && surface.contains(n)
          ? "in-play"
          : `${label(el)} is ${Math.round(hidden)}px hidden inside ${label(n)} (overflow ${cs.overflowX}/${cs.overflowY})`;
        break;
      }
    }
    if (verdict === "in-play") {
      inPlay++;
      continue;
    }
    population++;
    const past = Math.max(-r.left, r.right - vw, -r.top, r.bottom - vh);
    if (verdict) cut.push(verdict);
    else if (past > tol) cut.push(`${label(el)} is ${Math.round(past)}px off the window`);
  }
  return { population, inPlay, cut };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1, serviceWorkers: "block" });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("ellaz:consent:v1", "denied");
  } catch {}
});
if (DIST) {
  const TYPES = { html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml", png: "image/png", webp: "image/webp", woff2: "font/woff2", webmanifest: "application/manifest+json" };
  await ctx.route(`${new URL(BASE).origin}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = `${DIST.replace(/\/$/, "")}${path}`;
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "not in dist" });
    route.fulfill({ status: 200, contentType: TYPES[path.split(".").pop()] ?? "application/octet-stream", body: readFileSync(file) });
  });
}
const page = await ctx.newPage();

async function load(id, w, h) {
  await page.setViewportSize({ width: w, height: h });
  // Three tries: a network blip must read as a blip, never as a verdict.
  for (let i = 0; ; i++) {
    try {
      await page.goto(`${BASE}/games/${id}/`, { waitUntil: "load", timeout: 45000 });
      break;
    } catch (e) {
      if (i === 2) throw e;
      await page.waitForTimeout(2000);
    }
  }
  await page.waitForTimeout(1500);
}

const rows = [];
for (const id of GAMES)
  for (const [w, h] of WINDOWS) {
    try {
      await load(id, w, h);
      rows.push({ id, win: `${w}x${h}`, ...(await page.evaluate(probe, TOL)) });
    } catch (e) {
      rows.push({ id, win: `${w}x${h}`, error: String(e).split("\n")[0].slice(0, 120) });
    }
  }

/* The control proves both verdicts are reachable. A gate that is green today is
 * otherwise indistinguishable from a gate that cannot fire. */
const control = [];
const probeIn = (setup) =>
  page.evaluate(
    ([setup, tol, src]) => {
      const undo = new Function(setup)();
      const r = new Function(`return (${src})`)()(tol);
      undo();
      return r;
    },
    [setup, TOL, probe.toString()],
  );
if (CONTROL)
  try {
    await load("sudoku", 1280, 720);
    const clean = await probeIn("return () => {}");
    control.push({ cell: "sudoku as shipped is clean", ok: !clean.error && clean.cut.length === 0 && clean.population > 5, got: `${clean.population} controls, ${clean.cut?.length} cut` });
    const css = (rule) => `const s = document.createElement("style"); s.textContent = ${JSON.stringify(rule)}; document.head.appendChild(s); return () => s.remove();`;
    const pushed = await probeIn(
      `const b = document.createElement("button"); b.textContent = "past"; b.style.cssText = "position:fixed;left:1260px;top:100px;width:60px;height:40px"; document.querySelector(".ellaz-game-footer").appendChild(b); return () => b.remove();`,
    );
    control.push({ cell: "a control past the window's right edge is caught", ok: pushed.cut.some((c) => c.includes('"past" is 40px off the window')), got: pushed.cut.find((c) => c.includes("past")) ?? "nothing" });
    const clipped = await probeIn(css(".ellaz-game-footer { max-height: 40px !important; overflow: auto !important }"));
    control.push({ cell: "a footer behind a scrollbar is caught", ok: clipped.cut.some((c) => c.includes("hidden inside")), got: clipped.cut[0] ?? "nothing" });
    const srOnly = await probeIn(
      `const b = document.createElement("button"); b.textContent = "sr"; b.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0)"; document.querySelector(".ellaz-game-panel").appendChild(b); return () => b.remove();`,
    );
    control.push({ cell: "a 1px screen-reader-only control is NOT flagged", ok: srOnly.cut.length === 0, got: srOnly.cut[0] ?? "nothing flagged" });
    // near-miss: the same button at a real size must be flagged, or the cell above passes for the wrong reason
    const big = await probeIn(
      `const b = document.createElement("button"); b.textContent = "big"; b.style.cssText = "position:absolute;left:-9999px;width:60px;height:40px"; document.querySelector(".ellaz-game-panel").appendChild(b); return () => b.remove();`,
    );
    control.push({ cell: "the same control at 60x40 IS flagged", ok: big.cut.some((c) => c.includes('"big"')), got: big.cut[0] ?? "nothing" });
  } catch (e) {
    control.push({ cell: "the control cells ran at all", ok: false, got: String(e).slice(0, 140) });
  }

await browser.close();

const measured = rows.filter((r) => !r.error);
console.log(`\npopulation: ${GAMES.length} games x ${WINDOWS.length} PC windows = ${rows.length} arms, ${measured.reduce((n, r) => n + r.population, 0)} controls, base ${DIST ? `${BASE} <- ${DIST}` : BASE}`);
const bad = rows.filter((r) => r.error || r.cut.length);
for (const r of bad) {
  if (r.error) console.log(`  ERROR ${r.id} @ ${r.win}: ${r.error}`);
  else {
    console.log(`  ${r.id} @ ${r.win}: ${r.cut.length} of ${r.population} controls cut`);
    for (const c of r.cut.slice(0, 4)) console.log(`      ${c}`);
    if (r.cut.length > 4) console.log(`      ... and ${r.cut.length - 4} more`);
  }
}
const badGames = [...new Set(bad.map((r) => r.id))];
console.log(`\nfailures: ${bad.length} of ${rows.length} arms, in ${badGames.length} games${badGames.length ? ": " + badGames.join(", ") : ""}`);
if (CONTROL) {
  console.log("\ncontrol:");
  for (const c of control) console.log(`  ${c.ok ? "OK  " : "FAIL"} ${c.cell}  (${c.got})`);
}
process.exit(bad.length || control.some((c) => !c.ok) ? 1 : 0);
