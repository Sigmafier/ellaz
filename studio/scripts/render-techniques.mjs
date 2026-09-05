#!/usr/bin/env node
// One strip per style: the eight sampled techniques' robots side by side.
//
//   node scripts/render-techniques.mjs [outDir] [--styles=flat,snes16]   default: shots/techniques/, full styles

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openRunner, pngBytes } from "./lib/browser.mjs";

const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith("--")) ?? "shots/techniques");
const stylesArg = args.find((a) => a.startsWith("--styles="))?.slice(9);
mkdirSync(out, { recursive: true });

const { browser, page, errors } = await openRunner();
try {
  const styles = stylesArg ? stylesArg.split(",") : await page.evaluate(() => window.studio.styles.filter((s) => s.tier === "full").map((s) => s.id));
  for (const styleId of styles) {
    const r = await page.evaluate((st) => window.studio.renderTechniqueStrip(st, 2), styleId);
    const file = join(out, `${styleId}.png`);
    writeFileSync(file, pngBytes(r.png));
    console.log(`${r.ids.length} techniques  ${r.w}x${r.h}  ${file}  [${r.ids.join(", ")}]`);
  }
  if (errors.length) { console.log(`page errors:\n  ${errors.join("\n  ")}`); process.exitCode = 1; }
} finally {
  await browser.close();
}
