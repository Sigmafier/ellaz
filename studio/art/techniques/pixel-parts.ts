// Pixel parts on the rig: a character drawn ONCE as a pixel grid, cut into
// parts along the bone tree, posed by the ordinary rig, and every baked
// frame re-snapped to the pixel grid. The snap is what makes it pixel art
// rather than rotated pixel art: a limb turned 25 degrees becomes polygons,
// and polygons rasterised at cell centres give crisp cells in the source
// palette, never a blended edge. It is the workflow a pixel studio uses with
// a bone tool - rotate, then re-quantise - written down as a pure function.
//
// Coordinates: a part's pixel (pivotCol, pivotRow) has its TOP-LEFT corner at
// the bone's (0, 0); `unit` is body units per pixel. `unit` should equal the
// pixel style's CELL (snes16: 5) so one authored pixel is one style cell at
// export scale 1, and a whole number of cells at any other scale.

import { R, type Fill, type Op } from "../scene-ops";
import type { BakedClip, Clip } from "../rig/types";

/** rows and columns, inclusive, in the full grid */
export type Region = [r0: number, r1: number, c0: number, c1: number];

/** The cells of `regions` as rect ops in bone-local space. Runs of one colour on a row merge. */
export function cutGrid(rows: string[], palette: Record<string, string>, regions: Region[], pivotCol: number, pivotRow: number, unit: number): Op[] {
  const out: Op[] = [];
  for (const [r0, r1, c0, c1] of regions) {
    for (let r = r0; r <= r1; r++) {
      const row = rows[r] ?? "";
      let c = c0;
      while (c <= c1) {
        const ch = row[c];
        if (ch === undefined || ch === "." || !palette[ch]) { c++; continue; }
        let n = 1;
        while (c + n <= c1 && row[c + n] === ch) n++;
        out.push(R((c - pivotCol) * unit, (r - pivotRow) * unit, n * unit, unit, palette[ch]));
        c += n;
      }
    }
  }
  return out;
}

function contains(op: Op, x: number, y: number): boolean {
  switch (op.k) {
    case "r": return x >= op.x && x < op.x + op.w && y >= op.y && y < op.y + op.h;
    case "c": { const dx = x - op.x, dy = y - op.y; return dx * dx + dy * dy <= op.r * op.r; }
    case "e": { const dx = (x - op.x) / op.rx, dy = (y - op.y) / op.ry; return dx * dx + dy * dy <= 1; }
    case "p": {
      let inside = false;
      const p = op.pts;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i], [xj, yj] = p[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
  }
}

function box(op: Op): [number, number, number, number] {
  switch (op.k) {
    case "r": return [op.x, op.y, op.x + op.w, op.y + op.h];
    case "c": return [op.x - op.r, op.y - op.r, op.x + op.r, op.y + op.r];
    case "e": return [op.x - op.rx, op.y - op.ry, op.x + op.rx, op.y + op.ry];
    case "p": {
      const xs = op.pts.map((p) => p[0]), ys = op.pts.map((p) => p[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
  }
}

/**
 * Re-rasterise `ops` onto the `unit` grid: every cell whose centre lies inside
 * a shape takes the TOPMOST shape's fill and fg flag. Output is axis-aligned
 * unit rects with runs merged, so a pixel style renders it cell for cell.
 */
export function snapOps(ops: Op[], unit: number): Op[] {
  if (ops.length === 0) return [];
  const boxes = ops.map(box);
  const x0 = Math.floor(Math.min(...boxes.map((b) => b[0])) / unit);
  const y0 = Math.floor(Math.min(...boxes.map((b) => b[1])) / unit);
  const x1 = Math.ceil(Math.max(...boxes.map((b) => b[2])) / unit);
  const y1 = Math.ceil(Math.max(...boxes.map((b) => b[3])) / unit);
  const out: Op[] = [];
  for (let cy = y0; cy < y1; cy++) {
    const sy = (cy + 0.5) * unit;
    let run: { x: number; n: number; f: Fill; fg: boolean } | null = null;
    const flush = () => { if (run) out.push(R(run.x * unit, cy * unit, run.n * unit, unit, run.f, run.fg)); run = null; };
    for (let cx = x0; cx < x1; cx++) {
      const sx = (cx + 0.5) * unit;
      let hit: Op | null = null;
      for (let i = ops.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (sx < b[0] || sx >= b[2] || sy < b[1] || sy >= b[3]) continue;
        if (contains(ops[i], sx, sy)) { hit = ops[i]; break; }
      }
      if (!hit) { flush(); continue; }
      if (run && run.f === hit.f && run.fg === hit.fg) run.n++;
      else { flush(); run = { x: cx, n: 1, f: hit.f, fg: hit.fg }; }
    }
    flush();
  }
  return out;
}

/** Every frame of every clip snapped to the `unit` grid. */
export const snapClips = (clips: BakedClip[], unit: number): BakedClip[] =>
  clips.map((c) => ({ ...c, frames: c.frames.map((f) => ({ ...f, ops: snapOps(f.ops, unit) })) }));

/** The standard clips are keyed in body units for a ~70-unit body; a pixel rig at `unit` units per pixel scales their translations to match. */
export function scaleClipTranslations(clips: Clip[], k: number): Clip[] {
  return clips.map((c) => ({
    ...c,
    keys: c.keys.map((kf) => ({
      ...kf,
      pose: Object.fromEntries(Object.entries(kf.pose).map(([bone, d]) => [bone, {
        ...d,
        ...(d.dx !== undefined ? { dx: d.dx * k } : {}),
        ...(d.dy !== undefined ? { dy: d.dy * k } : {}),
      }])),
    })),
  }));
}
