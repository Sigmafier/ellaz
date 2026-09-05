// Flat vector with a long shadow: the background flat, every foreground
// shape casting a 45-degree stepped shadow before it is drawn crisp on top.

import { mk } from "../../canvas";
import { fillOps, isBg, isFg, path } from "../../passes/draw";
import type { Renderer } from "../types";

export const SHADOW_STEPS = 10;
export const SHADOW_STEP_PX = 1.5;

export const render: Renderer = (scene) => {
  const [c, x] = mk(scene.w, scene.h);
  fillOps(x, scene.ops, 1, isBg);
  x.fillStyle = "rgba(0,0,0,.12)";
  for (let k = 1; k <= SHADOW_STEPS; k++) {
    x.save();
    x.translate(k * SHADOW_STEP_PX, k * SHADOW_STEP_PX);
    for (const op of scene.ops) {
      if (!op.fg) continue;
      path(x, op);
      x.fill();
    }
    x.restore();
  }
  fillOps(x, scene.ops, 1, isFg);
  return c;
};
