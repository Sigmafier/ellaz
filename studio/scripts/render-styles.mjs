#!/usr/bin/env node
// Render every style on every reference scene to PNG files.
//
//   node scripts/render-styles.mjs [outDir]      default: shots/styles/
//
// This is the "does it draw" proof for the port, and the source of the
// gallery's style tiles. It prints one line per tile with the ink sample
// count so a style that silently draws nothing is visible in the log.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openRunner, pngBytes } from "./lib/browser.mjs";

const out = resolve(process.argv[2] ?? "shots/styles");
mkdirSync(out, { recursive: true });

const { browser, page, errors } = await openRunner();
try {
  const styles = await page.evaluate(() => window.studio.styles.map((s) => s.id));
  const scenes = await page.evaluate(() => window.studio.sceneIds);
  let n = 0;
  for (const sceneId of scenes) {
    for (const styleId of styles) {
      const r = await page.evaluate(([st, sc]) => window.studio.render(st, sc), [styleId, sceneId]);
      const file = join(out, `${sceneId}--${styleId}.png`);
      writeFileSync(file, pngBytes(r.png));
      console.log(`${r.inkSamples.toString().padStart(3)}/256 ink  ${r.w}x${r.h}  ${file}`);
      n++;
    }
  }
  console.log(`${n} tiles (${scenes.length} scenes x ${styles.length} styles) -> ${out}`);
  if (errors.length) {
    console.log(`page errors:\n  ${errors.join("\n  ")}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
