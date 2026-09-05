#!/usr/bin/env node
// Every style renders every reference scene in a real browser, produces a
// canvas of the scene's size, and draws something on it. A renderer that
// throws, or one that silently draws nothing, is a red here - not a blank
// tile discovered in the gallery a week later.
//
//   node scripts/assert-render-smoke.mjs             # the real registry x scenes
//   node scripts/assert-render-smoke.mjs --control   # plant defects through the same page
//
// The predicate `judge()` is shared by the real run and the controls, and the
// controls drive the SAME page: an invalid scene must be reported as a
// failure (not skipped), and an empty scene must trip the ink floor.

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openRunner } from "./lib/browser.mjs";
import { runControls, report } from "./lib/control.mjs";

/** Below this many inked samples (of 256) a tile is "blank". Sticker's reference read 228; the floor is generous on purpose. */
export const INK_FLOOR = 100;

/** Failures for one render attempt. `r` is the runner result or `{ error }`. */
export function judge(styleId, sceneId, expected, r) {
  const tag = `${styleId} on ${sceneId}`;
  if (r.error) return [`${tag}: threw: ${r.error}`];
  const out = [];
  if (r.w !== expected.w || r.h !== expected.h) out.push(`${tag}: canvas is ${r.w}x${r.h}, scene is ${expected.w}x${expected.h}`);
  if (!/^data:image\/png;base64,/.test(r.png) || r.png.length < 200) out.push(`${tag}: no PNG came back (${r.png?.length ?? 0} chars)`);
  if (r.inkSamples < INK_FLOOR) out.push(`${tag}: only ${r.inkSamples}/256 sampled pixels carry ink (floor ${INK_FLOOR}) - drew nothing?`);
  return out;
}

async function attempt(page, fn, arg) {
  try {
    return await page.evaluate(fn, arg);
  } catch (e) {
    return { error: String(e?.message ?? e).split("\n")[0] };
  }
}

async function scanReal(page) {
  const styles = await page.evaluate(() => window.studio.styles.map((s) => s.id));
  const scenes = await page.evaluate(() => window.studio.sceneIds);
  const sizes = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
    // a scene's size is a property of the scene, read through a render of the cheapest style
    const r = window.studio.render("flat", id);
    return [id, { w: r.w, h: r.h }];
  })), scenes);
  const out = [];
  let n = 0;
  for (const sceneId of scenes) {
    for (const styleId of styles) {
      const r = await attempt(page, ([st, sc]) => window.studio.render(st, sc), [styleId, sceneId]);
      out.push(...judge(styleId, sceneId, sizes[sceneId], r));
      n++;
    }
  }
  return { failures: out, population: `${n} renders (${styles.length} styles x ${scenes.length} scenes)` };
}

const BLANK = { id: "blank", w: 100, h: 60, ops: [] };
const INVALID = { id: "invalid", w: 100, h: 60, ops: [{ k: "c", x: NaN, y: 0, r: 5, f: "#000", fg: true }] };
const TINY_OK = { id: "tiny", w: 100, h: 60, ops: [{ k: "r", x: 0, y: 0, w: 100, h: 60, f: "#ff4d8d", fg: false, rx: 0 }, { k: "c", x: 50, y: 30, r: 20, f: "#241c3b", fg: true }] };

async function controls(page) {
  const run = async (styleId, scene) => judge(styleId, scene.id, { w: scene.w, h: scene.h }, await attempt(page, ([st, sc]) => window.studio.renderScene(st, sc), [styleId, scene]));
  return [
    { name: "a small valid scene renders on every style", expect: "PASS", run: async () => (await Promise.all((await page.evaluate(() => window.studio.styles.map((s) => s.id))).map((id) => run(id, TINY_OK)))).flat() },
    { name: "an empty scene trips the ink floor", expect: "FIRE", run: () => run("flat", BLANK) },
    { name: "an invalid scene (NaN) is reported as thrown, not skipped", expect: "FIRE", run: () => run("snes16", INVALID) },
    { name: "an unknown style id is reported as thrown", expect: "FIRE", run: () => run("nope", TINY_OK) },
    { name: "a wrong-size result is caught by the predicate", expect: "FIRE", run: () => judge("x", "y", { w: 10, h: 10 }, { w: 10, h: 11, png: "data:image/png;base64," + "A".repeat(300), inkSamples: 200 }) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { browser, page, errors } = await openRunner();
  try {
    if (process.argv.includes("--control")) {
      const cs = await controls(page);
      // runControls is sync; resolve each control's promise first
      const resolved = [];
      for (const c of cs) {
        let r;
        try { r = await c.run(); } catch (e) { r = [`control threw: ${e}`]; }
        resolved.push({ name: c.name, expect: c.expect, run: () => r });
      }
      process.exit(runControls("assert-render-smoke", resolved) ? 0 : 1);
    }
    const { failures, population } = await scanReal(page);
    if (errors.length) failures.push(...errors.map((e) => `page error: ${e}`));
    process.exit(report("assert-render-smoke", population, failures));
  } finally {
    await browser.close();
  }
}

