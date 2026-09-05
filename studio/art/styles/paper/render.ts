// Paper cut-out: cream card stock, every foreground piece rotated a degree
// or two as if glued down by hand, a soft drop shadow under each piece, and
// paper grain over everything. Backgrounds lie flat - a wall never leans.

import { mk, type Ctx2D } from "../../canvas";
import { bbox, type Op } from "../../scene-ops";
import { path } from "../../passes/draw";
import { grain } from "../../passes/grain";
import { rngFor } from "../../rng";
import type { Renderer } from "../types";

export const CARD = "#fbf3e4";
export const GRAIN = 14;
const MAX_TILT = 0.036; // radians, about two degrees

function tiltFor(op: Op): number {
  // deterministic per op position, so the same piece always leans the same way
  const anchor = op.k === "p" ? op.pts[0][0] : op.x;
  return ((anchor % 7) - 3) * (MAX_TILT / 3);
}

function piece(x: Ctx2D, op: Op): void {
  x.save();
  const [bx, by, bw, bh] = bbox(op);
  if (op.fg) {
    x.translate(bx + bw / 2, by + bh / 2);
    x.rotate(tiltFor(op));
    x.translate(-bx - bw / 2, -by - bh / 2);
    x.shadowColor = "rgba(0,0,0,.28)";
    x.shadowBlur = 6;
    x.shadowOffsetX = 3;
    x.shadowOffsetY = 5;
  }
  path(x, op);
  x.fillStyle = op.f;
  x.fill();
  x.restore();
}

export const render: Renderer = (scene, opts) => {
  const [c, x] = mk(scene.w, scene.h);
  x.fillStyle = CARD;
  x.fillRect(0, 0, scene.w, scene.h);
  for (const op of scene.ops) if (!op.fg) piece(x, op);
  for (const op of scene.ops) if (op.fg) piece(x, op);
  grain(x, scene.w, scene.h, GRAIN, rngFor(opts?.seed ?? `paper:${scene.id}`));
  return c;
};
