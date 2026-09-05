#!/usr/bin/env node
// The atlas, the manifest and the sheet agree: every frame the manifest
// plays is in the atlas and vice versa, every atlas rect lies inside the
// sheet and overlaps no other, the sheet PNG is the size the atlas claims,
// and every frame cell actually has pixels in it. The last check needs a
// decoder, so it opens the sheet in the same headless Chromium the export
// used - a sheet of the right size with one blank frame is exactly the
// defect a byte-level check cannot see.
//
//   node scripts/assert-atlas-coverage.mjs             # dist-export/
//   node scripts/assert-atlas-coverage.mjs --control   # plant each defect

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { runControls, report } from "./lib/control.mjs";
import { readExport, pngSize } from "./lib/export-index.mjs";

/** Structural checks: names both ways, rects inside, no overlap, PNG size. */
export function checkStructure(name, manifest, atlas, sheetSize) {
  const out = [];
  const inManifest = new Set(Object.values(manifest.animations ?? {}).flatMap((a) => a.frames ?? []));
  const inAtlas = new Set(Object.keys(atlas.frames ?? {}));
  for (const f of inManifest) if (!inAtlas.has(f)) out.push(`${name}: manifest plays "${f}" but the atlas has no such frame`);
  for (const f of inAtlas) if (!inManifest.has(f)) out.push(`${name}: atlas frame "${f}" is played by no clip`);
  const { w: W, h: H } = atlas.meta?.size ?? {};
  if (sheetSize.w !== W || sheetSize.h !== H) out.push(`${name}: sheet PNG is ${sheetSize.w}x${sheetSize.h}, atlas meta.size says ${W}x${H}`);
  const rects = Object.entries(atlas.frames ?? {}).map(([k, f]) => [k, f.frame]);
  for (const [k, r] of rects) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > H) out.push(`${name}: frame "${k}" rect ${JSON.stringify(r)} is outside the ${W}x${H} sheet`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const [ka, a] = rects[i], [kb, b] = rects[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      if (!apart) out.push(`${name}: frames "${ka}" and "${kb}" overlap (${JSON.stringify(a)} vs ${JSON.stringify(b)})`);
    }
  }
  return out;
}

/** Pixel check in a browser page: every atlas rect has at least one opaque pixel. Returns failures. */
async function checkInk(page, name, sheetFile, atlas) {
  const dataUrl = "data:image/png;base64," + readFileSync(sheetFile).toString("base64");
  const rects = Object.entries(atlas.frames).map(([k, f]) => [k, f.frame]);
  const blank = await page.evaluate(async ([url, rs]) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error("sheet failed to decode")); img.src = url; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const out = [];
    for (const [k, r] of rs) {
      const d = x.getImageData(r.x, r.y, r.w, r.h).data;
      let ink = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++;
      if (ink === 0) out.push(k);
    }
    return out;
  }, [dataUrl, rects]);
  return blank.map((k) => `${name}: frame "${k}" is fully transparent on the sheet`);
}

async function scan(page, ex) {
  const out = [];
  for (const s of ex.sets) {
    const name = `${s.character}--${s.style}`;
    out.push(...checkStructure(name, s.manifest, s.atlas, pngSize(s.sheet)));
    out.push(...(await checkInk(page, name, s.sheet, s.atlas)));
  }
  return out;
}

async function blankOneFrame(page, sheetFile, rect) {
  const dataUrl = "data:image/png;base64," + readFileSync(sheetFile).toString("base64");
  const png = await page.evaluate(async ([url, r]) => {
    const img = new Image();
    await new Promise((ok) => { img.onload = ok; img.src = url; });
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    x.clearRect(r.x, r.y, r.w, r.h);
    return c.toDataURL("image/png");
  }, [dataUrl, rect]);
  const dir = mkdtempSync(join(tmpdir(), "studio-atlas-"));
  const f = join(dir, "sheet.png");
  writeFileSync(f, Buffer.from(png.split(",")[1], "base64"));
  return { file: f, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

async function controls(page, ex) {
  const s = ex.sets[0];
  const size = pngSize(s.sheet);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const first = Object.keys(s.atlas.frames)[0];
  const structural = (fn) => { const m = clone(s.manifest), a = clone(s.atlas); fn(m, a); return checkStructure("ctl", m, a, size); };
  const blanked = await blankOneFrame(page, s.sheet, s.atlas.frames[first].frame);
  const blankResult = await checkInk(page, "ctl", blanked.file, s.atlas);
  blanked.cleanup();
  const realInk = await checkInk(page, "real", s.sheet, s.atlas);
  return [
    { name: "the real export's first set (structure)", expect: "PASS", run: () => checkStructure("real", s.manifest, s.atlas, size) },
    { name: "the real export's first set (ink in every frame)", expect: "PASS", run: () => realInk },
    { name: "atlas missing a frame the manifest plays", expect: "FIRE", run: () => structural((_m, a) => delete a.frames[first]) },
    { name: "atlas frame no clip plays", expect: "FIRE", run: () => structural((_m, a) => { a.frames.robot_extra_0000 = clone(a.frames[first]); }) },
    { name: "a rect pushed off the sheet", expect: "FIRE", run: () => structural((_m, a) => { a.frames[first].frame.x = size.w - 1; }) },
    { name: "two rects overlapping", expect: "FIRE", run: () => structural((_m, a) => { const ks = Object.keys(a.frames); a.frames[ks[1]].frame = clone(a.frames[ks[0]].frame); }) },
    { name: "meta.size disagreeing with the PNG", expect: "FIRE", run: () => structural((_m, a) => { a.meta.size.w += 1; }) },
    { name: "one frame cleared to transparent on a copy of the sheet", expect: "FIRE", run: () => blankResult },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ex = readExport();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent("<!doctype html><title>atlas check</title>");
  try {
    if (process.argv.includes("--control")) {
      const cs = await controls(page, ex);
      process.exit(runControls("assert-atlas-coverage", cs) ? 0 : 1);
    }
    const n = ex.sets.reduce((t, s) => t + Object.keys(s.atlas.frames).length, 0);
    process.exit(report("assert-atlas-coverage", `${n} frames across ${ex.sets.length} sheets, structure + pixels`, await scan(page, ex)));
  } finally {
    await browser.close();
  }
}
