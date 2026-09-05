// Open headless Chromium with the runner bundle loaded, hand back the page.
//
// The bundle is built by `vite build --config runner/vite.config.ts` into
// dist-runner/studio.iife.js. This helper refuses to run against a bundle
// older than any file under art/ or runner/ - a stale bundle renders
// yesterday's styles and reads exactly like today's.

import { existsSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const BUNDLE = join(STUDIO, "dist-runner", "studio.iife.js");

function newestMtime(dir) {
  let m = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    m = Math.max(m, e.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return m;
}

/** Build the runner bundle if it is missing or older than its sources. */
export function ensureBundle({ force = false } = {}) {
  // every directory the runner bundle imports from - a stale bundle renders yesterday's code and reads exactly like today's
  const sources = ["art", "runner", "export", "adapters"].map((d) => newestMtime(join(STUDIO, d)));
  const fresh = existsSync(BUNDLE) && statSync(BUNDLE).mtimeMs >= Math.max(...sources);
  if (fresh && !force && !process.env.STUDIO_REBUILD) return BUNDLE;
  execFileSync("npx", ["vite", "build", "--config", "runner/vite.config.ts", "--logLevel", "warn"], { cwd: STUDIO, stdio: "inherit" });
  if (!existsSync(BUNDLE)) throw new Error(`runner bundle was not written: ${BUNDLE}`);
  return BUNDLE;
}

/**
 * Launch Chromium, open a blank page, inject the bundle, and return
 * { browser, page }. Page errors are collected on page.__errors and any
 * console.error is pushed there too, so a renderer that throws inside
 * evaluate() cannot pass as "rendered nothing".
 */
export async function openRunner() {
  ensureBundle();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setContent("<!doctype html><title>studio runner</title><body></body>");
  await page.addScriptTag({ path: BUNDLE });
  const ok = await page.evaluate(() => typeof window.studio === "object" && Array.isArray(window.studio.styles));
  if (!ok) throw new Error("runner bundle loaded but window.studio is missing");
  return { browser, page, errors };
}

/** data:image/png;base64,... -> Buffer */
export const pngBytes = (dataUrl) => Buffer.from(dataUrl.split(",")[1], "base64");
