// Stained-glass mosaic: 12px tesserae on dark grout, each tile's corners
// nudged by a fixed hash of its position so the grid reads hand-laid, and a
// glint along the top edge of every tile.

import { mk } from "../../canvas";
import { lowRes } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 12;
export const GROUT = "#2a2320";

export const render: Renderer = (scene, opts) => {
  const { w: W, h: H } = scene;
  const { w, h, all } = lowRes(scene.ops, W, H, CELL);
  const [c, x] = mk(W, H);
  if (!opts?.transparent) {
    x.fillStyle = GROUT;
    x.fillRect(0, 0, W, H);
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (!all[k + 3]) continue;
      const jx = ((i * 7 + j * 3) % 3) - 1, jy = ((i * 5 + j * 11) % 3) - 1;
      const X = i * CELL, Y = j * CELL;
      x.fillStyle = `rgb(${all[k]},${all[k + 1]},${all[k + 2]})`;
      x.beginPath();
      x.moveTo(X + 1 + jx, Y + 1);
      x.lineTo(X + CELL - 1, Y + 1 + jy);
      x.lineTo(X + CELL - 1 - jx, Y + CELL - 1);
      x.lineTo(X + 1, Y + CELL - 1 - jy);
      x.closePath();
      x.fill();
      x.fillStyle = "rgba(255,255,255,.22)";
      x.fillRect(X + 2, Y + 2, CELL - 6, 2);
    }
  }
  return c;
};
