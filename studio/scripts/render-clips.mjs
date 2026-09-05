#!/usr/bin/env node
// Render every character's clips as strips, one PNG per clip per
// style, so an animation can be eyeballed before any export exists.
//
//   node scripts/render-clips.mjs [outDir] [--styles snes16,flat]   default: shots/clips/, full styles
//
// Each strip is the clip's frames side by side on the reference ground.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openRunner, pngBytes } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith("--")) ?? "shots/clips");
const stylesArg = args.find((a) => a.startsWith("--styles="))?.slice(9);
mkdirSync(out, { recursive: true });

const { browser, page, errors } = await openRunner();
try {
  const styles = stylesArg ? stylesArg.split(",") : await page.evaluate(() => window.studio.styles.filter((s) => s.tier === "full").map((s) => s.id));
  const chars = await page.evaluate(() => window.studio.characterIds);
  let n = 0;
  for (const ch of chars) {
    for (const styleId of styles) {
      const strips = await page.evaluate(([c, st]) => window.studio.renderClipStrips(c, st, 2), [ch, styleId]);
      for (const s of strips) {
        const file = join(out, `${ch}--${s.clip}--${styleId}.png`);
        writeFileSync(file, pngBytes(s.png));
        console.log(`${String(s.frames).padStart(2)} frames  ${s.w}x${s.h}  ${file}`);
        n++;
      }
    }
  }
  console.log(`${n} strips -> ${out}`);
  if (errors.length) { console.log(`page errors:\n  ${errors.join("\n  ")}`); process.exitCode = 1; }
} finally {
  await browser.close();
}
