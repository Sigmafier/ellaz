import { describe, expect, it } from "vitest";
import { GB, NES, NES_HEX, gbShade, hexToRgb, luma, nearest, nesSnap, quantizeImage, rgbToHex } from "./quantize";

describe("hex round trip", () => {
  it("parses and prints", () => {
    expect(hexToRgb("#ff4d8d")).toEqual([255, 77, 141]);
    expect(rgbToHex([255, 77, 141])).toBe("#ff4d8d");
    expect(rgbToHex([300, -1, 4.6])).toBe("#ff0005");
  });
  it("refuses a non-hex fill loudly", () => expect(() => hexToRgb("rgba(0,0,0,.3)")).toThrow(/not #rrggbb/));
});

describe("nearest", () => {
  it("returns a palette member exactly, never an interpolation", () => {
    const q = nearest(NES);
    const out = q(250, 60, 10);
    expect(NES).toContainEqual(out);
    expect(q(0, 0, 0)).toEqual([0, 0, 0]);
  });
  it("every NES hex maps to itself", () => {
    const q = nearest(NES);
    for (const h of NES_HEX) expect(q(...hexToRgb(h))).toEqual(hexToRgb(h));
  });
  it("refuses an empty palette", () => expect(() => nearest([])).toThrow(/empty/));
});

describe("Game Boy", () => {
  it("four shades ordered dark to light", () => {
    const ls = GB.map(([r, g, b]) => luma(r, g, b));
    expect(ls).toEqual([...ls].sort((a, b) => a - b));
  });
  it("black takes the darkest, white the lightest", () => {
    expect(gbShade(0, 0, 0)).toEqual(GB[0]);
    expect(gbShade(255, 255, 255)).toEqual(GB[3]);
  });
});

describe("nesSnap", () => {
  it("collapses a grey to an unsaturated band and keeps a red red", () => {
    const [r, g, b] = nesSnap(128, 128, 128);
    expect(r).toBe(g);
    expect(g).toBe(b);
    const [rr, rg, rb] = nesSnap(216, 52, 46);
    expect(rr).toBeGreaterThan(rg + 60);
    expect(rr).toBeGreaterThan(rb + 60);
  });
  it("is idempotent: snapping a snapped colour changes nothing", () => {
    for (const c of [[10, 200, 90], [240, 240, 10], [60, 60, 200], [30, 20, 20]] as const) {
      const once = nesSnap(c[0], c[1], c[2]);
      expect(nesSnap(once[0], once[1], once[2])).toEqual(once);
    }
  });
});

describe("quantizeImage", () => {
  it("snaps opaque pixels and leaves transparent ones alone", () => {
    const d = new Uint8ClampedArray([250, 60, 10, 255, 250, 60, 10, 0]);
    quantizeImage(d, nearest(NES));
    expect([d[0], d[1], d[2]]).toEqual(nearest(NES)(250, 60, 10));
    expect([d[4], d[5], d[6]]).toEqual([250, 60, 10]);
  });
});
