// Clay / soft 3D: flat background, each foreground piece dropped with a soft
// shadow, then the radial highlight-and-shadow pass with the rim light on.

import { mk } from "../../canvas";
import { fillOps, fillShaded, isBg, path } from "../../passes/draw";
import type { Renderer } from "../types";

export const render: Renderer = (scene) => {
  const [c, x] = mk(scene.w, scene.h);
  fillOps(x, scene.ops, 1, isBg);
  for (const op of scene.ops) {
    if (!op.fg) continue;
    x.save();
    x.shadowColor = "rgba(0,0,0,.3)";
    x.shadowBlur = 10;
    x.shadowOffsetY = 6;
    path(x, op);
    x.fillStyle = op.f;
    x.fill();
    x.restore();
  }
  fillShaded(x, scene.ops.filter((o) => o.fg), true);
  return c;
};
