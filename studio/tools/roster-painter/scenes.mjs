// scratch: render the three scenes in two styles, half size, for eyeballing
import { writeFileSync } from "node:fs";
import { openRunner, pngBytes } from "../../scripts/lib/browser.mjs";
const OUT = process.argv[2];
const { browser, page, errors } = await openRunner();
try {
  for (const [scene, style] of [["reference", "snes16"], ["brawl-room", "snes16"], ["ember-field", "paper"], ["reference", "flat"]]) {
    const r = await page.evaluate(async ([st, id]) => {
      const out = window.studio.render(st, id);
      const im = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = out.png; });
      const cv = document.createElement("canvas"); cv.width = Math.round(im.width / 2); cv.height = Math.round(im.height / 2);
      const x = cv.getContext("2d"); x.imageSmoothingEnabled = true; x.drawImage(im, 0, 0, cv.width, cv.height);
      return { png: cv.toDataURL("image/png"), w: im.width, h: im.height };
    }, [style, scene]);
    writeFileSync(`${OUT}/scene-${scene}-${style}.png`, pngBytes(r.png));
    console.log(scene, style, r.w, "x", r.h);
  }
  console.log("errors", errors);
} finally { await browser.close(); }
