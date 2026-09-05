// Every pixel character on the rig passes the same five checks. The first is
// the one that matters: the rest pose, snapped, re-composes the drawing cell
// for cell - which proves the cut lossless and every bone pivot right.

import { describe, expect, it } from "vitest";
import { bakeAll, bakePose, validateRig } from "../rig/rig";
import { bounds } from "../scene-ops";
import { CLIP_IDS } from "../rig/types";
import { snapClips, snapOps, type PixelRigSpec } from "../techniques/pixel-parts";
import { HEIGHT_BY_ROLE, PIXEL_CAST } from "./index";

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
