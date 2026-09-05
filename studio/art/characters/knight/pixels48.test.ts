import { describe, expect, it } from "vitest";
import { KNIGHT48_GRID, KNIGHT48_H, KNIGHT48_PALETTE, KNIGHT48_W, knight48Ops } from "./pixels48";

describe("the hand-authored 48px knight", () => {
  it("is a rectangle of exactly the declared size", () => {
    expect(KNIGHT48_GRID.length).toBe(KNIGHT48_H);
    const bad = KNIGHT48_GRID.map((r, i) => [i, r.length] as const).filter(([, n]) => n !== KNIGHT48_W);
    expect(bad, `rows with the wrong width (row, width): ${JSON.stringify(bad)}`).toEqual([]);
  });

  it("uses only palette characters and the transparent dot", () => {
    const unknown = new Set<string>();
    for (const row of KNIGHT48_GRID) for (const ch of row) if (ch !== "." && !KNIGHT48_PALETTE[ch]) unknown.add(ch);
    expect([...unknown]).toEqual([]);
  });

  it("stands 48 rows tall from plume to sole, with the blade above", () => {
    const inkRows = KNIGHT48_GRID.map((r, i) => (/[^.]/.test(r) ? i : -1)).filter((i) => i >= 0);
    const bodyTop = KNIGHT48_GRID.findIndex((r) => r.includes("M"));
    expect(inkRows[inkRows.length - 1] - bodyTop + 1).toBe(48);
    expect(inkRows[0]).toBeLessThan(bodyTop);
  });

  it("every palette ramp is hue-shifted, not a plain darkening", () => {
    // light and shadow steps of one material must differ in hue, not only in value
    const hue = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d === 0) return 0;
      const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60) % 360;
    };
    const ramps: [string, string][] = [["P", "q"], ["C", "x"], ["S", "z"], ["G", "h"], ["V", "v"]];
    for (const [light, dark] of ramps) {
      const diff = Math.abs(hue(KNIGHT48_PALETTE[light]) - hue(KNIGHT48_PALETTE[dark]));
      expect(diff, `${light}->${dark} shares a hue`).toBeGreaterThan(2);
    }
  });

  it("renders to ops with feet at the origin", () => {
    const ops = knight48Ops(1);
    expect(ops.length).toBeGreaterThan(200);
    const bottom = Math.max(...ops.map((o) => (o.k === "r" ? o.y + o.h : 0)));
    expect(bottom).toBe(0);
  });
});
