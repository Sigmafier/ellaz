// Does the report's screenshot actually capture the GAME, on the two games
// that have a canvas?
//
//   npx vite build --outDir=dist-shot
//   npx vite preview --outDir=dist-shot --port 5176 --strictPort &
//   PREVIEW_URL=http://localhost:5176 DIST_DIR=dist-shot \
//     node scripts/repro/repro-report-shot.mjs
//
// WHY IT CANNOT BE A UNIT TEST
// `shot.ts` splits the decisions out so `isBlank`, `fit` and `pickCanvas` all
// test in node - and they do. What none of them can answer is whether a REAL
// Phaser frame reads back as pixels at all: WebGL returns a blank image after
// the frame is presented unless the context was made with
// `preserveDrawingBuffer`, it does not throw, and the result is a well-formed
// black rectangle. Only a real browser running the real bundle can tell.
//
// THE CONTROL, and it is the whole point
// `snake` is WebGL, `bubbleshooter` is 2D, and `sudoku` has no canvas at all.
// If the rig were broken every one of them would look the same. So sudoku must
// come back with NO thumbnail (`no-canvas`), and the two canvas games must come
// back with a thumbnail carrying more than one colour. A run where all three
// agree is a run where the instrument cannot discriminate, and it says so.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5176";
const DIST_DIR = process.env.DIST_DIR ?? "dist-shot";
const OUT = process.env.OUT_DIR ?? "screenshots/report-shot";
const TMP = "/tmp/ellaz-report-shot";

mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const SCENES = [
  { id: "snake", page: "/games/snake/", wantThumb: true, note: "Phaser / WebGL - the trap this file exists for" },
  { id: "bubbleshooter", page: "/games/bubbleshooter/", wantThumb: true, note: "canvas 2D" },
  { id: "sudoku", page: "/games/sudoku/", wantThumb: false, note: "CONTROL - no canvas, so no thumbnail" },
];

