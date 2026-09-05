// Isometric pixel: the scene sheared so verticals lean and the ground
// recedes, a diamond grid drawn on that ground, then the classic 4-cell
// pixel stage with an outline. Every op becomes a polygon on the way.

import { pixelate } from "../../passes/pixelate";
import { P, type Op } from "../../scene-ops";
import type { Renderer } from "../types";

export const CELL = 4;
export const LEAN = 0.5;

const N = 20;
const shearPt = (x: number, y: number, H: number): [number, number] => [x + LEAN * (y - H / 2), y];

/** Rect, circle and ellipse become polygons so a shear can move their corners. */
export function shearOps(ops: Op[], H: number): Op[] {
  return ops.map((op) => {
    let pts: [number, number][];
    if (op.k === "r") pts = [[op.x, op.y], [op.x + op.w, op.y], [op.x + op.w, op.y + op.h], [op.x, op.y + op.h]];
    else if (op.k === "p") pts = op.pts;
    else {
      const rx = op.k === "c" ? op.r : op.rx, ry = op.k === "c" ? op.r : op.ry;
      pts = Array.from({ length: N }, (_, i) => [op.x + rx * Math.cos((i / N) * Math.PI * 2), op.y + ry * Math.sin((i / N) * Math.PI * 2)]);
    }
    return P(pts.map(([x, y]) => shearPt(x, y, H)), op.f, op.fg);
  });
}

/** Thin diamond-grid lines across the ground band, as background polygons. */
function grid(W: number, H: number, top: number): Op[] {
  const out: Op[] = [];
  for (let k = -W; k < W * 2; k += 40) {
    out.push(P([[k, top], [k + 1.5, top], [k + 1.5 + (H - top) * 2, H], [k + (H - top) * 2, H]], "rgba(0,0,0,.10)", false));
    out.push(P([[k, top], [k + 1.5, top], [k + 1.5 - (H - top) * 2, H], [k - (H - top) * 2, H]], "rgba(0,0,0,.10)", false));
  }
  return out;
}

export const render: Renderer = (scene) => {
  const bg = scene.ops.filter((o) => !o.fg);
  const groundTop = Math.max(...bg.map((o) => (o.k === "r" ? o.y : 0)), 0);
  const ops = [...bg, ...grid(scene.w, scene.h, groundTop || scene.h * 0.65), ...shearOps(scene.ops.filter((o) => o.fg), scene.h)];
  return pixelate(ops, scene.w, scene.h, CELL, { outline: true });
};
