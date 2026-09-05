import { describe, expect, it } from "vitest";
import { mulberry32, rngFor, seedFrom } from "./rng";

describe("rng", () => {
  it("same seed, same sequence", () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect(Array.from({ length: 5 }, () => a())).toEqual(Array.from({ length: 5 }, () => b()));
  });
  it("different seeds differ", () => expect(mulberry32(1)()).not.toBe(mulberry32(2)()));
  it("stays in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("string seeds are stable and distinct", () => {
    expect(seedFrom("paper:brawl-room")).toBe(seedFrom("paper:brawl-room"));
    expect(seedFrom("paper:brawl-room")).not.toBe(seedFrom("paper:ember-field"));
    expect(rngFor("x")()).toBe(rngFor("x")());
  });
});