function harness(s) {
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}</style>
<script>try{localStorage.setItem("ellaz:consent:v1","denied")}catch{}</script>
<iframe id="f" src="${s.page}" style="width:390px;height:844px;border:0"></iframe>
<script>
(async () => {
  const out = { scene: ${JSON.stringify(s.id)} };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const f = document.getElementById("f");
  await new Promise((r) => f.addEventListener("load", r, { once: true }));
  const d = f.contentDocument, w = f.contentWindow;

  // Wait for the CANVAS, not for the page chrome. The report entry is emitted
  // HTML that is there before any game has loaded, so waiting on it reports
  // "no canvas" for a game whose lazy chunk simply had not arrived yet - which
  // is the same word this probe uses for its own control.
  for (let i = 0; i < 250; i++) { if (d.querySelector("canvas")) break; await sleep(100); }
  for (let i = 0; i < 120; i++) { if (d.querySelector("[data-report]")) break; await sleep(100); }

  // Give the game something to draw. A canvas that has not been started yet is
  // legitimately blank, and a probe that photographed THAT would be measuring
  // its own impatience.
  const cv = d.querySelector("canvas");
  out.canvas = cv ? cv.width + "x" + cv.height : null;
  if (cv) {
    const r = cv.getBoundingClientRect();
    for (const type of ["pointerdown", "pointerup"]) {
      cv.dispatchEvent(new w.PointerEvent(type, { bubbles: true, pointerId: 1,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    }
    await sleep(2500);
  }

  // Read the canvas back DIRECTLY as well, so a missing thumbnail can be told
  // apart from a bug in captureShot: if the raw read-back is one colour, the
  // WebGL trap fired and the refusal is correct; if it is many, the refusal is
  // ours to explain.
  if (cv) {
    try {
      const raw = cv.toDataURL("image/png");
      const bmp0 = await new Promise((res) => {
        const im = new w.Image();
        im.onload = () => res(im); im.onerror = () => res(null);
        im.src = raw;
      });
      if (bmp0) {
        const c0 = d.createElement("canvas");
        c0.width = bmp0.naturalWidth; c0.height = bmp0.naturalHeight;
        const g0 = c0.getContext("2d");
        g0.drawImage(bmp0, 0, 0);
        const p0 = g0.getImageData(0, 0, c0.width, c0.height).data;
        const s0 = new Set();
        for (let i = 0; i < p0.length; i += 97 * 4) s0.add(p0[i] + "," + p0[i+1] + "," + p0[i+2] + "," + p0[i+3]);
        out.rawColours = s0.size;
      }
    } catch (e) { out.rawColours = "threw"; }
  }

  const entry = d.querySelector("[data-report]");
  out.entry = !!entry;
  if (entry) { entry.click(); for (let i = 0; i < 90; i++) { if (d.querySelector("[data-report-sheet]")) break; await sleep(100); } }
  const sheet = d.querySelector("[data-report-sheet]");
  out.sheet = !!sheet;

  const img = sheet && sheet.querySelector("img");
  out.thumb = !!img;
  if (img) {
    out.src = String(img.getAttribute("src") || "").slice(0, 30);
    out.bytes = (img.getAttribute("src") || "").length;
    // Count distinct colours in the THUMBNAIL ITSELF, in the page, so the
    // verdict is about the picture that would travel and not about a re-render.
    const bmp = await new Promise((res) => {
      const im = new w.Image();
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = img.getAttribute("src");
    });
    if (bmp) {
      out.dim = bmp.naturalWidth + "x" + bmp.naturalHeight;
      const c = d.createElement("canvas");
      c.width = bmp.naturalWidth; c.height = bmp.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < px.length; i += 97 * 4) seen.add(px[i] + "," + px[i+1] + "," + px[i+2] + "," + px[i+3]);
      out.colours = seen.size;
      out.dataUrl = img.getAttribute("src");
    }
  }
  document.title = "PROBE" + JSON.stringify(out);
})();
</script>`;
}

function chrome(args) {
  return execFileSync("google-chrome", [
    // NOT --disable-gpu: Phaser needs a WebGL context, and without one snake
    // renders nothing and this probe reports the very failure it is looking
    // for. SwiftShader is a software rasteriser, so it runs anywhere.
    "--headless=new", "--no-sandbox", "--hide-scrollbars",
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    `--user-data-dir=${TMP}/profile`, ...args,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });
}

let bad = 0;
const seenThumbs = [];
for (const s of SCENES) {
  writeFileSync(`${DIST_DIR}/__shot.html`, harness(s));
  let dom = "";
  try {
    dom = chrome(["--window-size=420,900", "--virtual-time-budget=40000", "--dump-dom", `${BASE}/__shot.html`]);
  } catch (e) {
    console.log(`  FAIL  ${s.id}: chrome ${String(e.message ?? e).slice(0, 120)}`); bad++; continue;
  }
  const m = dom.match(/<title>PROBE(.*?)<\/title>/s);
  if (!m) {
    console.log(dom.includes("__shot")
      ? `  FAIL  ${s.id}: the harness ran and never reported`
      : `  FAIL  ${s.id}: the harness was NOT served - use --outDir=${DIST_DIR}, the space form is dropped`);
    bad++; continue;
  }
  const r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  const gotThumb = Boolean(r.thumb && (r.colours ?? 0) > 1);
  const ok = r.sheet && gotThumb === s.wantThumb;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${s.id}: canvas=${r.canvas} sheet=${r.sheet} thumb=${r.thumb} ${r.dim ?? ""} colours=${r.colours ?? "-"} rawCanvasColours=${r.rawColours ?? "-"} (want thumb ${s.wantThumb})  ${s.note}`);
  if (r.dataUrl) {
    const file = `${OUT}/${s.id}.png`;
    writeFileSync(file, Buffer.from(r.dataUrl.split(",")[1], "base64"));
    console.log(`        eyeball: ${file}  (${Math.round(r.bytes / 1024)} KB as a data URL)`);
    seenThumbs.push(s.id);
  }
}
rmSync(`${DIST_DIR}/__shot.html`, { force: true });
if (seenThumbs.length === SCENES.length) {
  console.log("\nEVERY scene produced a thumbnail, the control included - this instrument cannot discriminate.");
  bad++;
}
console.log(bad === 0 ? "\nboth canvas games captured a real frame, and the DOM control captured none" : `\n${bad} scene(s) disagreed`);
process.exit(bad === 0 ? 0 : 1);
