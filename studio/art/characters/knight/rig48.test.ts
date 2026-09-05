import { describe, expect, it } from "vitest";
import { bakeAll, bakePose, validateRig } from "../../rig/rig";
import { bounds } from "../../scene-ops";
import { snapClips, snapOps } from "../../techniques/pixel-parts";
import { KNIGHT48_GRID, KNIGHT48_H, KNIGHT48_PALETTE, KNIGHT48_W } from "./pixels48";
import { KNIGHT48_UNIT as U, knight48Rig as rig } from "./rig48";

const INK = Object.fromEntries(Object.entries(KNIGHT48_PALETTE).map(([ch, hex]) => [hex, ch]));

/** the snapped ops back to a text grid in the drawing's own frame */
function toGrid(ops: ReturnType<typeof snapOps>): string[] {
  const rows = Array.from({ length: KNIGHT48_H }, () => Array(KNIGHT48_W).fill("."));
  for (const o of ops) {
    if (o.k !== "r") throw new Error(`snapped op is a ${o.k}`);
    const c0 = o.x / U + 16, r = o.y / U + 52, n = o.w / U;
    for (let i = 0; i < n; i++) rows[r][c0 + i] = INK[o.f] ?? "?";
  }
  return rows.map((r) => r.join(""));
}

describe("the 48px knight on the rig", () => {
  it("validates", () => expect(validateRig(rig)).toEqual([]));

  it("at rest, the eight parts re-compose the drawing cell for cell", () => {
    expect(toGrid(snapOps(bakePose(rig, {}), U))).toEqual(KNIGHT48_GRID);
  });

  it("no cell belongs to two parts", () => {
    const cells = rig.parts.flatMap((p) => p.ops).reduce((n, o) => n + (o.k === "r" ? o.w / U : 0), 0);
    const ink = KNIGHT48_GRID.join("").replace(/\./g, "").length;
    expect(cells).toBe(ink);
  });

  it("every snapped frame is on the pixel grid and in the palette", () => {
    const clips = snapClips(bakeAll(rig), U);
    const allowed = new Set([...Object.values(KNIGHT48_PALETTE), "rgba(255,255,255,.55)"]);
    for (const c of clips) for (const f of c.frames) for (const o of f.ops) {
      expect(o.k).toBe("r");
      if (o.k !== "r") continue;
      expect(Math.abs(o.x % U), `${f.name} x`).toBe(0);
      expect(Math.abs(o.y % U), `${f.name} y`).toBe(0);
      expect(o.h).toBe(U);
      expect(allowed.has(o.f), `${f.name} colour ${o.f}`).toBe(true);
    }
  });

  it("keeps its feet on the ground in every standing clip", () => {
    for (const c of snapClips(bakeAll(rig), U)) {
      if (c.id === "ko") continue;
      for (const f of c.frames) {
        const [, y, , h] = bounds(f.ops)!;
        expect(Math.abs(y + h), f.name).toBeLessThanOrEqual(U);
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
