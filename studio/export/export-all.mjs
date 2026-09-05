#!/usr/bin/env node
// Write everything an engine needs into dist-export/:
//
//   sprites/<char>--<style>/<char>--<style>.png          the sheet
//   sprites/<char>--<style>/<char>--<style>.atlas.json   TexturePacker JSON-hash
//   sprites/<char>--<style>/<char>--<style>.manifest.json  the neutral manifest
//   references/<scene>--<style>.png                       every style on every scene
//   palettes/<id>.{json,gpl,hex}
//   index.json                                            what was written, and the build stamp
//
//   node export/export-all.mjs [--scale=2] [--styles=snes16,flat] [--chars=robot]
//
// Every character x every FULL style by default. The build stamp is the
// commit plus "-dirty" when the tree is not clean, the same shape the root
// repo's standalone bundles carry, so a stale export can be told from a
// fresh one by anyone holding the file.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openRunner, pngBytes } from "../scripts/lib/browser.mjs";

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(STUDIO, "dist-export");
const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const scale = Number(opt("scale", "2"));
const onlyStyles = opt("styles", "")?.split(",").filter(Boolean);
const onlyChars = opt("chars", "")?.split(",").filter(Boolean);

export function buildStamp() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: STUDIO, encoding: "utf8" }).trim();
    // pathspec "." from the studio cwd: "studio" would name studio/studio, which does not exist, and read as clean forever
    const dirty = execFileSync("git", ["status", "--porcelain", "--", "."], { cwd: STUDIO, encoding: "utf8" }).trim().length > 0;
    return { commit, dirty, at: new Date().toISOString() };
  } catch {
    return { commit: "unknown", dirty: true, at: new Date().toISOString() };
  }
}

const write = (rel, data) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  return rel;
};

const { browser, page, errors } = await openRunner();
try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const built = buildStamp();
  const index = { built, scale, sprites: [], references: [], palettes: [] };

  const styles = await page.evaluate(() => window.studio.styles);
  const fullStyles = styles.filter((s) => s.tier === "full").map((s) => s.id).filter((id) => onlyStyles.length === 0 || onlyStyles.includes(id));
  const chars = (await page.evaluate(() => window.studio.characterIds)).filter((id) => onlyChars.length === 0 || onlyChars.includes(id));

  for (const ch of chars) {
    for (const st of fullStyles) {
      const r = await page.evaluate(([c, s, sc, b]) => window.studio.exportCharacter(c, s, sc, b), [ch, st, scale, built]);
      const dir = `sprites/${ch}--${st}`;
      const sheet = write(`${dir}/${ch}--${st}.png`, pngBytes(r.sheetPng));
      const atlas = write(`${dir}/${ch}--${st}.atlas.json`, JSON.stringify(r.atlas, null, 2) + "\n");
      const manifest = write(`${dir}/${ch}--${st}.manifest.json`, JSON.stringify(r.manifest, null, 2) + "\n");
      index.sprites.push({ character: ch, style: st, frames: r.frames, sheet, atlas, manifest, sheetSize: r.atlas.meta.size });
      console.log(`${ch.padEnd(7)} ${st.padEnd(7)} ${String(r.frames).padStart(3)} frames  ${r.atlas.meta.size.w}x${r.atlas.meta.size.h}`);
    }
  }

  const scenes = await page.evaluate(() => window.studio.sceneIds);
  for (const sc of scenes) {
    for (const s of styles) {
      const r = await page.evaluate(([st, id]) => window.studio.render(st, id), [s.id, sc]);
      index.references.push(write(`references/${sc}--${s.id}.png`, pngBytes(r.png)));
    }
  }

  for (const p of await page.evaluate(() => window.studio.paletteExports())) {
    index.palettes.push({ id: p.id, json: write(`palettes/${p.id}.json`, p.json), gpl: write(`palettes/${p.id}.gpl`, p.gpl), hex: write(`palettes/${p.id}.hex`, p.hex) });
  }

  write("index.json", JSON.stringify(index, null, 2) + "\n");
  console.log(`${index.sprites.length} sprite sets · ${index.references.length} references · ${index.palettes.length} palettes -> ${OUT}`);
  console.log(`built ${built.commit.slice(0, 12)}${built.dirty ? "-dirty" : ""} (full sha in index.json)`);
  if (errors.length) { console.log(`page errors:\n  ${errors.join("\n  ")}`); process.exitCode = 1; }
} finally {
  await browser.close();
}
