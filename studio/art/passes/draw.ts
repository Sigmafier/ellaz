// Drawing primitives shared by every style: trace an op as a path, fill a
// list, shade a fill. Nothing here knows what a style is.

import { bbox, type Op } from "../scene-ops";
import type { Ctx2D } from "../canvas";
import type { Rng } from "../rng";

export type OpFilter = (op: Op) => boolean;
export const isFg: OpFilter = (o) => o.fg;
export const isBg: OpFilter = (o) => !o.fg;
export const all: OpFilter = () => true;

/**
 * Trace `op` onto `ctx` as the current path, scaled by `sc`. With `jitter`
 * every vertex wobbles by up to +-jitter/2 scene units (rects become
 * polygons so their corners can wobble too), drawn from `rng`.
 */
export function path(ctx: Ctx2D, op: Op, sc = 1, jitter = 0, rng?: Rng): void {
  const j = (v: number) => v * sc + (jitter && rng ? (rng() - 0.5) * jitter : 0);
  ctx.beginPath();
  if (op.k === "r") {
    if (jitter) {
      const pts: [number, number][] = [[op.x, op.y], [op.x + op.w, op.y], [op.x + op.w, op.y + op.h], [op.x, op.y + op.h]];
      ctx.moveTo(j(pts[0][0]), j(pts[0][1]));
      for (const [px, py] of pts.slice(1)) ctx.lineTo(j(px), j(py));
      ctx.closePath();
    } else {
      const w = op.w * sc, h = op.h * sc;
      ctx.roundRect(op.x * sc, op.y * sc, w, h, Math.min(op.rx * sc, w / 2, h / 2));
    }
  } else if (op.k === "c") {
    ctx.arc(j(op.x), j(op.y), op.r * sc, 0, Math.PI * 2);
  } else if (op.k === "e") {
    ctx.ellipse(j(op.x), j(op.y), op.rx * sc, op.ry * sc, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(j(op.pts[0][0]), j(op.pts[0][1]));
    for (const [px, py] of op.pts.slice(1)) ctx.lineTo(j(px), j(py));
    ctx.closePath();
  }
}

/** Fill every op passing `filter`, in order. */
export function fillOps(ctx: Ctx2D, ops: Op[], sc = 1, filter: OpFilter = all): void {
  for (const op of ops) {
    if (!filter(op)) continue;
    path(ctx, op, sc);
    ctx.fillStyle = op.f;
    ctx.fill();
  }
}

/** Stroke every op passing `filter` with the current strokeStyle/lineWidth. */
export function strokeOps(ctx: Ctx2D, ops: Op[], sc = 1, filter: OpFilter = all): void {
  for (const op of ops) {
    if (!filter(op)) continue;
    path(ctx, op, sc);
    ctx.stroke();
  }
}

/**
 * Lighten (amt > 0) or darken (amt < 0) a "#rrggbb" fill. Non-hex fills
 * (rgba shadows) come back unchanged - they are never shaded.
 */
export function shade(hex: string, amt: number): string {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const f = (v: string) => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * (1 + amt) + (amt > 0 ? amt * 120 : 0))));
  return `rgb(${f(m[1])},${f(m[2])},${f(m[3])})`;
}

/**
 * Fill each op, then lay a radial highlight (upper-left) and shadow
 * (lower-right) clipped to its own shape. Background and non-hex fills get
 * the flat fill only. `soft` widens the falloff and adds a rim light.
 */
export function fillShaded(ctx: Ctx2D, ops: Op[], soft = false): void {
  for (const op of ops) {
    path(ctx, op);
    ctx.fillStyle = op.f;
    ctx.fill();
    if (!op.fg || !op.f.startsWith("#")) continue;
    ctx.save();
    path(ctx, op);
    ctx.clip();
    const [x, y, w, h] = bbox(op);
    const g = ctx.createRadialGradient(x + w * 0.35, y + h * 0.3, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h) * (soft ? 0.9 : 0.7));
    g.addColorStop(0, `rgba(255,255,255,${soft ? 0.55 : 0.35})`);
    g.addColorStop(0.6, "rgba(255,255,255,0)");
    g.addColorStop(1, `rgba(0,0,0,${soft ? 0.35 : 0.25})`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    if (soft) {
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 3;
      path(ctx, op);
      ctx.stroke();
    }
    ctx.restore();
  }
}
