// Sticker book: a fat white die-cut border with a soft shadow around every
// foreground piece, a flat fill, and a glossy highlight ellipse clipped to
// each piece. Polygons skip the gloss (a spark should not look wet).

import { mk } from "../../canvas";
import { bbox } from "../../scene-ops";
import { fillOps, isBg, isFg, path, strokeOps } from "../../passes/draw";
import type { Renderer } from "../types";

export const BORDER = 12;

export const render: Renderer = (scene) => {
  const [c, x] = mk(scene.w, scene.h);
  fillOps(x, scene.ops, 1, isBg);
  x.lineJoin = "round";
  x.strokeStyle = "rgba(0,0,0,.18)";
  x.lineWidth = BORDER + 4;
  strokeOps(x, scene.ops, 1, isFg);
  x.strokeStyle = "#ffffff";
  x.lineWidth = BORDER;
  strokeOps(x, scene.ops, 1, isFg);
  fillOps(x, scene.ops, 1, isFg);
  x.fillStyle = "rgba(255,255,255,.35)";
  for (const op of scene.ops) {
    if (!op.fg || op.k === "p") continue;
    const [bx, by, bw, bh] = bbox(op);
    x.save();
    path(x, op);
    x.clip();
    x.beginPath();
    x.ellipse(bx + bw * 0.35, by + bh * 0.3, bw * 0.28, bh * 0.16, -0.5, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  return c;
};
