// Film grain / paper tooth: add the same seeded noise to r, g and b of every
// pixel. Seeded, so the export is byte-stable.

import type { Ctx2D } from "../canvas";
import type { Rng } from "../rng";

export function grain(ctx: Ctx2D, w: number, h: number, amount: number, rng: Rng): void {
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(im, 0, 0);
}
