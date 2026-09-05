// Voxel: read the scene at 8px cells; background cells are flat tiles,
// foreground cells are extruded cubes with a lit top, a shaded right face
// and a darker bottom face. Only the cast is extruded - a flat wall was
// tried and smeared the whole room.

import { mk, type Ctx2D } from "../../canvas";
import { lowRes } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 8;
export const DEPTH = 6;
export const GROUND = "#e9f2ff";

function cube(x: Ctx2D, X: number, Y: number, col: string): void {
  x.fillStyle = col;
  x.fillRect(X, Y, CELL, CELL);
  x.fillStyle = "rgba(255,255,255,.4)";
  x.fillRect(X, Y, CELL, 2);
  x.fillStyle = "rgba(0,0,0,.42)";
  x.beginPath();
  x.moveTo(X + CELL, Y); x.lineTo(X + CELL + DEPTH, Y + DEPTH); x.lineTo(X + CELL + DEPTH, Y + CELL + DEPTH); x.lineTo(X + CELL, Y + CELL);
  x.fill();
  x.fillStyle = "rgba(0,0,0,.22)";
  x.beginPath();
  x.moveTo(X, Y + CELL); x.lineTo(X + CELL, Y + CELL); x.lineTo(X + CELL + DEPTH, Y + CELL + DEPTH); x.lineTo(X + DEPTH, Y + CELL + DEPTH);
  x.fill();
}

export const render: Renderer = (scene, opts) => {
  const { w: W, h: H } = scene;
  const { w, h, all, fgAlpha } = lowRes(scene.ops, W, H, CELL);
  const [c, x] = mk(W, H);
  if (!opts?.transparent) {
    x.fillStyle = GROUND;
    x.fillRect(0, 0, W, H);
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (!all[k + 3]) continue;
      const col = `rgb(${all[k]},${all[k + 1]},${all[k + 2]})`;
      const fg = fgAlpha[k + 3] > 0;
      if (fg) cube(x, i * CELL, j * CELL - DEPTH, col);
      else { x.fillStyle = col; x.fillRect(i * CELL, j * CELL, CELL, CELL); }
    }
  }
  return c;
};
