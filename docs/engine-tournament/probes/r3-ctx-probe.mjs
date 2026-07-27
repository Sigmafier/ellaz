// What MSAA does each arm actually get?
//
// Round 3's first pass had the Pixi arm explicitly requesting `antialias: true`
// while the other two said nothing. Toggling it moved Pixi's tablet jank from
// 13.9% to 0.75%, which means the flag was deciding a chunk of the ranking.
// Docs are not evidence here: an engine can ask for MSAA and not get it, or
// default differently per version. So ask the live WebGL context what it
// actually granted -- that is the artifact, the config is only a proxy for it.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
import { servableDir } from "./lib.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const ARMS = ["phaser", "pixi", "kaplay"];
const PORT = 5741;
const SHARED = join(ROOT, "r2/_shared/public");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const DIRS = Object.fromEntries(ARMS.map((a) => [a, servableDir(join(ROOT, "r3", a, "dist"))]));

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const m = url.match(/^\/([^/]+)\/(.*)$/);
  const file = m && DIRS[m[1]] ? join(DIRS[m[1]], m[2] || "index.html") : join(SHARED, url);
  try {
    const raw = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(url)] ?? "application/octet-stream" }).end(raw);
  } catch { res.writeHead(404).end("nf"); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const browser = await chromium.launch();
for (const arm of ARMS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/${arm}/index.html?mode=play`);
  await page.waitForFunction(() => window.__cellReady === true, null, { timeout: 60000 });
  const info = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return { error: "no canvas" };
    // Re-getting the context returns the SAME context with its real attributes;
    // it does not create a second one.
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const a = gl && gl.getContextAttributes ? gl.getContextAttributes() : null;
    return {
      api: gl ? (gl instanceof WebGL2RenderingContext ? "webgl2" : "webgl1") : "none",
      antialias: a ? a.antialias : null,
      alpha: a ? a.alpha : null,
      samples: gl ? gl.getParameter(gl.SAMPLES) : null,
      drawingBuffer: gl ? `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}` : null,
      cssSize: `${c.clientWidth}x${c.clientHeight}`,
      dpr: window.devicePixelRatio,
    };
  });
  console.log(arm.padEnd(8), JSON.stringify(info));
  await page.close();
}
await browser.close();
server.close();
