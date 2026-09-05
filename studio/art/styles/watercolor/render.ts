// Watercolor storybook: three blurred, jittered, translucent washes per shape,
// a sharper wash on top, a soft darker edge, then paper grain. Seeded.

import { mk } from "../../canvas";
import { path, shade } from "../../passes/draw";
import { grain } from "../../passes/grain";
import { rngFor } from "../../rng";
import type { Renderer } from "../types";

export const PAPER = "#fdf8ee";

export const render: Renderer = (scene, opts) => {
  const rng = rngFor(opts?.seed ?? `watercolor:${scene.id}`);
  const [c, x] = mk(scene.w, scene.h);
  if (!opts?.transparent) {
    x.fillStyle = PAPER;
    x.fillRect(0, 0, scene.w, scene.h);
  }
  for (const op of scene.ops) {
    x.save();
    x.globalAlpha = 0.32;
    x.filter = "blur(3px)";
    x.fillStyle = op.f;
    for (let k = 0; k < 3; k++) {
      path(x, op, 1, 6, rng);
      x.fill();
    }
    x.filter = "blur(1px)";
    x.globalAlpha = 0.5;
    path(x, op, 1, 2, rng);
    x.fill();
    x.globalAlpha = 0.35;
    x.strokeStyle = shade(op.f, -0.35);
    x.lineWidth = 2;
    path(x, op, 1, 3, rng);
    x.stroke();
    x.restore();
  }
  grain(x, scene.w, scene.h, 10, rng);
  return c;
};
