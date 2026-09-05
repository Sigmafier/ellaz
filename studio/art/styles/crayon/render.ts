// Crayon doodle: lined notebook paper, every shape filled twice with a
// jittered outline (so the fill misses the edge like a real crayon does) and
// stroked twice in a darker crayon. Seeded jitter, so exports are stable.

import { mk } from "../../canvas";
import { path, shade } from "../../passes/draw";
import { rngFor } from "../../rng";
import type { Renderer } from "../types";

export const PAPER = "#fffdf5";
export const LINE = "rgba(120,160,200,.25)";
export const LINE_GAP = 24;
export const FILL_JITTER = 4;
export const STROKE_JITTER = 3;

export const render: Renderer = (scene, opts) => {
  const rng = rngFor(opts?.seed ?? `crayon:${scene.id}`);
  const [c, x] = mk(scene.w, scene.h);
  if (!opts?.transparent) {
    x.fillStyle = PAPER;
    x.fillRect(0, 0, scene.w, scene.h);
    x.strokeStyle = LINE;
    x.lineWidth = 1;
    for (let y = 20; y < scene.h; y += LINE_GAP) {
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(scene.w, y);
      x.stroke();
    }
  }
  x.lineJoin = "round";
  x.lineCap = "round";
  for (const op of scene.ops) {
    x.globalAlpha = 0.8;
    x.fillStyle = op.f;
    for (let k = 0; k < 2; k++) {
      path(x, op, 1, FILL_JITTER, rng);
      x.fill();
    }
    x.globalAlpha = 0.9;
    x.strokeStyle = shade(op.f, -0.45);
    x.lineWidth = op.fg ? 3 : 2;
    for (let k = 0; k < 2; k++) {
      path(x, op, 1, STROKE_JITTER, rng);
      x.stroke();
    }
  }
  x.globalAlpha = 1;
  return c;
};
