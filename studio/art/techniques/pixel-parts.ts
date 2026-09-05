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
    const flush = () => { if (run) out.push({ ...R(run.x * unit, cy * unit, run.n * unit, unit, run.f, run.fg), own: true }); run = null; };
    for (let cx = x0; cx < x1; cx++) {
      const sx = (cx + 0.5) * unit;
      const topmostAt = (px: number, py: number): Op | null => {
        for (let i = ops.length - 1; i >= 0; i--) {
          const b = boxes[i];
          if (px < b[0] || px >= b[2] || py < b[1] || py >= b[3]) continue;
          if (contains(ops[i], px, py)) return ops[i];
        }
        return null;
      };
      // the centre decides; a miss re-samples a quarter cell off in four
      // directions, so a hairline seam between two tiling polygons (a
      // squashed body's rows) never opens a hole through the sprite
      let hit = topmostAt(sx, sy);
      if (!hit) {
        const q = unit / 4;
        for (const [ox, oy] of [[q, 0], [-q, 0], [0, q], [0, -q]] as const) { hit = topmostAt(sx + ox, sy + oy); if (hit) break; }
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

/**
 * The standard clips are keyed in body units for a ~70-unit body; a pixel rig
 * scales their translations by `k` and, when `unit` is given, rounds each to a
 * whole pixel and drops the head's own nod - at pixel scale a head that moves
 * one pixel more than the neck it sits on is a head floating off its body.
 */
export function scaleClipTranslations(clips: Clip[], k: number, unit?: number): Clip[] {
  const px = (v: number) => (unit ? Math.round((v * k) / unit) * unit : v * k);
  return clips.map((c) => ({
    ...c,
    keys: c.keys.map((kf) => ({
      ...kf,
      pose: Object.fromEntries(Object.entries(kf.pose).map(([bone, d]) => {
        const { dx, dy, ...rest } = d;
        const out = { ...rest } as typeof d;
        if (dx !== undefined) out.dx = px(dx);
        if (dy !== undefined && !(unit && bone === "head")) out.dy = px(dy);
        return [bone, out];
      })),
    })),
  }));
}

// ---------------------------------------------------------------------------
// The rig builder: one grid, one spec, one rig. Parts claim cells in the order
// they are listed - a cell goes to the FIRST part whose region holds it - so
// regions may overlap and a later part takes only what is left. A test
// re-composes the rest pose and compares it to the grid cell for cell, which
// is what proves the cut lossless and every pivot right.

import type { Rig } from "../rig/types";

export interface PixelRigSpec {
  id: string;
  grid: string[];
  palette: Record<string, string>;
  /** body units per pixel; equal to the pixel style's CELL */
  unit: number;
  /** grid column of the pivot, and the row just below the last one */
  origin: [col: number, row: number];
  /** bone pivots as grid (col, row); root is implied at the origin */
  bones: Record<string, { at: [number, number]; parent: string }>;
  /** parts in CLAIM order; `only` limits a region to these characters */
  parts: { id: string; bone: string; z: number; regions: Region[]; only?: string }[];
  sockets: Record<string, { bone: string; at: [number, number] }>;
  /** grid rect [c0, r0, c1, r1], inclusive */
  hitbox: [number, number, number, number];
  clips: Clip[];
  /** the walk leaves the ground (a blob hops); the feet test allows it */
  hops?: boolean;
}

export interface PixelRig {
  rig: Rig;
  /** the grid cells each part claimed, (col, row) */
  cells: Record<string, [number, number][]>;
  /** the same cells of one part read from another grid - a wince, closed eyes */
  swap(partId: string, grid: string[]): Op[];
}

export function buildPixelRig(spec: PixelRigSpec): PixelRig {
  const U = spec.unit;
  const at = (bone: string): [number, number] => (bone === "root" ? spec.origin : spec.bones[bone].at);
  const claimed = new Set<string>();
  const cells: Record<string, [number, number][]> = {};
  for (const p of spec.parts) {
    const mine: [number, number][] = [];
    for (const [r0, r1, c0, c1] of p.regions) {
      for (let r = r0; r <= r1; r++) {
        const row = spec.grid[r] ?? "";
        for (let c = c0; c <= c1; c++) {
          const ch = row[c];
          if (ch === undefined || ch === "." || !spec.palette[ch]) continue;
          if (p.only && !p.only.includes(ch)) continue;
          const key = `${c},${r}`;
          if (claimed.has(key)) continue;
          claimed.add(key);
          mine.push([c, r]);
        }
      }
    }
    cells[p.id] = mine;
  }
  const opsOf = (partId: string, bone: string, grid: string[]): Op[] => {
    const [pc, pr] = at(bone);
    const byRow = new Map<number, number[]>();
    for (const [c, r] of cells[partId]) byRow.set(r, [...(byRow.get(r) ?? []), c]);
    const out: Op[] = [];
    for (const [r, cols] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
      cols.sort((a, b) => a - b);
      let i = 0;
      while (i < cols.length) {
        const ch = grid[r]?.[cols[i]];
        if (ch === undefined || ch === "." || !spec.palette[ch]) { i++; continue; }
        let n = 1;
        while (i + n < cols.length && cols[i + n] === cols[i] + n && grid[r]?.[cols[i + n]] === ch) n++;
        out.push(R((cols[i] - pc) * U, (r - pr) * U, n * U, U, spec.palette[ch]));
        i += n;
      }
    }
    return out;
  };
  const partBone = Object.fromEntries(spec.parts.map((p) => [p.id, p.bone]));
  const [oc, orow] = spec.origin;
  const rig: Rig = {
    id: spec.id,
    bones: [
      { id: "root", parent: null, x: 0, y: 0 },
      ...Object.entries(spec.bones).map(([id, b]) => {
        const [pc, pr] = at(b.parent);
        return { id, parent: b.parent, x: (b.at[0] - pc) * U, y: (b.at[1] - pr) * U };
      }),
    ],
    parts: spec.parts.map((p) => ({ id: p.id, bone: p.bone, z: p.z, ops: opsOf(p.id, p.bone, spec.grid) })),
    sockets: Object.fromEntries(Object.entries(spec.sockets).map(([name, s]) => {
      const [pc, pr] = at(s.bone);
      return [name, { bone: s.bone, x: (s.at[0] - pc) * U, y: (s.at[1] - pr) * U }];
    })),
    hitbox: [(spec.hitbox[0] - oc) * U, (spec.hitbox[1] - orow) * U, (spec.hitbox[2] - spec.hitbox[0] + 1) * U, (spec.hitbox[3] - spec.hitbox[1] + 1) * U],
    clips: spec.clips,
  };
  return { rig, cells, swap: (partId, grid) => opsOf(partId, partBone[partId], grid) };
}

/** A grid with some rows re-written: `edits` maps row index to a (col, text) splice. */
export function editGrid(grid: string[], edits: Record<number, [col: number, text: string]>): string[] {
  return grid.map((row, i) => {
    const e = edits[i];
    return e ? row.slice(0, e[0]) + e[1] + row.slice(e[0] + e[1].length) : row;
  });
}
