import { describe, expect, it } from "vitest";
import { C, E, P, R, bbox, bounds, flipX, place, validate, type Scene } from "./scene-ops";

describe("bbox", () => {
  it("rect is itself", () => expect(bbox(R(1, 2, 3, 4, "#000"))).toEqual([1, 2, 3, 4]));
  it("circle is centred", () => expect(bbox(C(10, 10, 5, "#000"))).toEqual([5, 5, 10, 10]));
  it("ellipse uses both radii", () => expect(bbox(E(10, 10, 4, 2, "#000"))).toEqual([6, 8, 8, 4]));
  it("polygon is the hull box", () => expect(bbox(P([[0, 0], [10, 2], [4, 8]], "#000"))).toEqual([0, 0, 10, 8]));
  it("bounds of an empty list is null", () => expect(bounds([])).toBeNull());
  it("bounds spans every op", () => expect(bounds([R(0, 0, 2, 2, "#000"), C(10, 10, 1, "#000")])).toEqual([0, 0, 11, 11]));
});

describe("place", () => {
  it("scales about the origin then translates, every kind", () => {
    const ops = place([R(1, 1, 2, 2, "#000", true, 1), C(1, 1, 1, "#000"), E(1, 1, 1, 2, "#000"), P([[0, 0], [1, 0], [0, 1]], "#000")], 10, 20, 2);
    expect(bbox(ops[0])).toEqual([12, 22, 4, 4]);
    expect((ops[0] as { rx: number }).rx).toBe(2);
    expect(bbox(ops[1])).toEqual([10, 20, 4, 4]);
    expect(bbox(ops[2])).toEqual([10, 18, 4, 8]);
    expect(bbox(ops[3])).toEqual([10, 20, 2, 2]);
  });
  it("keeps fill and fg", () => {
    const [op] = place([R(0, 0, 1, 1, "#abc", false)], 5, 5);
    expect(op.f).toBe("#abc");
    expect(op.fg).toBe(false);
  });
});

describe("flipX", () => {
  it("mirrors a rect about the axis", () => expect(bbox(flipX([R(0, 0, 4, 2, "#000")], 10)[0])).toEqual([16, 0, 4, 2]));
  it("mirrors circle centre and polygon points", () => {
    const [c, p] = flipX([C(2, 0, 1, "#000"), P([[0, 0], [4, 0], [4, 4]], "#000")], 5);
    expect(bbox(c)).toEqual([7, -1, 2, 2]);
    expect((p as { pts: number[][] }).pts).toEqual([[10, 0], [6, 0], [6, 4]]);
  });
  it("is its own inverse", () => {
    const ops = [R(3, 1, 2, 2, "#000"), E(7, 7, 2, 1, "#000")];
    expect(flipX(flipX(ops, 4), 4)).toEqual(ops);
  });
});

describe("validate", () => {
  const good: Scene = { id: "t", w: 10, h: 10, ops: [R(0, 0, 1, 1, "#000", false), C(1, 1, 1, "#fff")] };
  it("accepts a well-formed scene", () => expect(validate(good)).toEqual([]));
  it("names every defect with the scene, index and kind", () => {
    const bad: Scene = { id: "bad", w: 0, h: 10, ops: [R(0, 0, -1, 1, "#000"), C(NaN, 0, 1, "#000"), P([[0, 0], [1, 1]], ""), E(0, 0, 1, -1, "#000")] };
    const out = validate(bad);
    expect(out).toContainEqual(expect.stringContaining("size 0x10"));
    expect(out).toContainEqual(expect.stringContaining("op[0] (r): negative size"));
    expect(out).toContainEqual(expect.stringContaining("op[1] (c): non-finite"));
    expect(out).toContainEqual(expect.stringContaining("op[2] (p): no fill"));
    expect(out).toContainEqual(expect.stringContaining("op[2] (p): polygon needs 3 points, has 2"));
    expect(out).toContainEqual(expect.stringContaining("op[3] (e): negative radius"));
  });
});
