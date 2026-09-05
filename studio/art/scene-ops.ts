// The neutral vocabulary every style renders and every technique emits.
//
// A scene is a flat list of filled shapes in scene units (pixels at 1x). Each
// shape carries ONE flag that every style reads: `fg` - is this a character or
// prop (true) or the background (false)? Styles treat the two differently:
// outlines, extrusion, drop shadows and rotation apply to foreground only, so
// a wall never leans and a floor never grows a black edge.
//
// No colour theory here, no engine, no DOM. This file is imported by tests
// that run in node, and it must stay that way.

export type Fill = string; // "#rrggbb" or any CSS colour a canvas accepts

interface Base {
  f: Fill;
  fg: boolean;
}
export interface RectOp extends Base {
  k: "r";
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number; // corner radius, 0 = square
}
export interface CircleOp extends Base {
  k: "c";
  x: number;
  y: number;
  r: number;
}
export interface EllipseOp extends Base {
  k: "e";
  x: number;
  y: number;
  rx: number;
  ry: number;
}
export interface PolyOp extends Base {
  k: "p";
  pts: [number, number][];
}
export type Op = RectOp | CircleOp | EllipseOp | PolyOp;

export interface Scene {
  id: string;
  w: number;
  h: number;
  ops: Op[];
}

// Constructors. Foreground is the default because most ops in a character
// builder are foreground; scenes say `false` on every background op.
export const R = (x: number, y: number, w: number, h: number, f: Fill, fg = true, rx = 0): RectOp =>
  ({ k: "r", x, y, w, h, f, fg, rx });
export const C = (x: number, y: number, r: number, f: Fill, fg = true): CircleOp =>
  ({ k: "c", x, y, r, f, fg });
export const E = (x: number, y: number, rx: number, ry: number, f: Fill, fg = true): EllipseOp =>
  ({ k: "e", x, y, rx, ry, f, fg });
export const P = (pts: [number, number][], f: Fill, fg = true): PolyOp =>
  ({ k: "p", pts, f, fg });

/** Axis-aligned bounds as [x, y, w, h]. */
export function bbox(op: Op): [number, number, number, number] {
  switch (op.k) {
    case "r":
      return [op.x, op.y, op.w, op.h];
    case "c":
      return [op.x - op.r, op.y - op.r, 2 * op.r, 2 * op.r];
    case "e":
      return [op.x - op.rx, op.y - op.ry, 2 * op.rx, 2 * op.ry];
    case "p": {
      const xs = op.pts.map((p) => p[0]);
      const ys = op.pts.map((p) => p[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
    }
  }
}

/** Bounds of a whole op list, or null for an empty list. */
export function bounds(ops: Op[]): [number, number, number, number] | null {
  if (ops.length === 0) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const op of ops) {
    const [x, y, w, h] = bbox(op);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h);
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Scale an op list by `s` about the origin, then move it by (dx, dy). */
export function place(ops: Op[], dx: number, dy: number, s = 1): Op[] {
  return ops.map((op) => {
    switch (op.k) {
      case "r":
        return { ...op, x: op.x * s + dx, y: op.y * s + dy, w: op.w * s, h: op.h * s, rx: op.rx * s };
      case "c":
        return { ...op, x: op.x * s + dx, y: op.y * s + dy, r: op.r * s };
      case "e":
        return { ...op, x: op.x * s + dx, y: op.y * s + dy, rx: op.rx * s, ry: op.ry * s };
      case "p":
        return { ...op, pts: op.pts.map(([x, y]) => [x * s + dx, y * s + dy] as [number, number]) };
    }
  });
}

/** Mirror an op list horizontally about x = axis. Polygons keep winding. */
export function flipX(ops: Op[], axis: number): Op[] {
  return ops.map((op) => {
    switch (op.k) {
      case "r":
        return { ...op, x: 2 * axis - op.x - op.w };
      case "c":
      case "e":
        return { ...op, x: 2 * axis - op.x };
      case "p":
        return { ...op, pts: op.pts.map(([x, y]) => [2 * axis - x, y] as [number, number]) };
    }
  });
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Every reason a scene is not drawable, as plain strings. Empty = valid.
 * A renderer given a NaN draws nothing and throws nothing, which is the
 * failure shape this repo distrusts most, so it is refused here instead.
 */
export function validate(scene: Scene): string[] {
  const out: string[] = [];
  if (!scene.id) out.push("scene has no id");
  if (!isNum(scene.w) || scene.w <= 0 || !isNum(scene.h) || scene.h <= 0) out.push(`scene ${scene.id}: size ${scene.w}x${scene.h} is not positive`);
  scene.ops.forEach((op, i) => {
    const where = `scene ${scene.id} op[${i}] (${op.k})`;
    if (typeof op.f !== "string" || op.f === "") out.push(`${where}: no fill`);
    if (typeof op.fg !== "boolean") out.push(`${where}: fg is not boolean`);
    const nums: number[] =
      op.k === "r" ? [op.x, op.y, op.w, op.h, op.rx]
      : op.k === "c" ? [op.x, op.y, op.r]
      : op.k === "e" ? [op.x, op.y, op.rx, op.ry]
      : op.pts.flat();
    if (!nums.every(isNum)) out.push(`${where}: non-finite number`);
    if (op.k === "r" && (op.w < 0 || op.h < 0)) out.push(`${where}: negative size`);
    if (op.k === "c" && op.r < 0) out.push(`${where}: negative radius`);
    if (op.k === "e" && (op.rx < 0 || op.ry < 0)) out.push(`${where}: negative radius`);
    if (op.k === "p" && op.pts.length < 3) out.push(`${where}: polygon needs 3 points, has ${op.pts.length}`);
  });
  return out;
}
