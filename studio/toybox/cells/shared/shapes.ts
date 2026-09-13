// Filled shapes as 1 px rows, so a polygon or an ellipse in an art block
// becomes the same `{ kind: "rect" }` ops the arena painter already emits
// and both cells fill identically. The scan conversion is the only geometry
// here: even-odd across the polygon's edges at each row's centre, the
// ellipse's half-width per row, every coordinate scaled by the art block's
// rational first and rounded once. Drawing only - nothing here reaches a sim.

import type { ArenaDrawOp } from "../contract";

/** the art block's rational, scene units -> view px (Ember's field is drawn at 480 x 300 and shown at 5/2) */
export interface Scale { num: number; den: number }
export const UNIT: Scale = { num: 1, den: 1 };

const sc = (v: number, s: Scale): number => (v * s.num) / s.den;

/** a filled rectangle, scaled, its edges rounded so neighbours meet without a seam */
export function fillRect(x: number, y: number, w: number, h: number, color: string, s: Scale): ArenaDrawOp {
  const x0 = Math.round(sc(x, s)), y0 = Math.round(sc(y, s));
  return { kind: "rect", x: x0, y: y0, w: Math.round(sc(x + w, s)) - x0, h: Math.round(sc(y + h, s)) - y0, color };
}

/** a filled polygon as rows: the spans between the edges crossing each row's centre, even-odd */
export function polyRows(points: readonly (readonly [number, number])[], color: string, s: Scale): ArenaDrawOp[] {
  const pts = points.map(([x, y]) => [sc(x, s), sc(y, s)] as const);
  const out: ArenaDrawOp[] = [];
  if (pts.length < 3) return out;
  const y0 = Math.floor(Math.min(...pts.map((p) => p[1]))), y1 = Math.ceil(Math.max(...pts.map((p) => p[1])));
  for (let y = y0; y < y1; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
      if (xb > xa) out.push({ kind: "rect", x: xa, y, w: xb - xa, h: 1, color });
    }
  }
  return out;
}

/** a filled ellipse as rows, symmetric about both axes */
export function ellipseRows(cx: number, cy: number, rx: number, ry: number, color: string, s: Scale): ArenaDrawOp[] {
  const x = sc(cx, s), y = sc(cy, s), a = sc(rx, s), b = sc(ry, s);
  const out: ArenaDrawOp[] = [];
  if (a <= 0 || b <= 0) return out;
  for (let row = Math.round(y - b); row < Math.round(y + b); row++) {
    const dy = row + 0.5 - y;
    const t = 1 - (dy * dy) / (b * b);
    if (t <= 0) continue;
    const hw = a * Math.sqrt(t);
    const xa = Math.round(x - hw), xb = Math.round(x + hw);
    if (xb > xa) out.push({ kind: "rect", x: xa, y: row, w: xb - xa, h: 1, color });
  }
  return out;
}
