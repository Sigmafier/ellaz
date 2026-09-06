// scratch: the whole cast as pixel parts, five clips each, snes16 at 1x (one pixel = one cell).
import { writeFileSync } from "node:fs";
import { openRunner, pngBytes } from "../../scripts/lib/browser.mjs";
const OUT = process.argv[2]; const IDS = process.argv[3].split(",");
const { browser, page, errors } = await openRunner();
try {
  const r = await page.evaluate(async (IDS) => {
    const ids = IDS;
    const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
    const cols = [];
    for (const id of ids) {
      const strips = window.studio.renderClipStrips(id, "snes16", 1);
      cols.push({ id, strips, imgs: await Promise.all(strips.map((s) => load(s.png))) });
    }
    const pad = 24, labelH = 30;
    const colW = cols.map((c) => Math.max(...c.imgs.map((i) => i.width)));
    const rowH = [0, 1, 2, 3, 4].map((k) => Math.max(...cols.map((c) => c.imgs[k].height)) + labelH + pad);
    const cv = document.createElement("canvas");
    cv.width = pad + colW.reduce((p, q) => p + q + pad, 0); cv.height = 60 + rowH.reduce((p, q) => p + q, 0);
    const x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
    x.fillStyle = "#e8eef7"; x.fillRect(0, 0, cv.width, cv.height);
    let cx = pad; const xs = [];
    cols.forEach((c, ci) => { xs.push([c.id, cx, colW[ci]]);
      x.fillStyle = "#1a1230"; x.font = "bold 18px system-ui"; x.fillText((() => { const m = window.studio.characters.find((k) => k.id === c.id); return `${m.name}  -  ${m.band} ${m.role}, ${m.role === "boss" ? 64 : m.role === "hero" ? 48 : 32}px`; })(), cx, 30);
      let y = 60;
      c.strips.forEach((s, k) => {
        x.fillStyle = "#4e5670"; x.font = "14px system-ui"; x.fillText(`${s.clip}  ${s.frames} frames`, cx, y + 18);
        x.drawImage(c.imgs[k], cx, y + labelH);
        y += rowH[k];
      });
      cx += colW[ci] + pad;
    });
    return { png: cv.toDataURL("image/png"), w: cv.width, h: cv.height, xs };
  }, IDS);
  writeFileSync(OUT, pngBytes(r.png));
  console.log("sheet", r.w, "x", r.h, "errors", errors); writeFileSync(OUT + ".json", JSON.stringify(r.xs));
} finally { await browser.close(); }
