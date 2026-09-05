#!/usr/bin/env node
// Screenshot every gallery page from the built single-file HTML, opened
// over file:// exactly as the operator will open it. Refuses to write a
// shot for a page that reported a render error or never reported ready.
//
//   node scripts/render-gallery-shots.mjs [outDir] [--width=1280]   default: shots/gallery/

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(STUDIO, "dist-gallery", "index.html");
const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith("--")) ?? "shots/gallery");
const width = Number(args.find((a) => a.startsWith("--width="))?.slice(8) ?? 1280);
mkdirSync(out, { recursive: true });

if (!existsSync(HTML)) {
  execFileSync("npx", ["vite", "build", "--config", "gallery/vite.config.ts", "--logLevel", "warn"], { cwd: STUDIO, stdio: "inherit" });
}

export const PAGES = ["styles", "styles?open=paper", "characters", "sprites", "sprites?char=slime&style=crayon", "palettes", "techniques", "games"];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
let failed = 0;
try {
  for (const p of PAGES) {
    const before = errors.length;
    await page.goto(`${pathToFileURL(HTML).href}#/${p}`);
    // the router renders synchronously on hashchange; give the player one frame
    await page.waitForFunction((id) => window.__galleryReady === id || window.__galleryError, p.split("?")[0], { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({ ready: window.__galleryReady, error: window.__galleryError }));
    const file = join(out, `${p.replace(/[?&=]/g, "_")}.png`);
    if (state.error || errors.length > before) {
      console.log(`FAIL ${p}: ${state.error ?? errors.slice(before).join(" | ")}`);
      failed++;
      continue;
    }
    await page.screenshot({ path: file, fullPage: true });
    console.log(`ok   ${p} -> ${file}`);
  }
} finally {
  await browser.close();
}
console.log(`${PAGES.length - failed}/${PAGES.length} pages shot -> ${out}`);
if (failed) process.exit(1);
