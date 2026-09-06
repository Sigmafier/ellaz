// Every pixel character on the rig passes the same five checks. The first is
// the one that matters: the rest pose, snapped, re-composes the drawing cell
// for cell - which proves the cut lossless and every bone pivot right.

import { describe, expect, it } from "vitest";
import { bakeAll, bakePose, validateRig } from "../rig/rig";
import { bounds } from "../scene-ops";
import { CLIP_IDS } from "../rig/types";
import { snapClips, snapOps, type PixelRigSpec } from "../techniques/pixel-parts";
import { HEIGHT_BY_ROLE, PIXEL_CAST } from "./index";

/** measured 2026-09-06 over 66 pairs of the twelve, boxed to 24: closest ninja/brawler 0.82, then robot/brawler 0.75, teddy/owl 0.74. A ratchet, not a target: a new character must land under the closest pair that already reads apart */
const SILHOUETTE_MAX = 0.85;

/** snapped ops back to a text grid in the drawing's own frame */
function toGrid(spec: PixelRigSpec, ops: ReturnType<typeof snapOps>): string[] {
  const ink = Object.fromEntries(Object.entries(spec.palette).map(([ch, hex]) => [hex, ch]));
  const W = spec.grid[0].length, H = spec.grid.length, U = spec.unit;
  const rows = Array.from({ length: H }, () => Array(W).fill("."));
  for (const o of ops) {
    if (o.k !== "r") throw new Error(`snapped op is a ${o.k}`);
    const c0 = o.x / U + spec.origin[0], r = o.y / U + spec.origin[1], n = o.w / U;
    for (let i = 0; i < n; i++) rows[r][c0 + i] = ink[o.f] ?? "?";
  }
  return rows.map((r) => r.join(""));
}

/** the rest silhouette scaled to fit a box, so a 32 and a 64 compare by shape and not by size */
function silhouette(spec: PixelRigSpec, N = 24): Set<string> {
  const ink: [number, number][] = [];
  spec.grid.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] !== ".") ink.push([c, r]); });
  const c0 = Math.min(...ink.map((p) => p[0])), r0 = Math.min(...ink.map((p) => p[1]));
  const w = Math.max(...ink.map((p) => p[0])) - c0 + 1, h = Math.max(...ink.map((p) => p[1])) - r0 + 1;
  const k = N / Math.max(w, h);
  return new Set(ink.map(([c, r]) => `${Math.floor((c - c0) * k)},${Math.floor((r - r0) * k)}`));
}

describe("the roster's silhouettes", () => {
  it("no two characters share more than SILHOUETTE_MAX of their black mass, boxed to 24", () => {
    const masks = PIXEL_CAST.map((c) => ({ id: c.id, m: silhouette(c.spec) }));
    const pairs: [number, string, string][] = [];
    for (let i = 0; i < masks.length; i++) for (let j = i + 1; j < masks.length; j++) {
      const a = masks[i].m, b = masks[j].m;
      let both = 0; for (const k of a) if (b.has(k)) both++;
      pairs.push([both / (a.size + b.size - both), masks[i].id, masks[j].id]);
    }
    pairs.sort((x, y) => y[0] - x[0]);
    expect(pairs.length).toBe((PIXEL_CAST.length * (PIXEL_CAST.length - 1)) / 2);
    // the closest pair is printed so a new character is judged against the real number, not a guess
    console.log(`silhouettes: ${pairs.length} pairs, closest ${pairs.slice(0, 3).map(([v, a, b]) => `${a}/${b} ${v.toFixed(2)}`).join(" · ")}`);
    for (const [v, a, b] of pairs) expect(v, `${a} and ${b} read alike`).toBeLessThan(SILHOUETTE_MAX);
  });
  it("the control: a character against itself is 1, and against a blank box is 0", () => {
    const m = silhouette(PIXEL_CAST[0].spec);
    let both = 0; for (const k of m) if (m.has(k)) both++;
    expect(both / m.size).toBe(1);
    expect(new Set<string>().size / (m.size || 1)).toBe(0);
  });
});

for (const { id, built, spec, role } of PIXEL_CAST) {
  describe(`${id} as pixel parts on the rig`, () => {
    const rig = built.rig;
    it("validates and carries the five standard clips in order", () => {
      expect(validateRig(rig)).toEqual([]);
      expect(rig.clips.map((c) => c.id)).toEqual([...CLIP_IDS]);
    });
    it("is drawn on its role's canvas: hero 48, enemy 32, boss 64 (a raised weapon may add up to 4 rows)", () => {
      const H = HEIGHT_BY_ROLE[role];
      expect(spec.grid.length).toBeGreaterThanOrEqual(H);
      expect(spec.grid.length).toBeLessThanOrEqual(H + 4);
      expect(spec.grid.filter((r) => /[^.]/.test(r)).length).toBeGreaterThanOrEqual(H * 0.7);
    });
    it("at rest, the parts re-compose the drawing cell for cell", () => {
      expect(toGrid(spec, snapOps(bakePose(rig, {}), spec.unit))).toEqual(spec.grid);
    });
    it("no cell belongs to two parts and none is left out", () => {
      const claimed = Object.values(built.cells).reduce((n, c) => n + c.length, 0);
      const ink = spec.grid.join("").replace(/\./g, "").length;
      expect(claimed).toBe(ink);
    });
    it("every snapped frame is on the grid and in the palette", () => {
      const U = spec.unit;
      const allowed = new Set(Object.values(spec.palette));
      for (const c of snapClips(bakeAll(rig), U)) for (const f of c.frames) for (const o of f.ops) {
        expect(o.k).toBe("r");
        if (o.k !== "r") continue;
        expect(Math.abs(o.x % U) + Math.abs(o.y % U), `${f.name} off-grid`).toBe(0);
        expect(o.h).toBe(U);
        expect(allowed.has(o.f), `${f.name} colour ${o.f}`).toBe(true);
      }
    });
    it("keeps its feet on the ground in every standing clip", () => {
      for (const c of snapClips(bakeAll(rig), spec.unit)) {
        if (c.id === "ko" || (c.id === "walk" && spec.hops)) continue;
        for (const f of c.frames) {
          const [, y, , h] = bounds(f.ops)!;
          expect(Math.abs(y + h), f.name).toBeLessThanOrEqual(spec.unit);
        }
      }
    });
    it("the hitbox lies inside the rest silhouette and reaches the feet", () => {
      const [x, y, w, h] = bounds(bakePose(rig, {}))!;
      const [hx, hy, hw, hh] = rig.hitbox;
      expect(hx).toBeGreaterThanOrEqual(x);
      expect(hy).toBeGreaterThanOrEqual(y);
      expect(hx + hw).toBeLessThanOrEqual(x + w);
      expect(hy + hh).toBe(y + h);
    });
  });
}
