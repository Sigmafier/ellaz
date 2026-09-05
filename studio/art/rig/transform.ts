// 2D affine transforms and their application to scene ops.
//
// A matrix is [a, b, c, d, e, f] as in the canvas API: x' = a x + c y + e,
// y' = b x + d y + f. Rotating a rect turns it into a polygon; a circle under
// uniform scale stays a circle; anything else becomes a polygon of 24 points
// so a style renders it like any other shape.

import { type Op, type RectOp, type EllipseOp, P, C } from "../scene-ops";

export type Mat = [number, number, number, number, number, number];
export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function multiply(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const rotate = (r: number): Mat => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
export const scale = (sx: number, sy: number): Mat => [sx, 0, 0, sy, 0, 0];

export function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const isRigid = (m: Mat) => Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && Math.abs(m[0] - m[3]) < 1e-9 && m[0] > 0;

function rectCorners(op: RectOp): [number, number][] {
  return [[op.x, op.y], [op.x + op.w, op.y], [op.x + op.w, op.y + op.h], [op.x, op.y + op.h]];
}

function ellipsePoints(op: EllipseOp, n = 24): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([op.x + Math.cos(t) * op.rx, op.y + Math.sin(t) * op.ry]);
  }
  return pts;
}

/** Transform an op into world space, keeping its kind where the matrix allows. */
export function transformOp(op: Op, m: Mat): Op {
  const rigid = isRigid(m);
  switch (op.k) {
    case "r": {
      if (rigid) {
        const [x, y] = apply(m, op.x, op.y);
        return { ...op, x, y, w: op.w * m[0], h: op.h * m[0], rx: op.rx * m[0] };
      }
      return { ...P(rectCorners(op).map(([x, y]) => apply(m, x, y)), op.f, op.fg) };
    }
    case "c": {
      const [x, y] = apply(m, op.x, op.y);
      if (rigid) return C(x, y, op.r * m[0], op.f, op.fg);
      // rotation keeps a circle a circle; non-uniform scale does not
      const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
      if (Math.abs(sx - sy) < 1e-9) return C(x, y, op.r * sx, op.f, op.fg);
      return P(ellipsePoints({ ...op, k: "e", rx: op.r, ry: op.r }).map(([px, py]) => apply(m, px, py)), op.f, op.fg);
    }
    case "e": {
      if (rigid) {
        const [x, y] = apply(m, op.x, op.y);
        return { ...op, x, y, rx: op.rx * m[0], ry: op.ry * m[0] };
      }
      return P(ellipsePoints(op).map(([px, py]) => apply(m, px, py)), op.f, op.fg);
    }
    case "p":
      return { ...op, pts: op.pts.map(([x, y]) => apply(m, x, y)) };
  }
}
