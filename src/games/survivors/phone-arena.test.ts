import { describe, expect, it } from "vitest";
import { ARENA } from "./logic";
import { phoneArena } from "./phoneArena";

/**
 * The phone arena fills the phone's box and keeps the floor the game was tuned on.
 *
 * Operator ruling 2026-09-14: "the game should have a full height experience".
 * Picked off a real render (hall `20260914-021853`): at 390x844 the arena goes
 * 359x478 -> 359x775 on screen. The same-AREA law is the landscape arena's
 * (`ARENA_WIDE`), for the same reason: floor sets the crowd's density.
 */
const AREA = ARENA.w * ARENA.h;

describe("phoneArena", () => {
  it("shapes the floor to the box it will be drawn in, holding the tuned area", () => {
    const a = phoneArena(359, 775); // 390x844 under the one 52px bar
    expect(a.w / a.h).toBeCloseTo(359 / 775, 2);
    expect(Math.abs(a.w * a.h - AREA) / AREA).toBeLessThan(0.01);
    expect(a.h).toBeGreaterThan(ARENA.h); // the point of the change: taller
  });

  it("never goes wider than today's portrait arena - a short or wide box keeps ARENA exactly", () => {
    expect(phoneArena(359, 478)).toBe(ARENA);
    expect(phoneArena(600, 500)).toBe(ARENA);
  });

  it("stops at a floor on an absurdly tall box rather than a corridor", () => {
    const a = phoneArena(300, 2000);
    expect(a.w / a.h).toBeGreaterThanOrEqual(0.4 - 0.01);
    expect(Math.abs(a.w * a.h - AREA) / AREA).toBeLessThan(0.01);
  });

  it("answers an unmeasurable box with the portrait arena, never NaN", () => {
    for (const [w, h] of [[0, 800], [359, 0], [Number.NaN, 800], [-1, -1]] as const) {
      expect(phoneArena(w, h)).toBe(ARENA);
    }
  });

  it("is whole units, because the sim clamps and spawns on integers", () => {
    const a = phoneArena(351, 701);
    expect(Number.isInteger(a.w) && Number.isInteger(a.h)).toBe(true);
  });
});
