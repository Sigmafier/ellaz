import { describe, it, expect } from "vitest";
import { SHAPE_IDS, SHAPE_NAMES, shapePath, type ShapeId } from "./shapes";

// Parameter count per absolute command we emit. Anything else is a test failure
// by construction: the parser below refuses to guess.
const ARITY: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, A: 7, Z: 0 };
// Which parameter slots of each command are an (x, y) POSITION. For an arc, the
// first five are radii/rotation/flags, not coordinates.
const POSITIONS: Record<string, number[]> = { M: [0], L: [0], C: [0, 2, 4], Q: [0, 2], A: [5], Z: [] };

/**
 * Pull every (x, y) the path actually places a pen at, control points included.
 * A naive "grab all the numbers" regex would also swallow arc radii and sweep
 * flags, which is how a bounding-box check passes on a path that escapes the box.
 */
function positions(d: string): Array<[number, number]> {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const out: Array<[number, number]> = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    expect(cmd, `unexpected token in path: ${cmd}`).toMatch(/^[A-Za-z]$/);
    expect(ARITY, `unsupported command ${cmd}`).toHaveProperty(cmd);
    const args = tokens.slice(i, i + ARITY[cmd]).map(Number);
    expect(args).toHaveLength(ARITY[cmd]);
    for (const a of args) expect(Number.isFinite(a)).toBe(true);
    for (const slot of POSITIONS[cmd]) out.push([args[slot], args[slot + 1]]);
    i += ARITY[cmd];
  }
  return out;
}

describe("SHAPE_IDS", () => {
  it("holds unique ids", () => {
    expect(new Set(SHAPE_IDS).size).toBe(SHAPE_IDS.length);
  });
});

describe("SHAPE_NAMES", () => {
  it("is total over SHAPE_IDS, in both locales", () => {
    for (const id of SHAPE_IDS) {
      const name = SHAPE_NAMES[id];
      expect(name, `missing name for ${id}`).toBeDefined();
      expect(name.he.trim().length).toBeGreaterThan(0);
      expect(name.en.trim().length).toBeGreaterThan(0);
    }
  });

  it("carries no name for a shape that does not exist", () => {
    expect(Object.keys(SHAPE_NAMES).sort()).toEqual([...SHAPE_IDS].sort());
  });

  it("writes the Hebrew name in Hebrew letters", () => {
    for (const id of SHAPE_IDS) expect(/[א-ת]/.test(SHAPE_NAMES[id].he)).toBe(true);
  });
});

describe("shapePath", () => {
  it("yields a non-empty path starting with M for every id", () => {
    for (const id of SHAPE_IDS) {
      const d = shapePath(id);
      expect(d.length).toBeGreaterThan(0);
      expect(d.startsWith("M ")).toBe(true);
    }
  });

  it("closes every path", () => {
    for (const id of SHAPE_IDS) expect(shapePath(id).trimEnd().endsWith("Z")).toBe(true);
  });

  it("keeps every drawn point inside the box, at the default size", () => {
    for (const id of SHAPE_IDS) {
      for (const [x, y] of positions(shapePath(id))) {
        expect(x, `${id} x`).toBeGreaterThanOrEqual(0);
        expect(x, `${id} x`).toBeLessThanOrEqual(100);
        expect(y, `${id} y`).toBeGreaterThanOrEqual(0);
        expect(y, `${id} y`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("keeps every drawn point inside the box at other sizes too", () => {
    for (const size of [1, 44, 200, 1024]) {
      for (const id of SHAPE_IDS) {
        for (const [x, y] of positions(shapePath(id, size))) {
          expect(x, `${id}@${size} x`).toBeGreaterThanOrEqual(0);
          expect(x, `${id}@${size} x`).toBeLessThanOrEqual(size);
          expect(y, `${id}@${size} y`).toBeGreaterThanOrEqual(0);
          expect(y, `${id}@${size} y`).toBeLessThanOrEqual(size);
        }
      }
    }
  });

  it("actually FILLS the box — a path hugging the centre would pass the bound above", () => {
    // Positive control for the containment test: "every point at (50,50)" is
    // inside the box too, and would score green without this. The floor is 40
    // rather than 50 because a crescent is genuinely narrower than its box.
    for (const id of SHAPE_IDS) {
      const pts = positions(shapePath(id));
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      expect(Math.max(...xs) - Math.min(...xs), `${id} width`).toBeGreaterThan(40);
      expect(Math.max(...ys) - Math.min(...ys), `${id} height`).toBeGreaterThan(40);
    }
  });

  it("is centred — the drawn extent straddles the middle of the box", () => {
    for (const id of SHAPE_IDS) {
      const pts = positions(shapePath(id));
      const midX = (Math.max(...pts.map((p) => p[0])) + Math.min(...pts.map((p) => p[0]))) / 2;
      const midY = (Math.max(...pts.map((p) => p[1])) + Math.min(...pts.map((p) => p[1]))) / 2;
      expect(Math.abs(midX - 50), `${id} centre x`).toBeLessThanOrEqual(6);
      expect(Math.abs(midY - 50), `${id} centre y`).toBeLessThanOrEqual(6);
    }
  });

  it("scales linearly with size", () => {
    for (const id of SHAPE_IDS) {
      const small = positions(shapePath(id, 100));
      const big = positions(shapePath(id, 300));
      expect(big).toHaveLength(small.length);
      for (let i = 0; i < small.length; i++) {
        expect(big[i][0]).toBeCloseTo(small[i][0] * 3, 2);
        expect(big[i][1]).toBeCloseTo(small[i][1] * 3, 2);
      }
    }
  });

  it("gives every shape a DIFFERENT path", () => {
    const paths = SHAPE_IDS.map((id) => shapePath(id));
    expect(new Set(paths).size).toBe(SHAPE_IDS.length);
  });

  it("is stable — the same id and size always give the same string", () => {
    for (const id of SHAPE_IDS) expect(shapePath(id, 64)).toBe(shapePath(id, 64));
  });

  it("throws an honest error on an id that is not a shape", () => {
    expect(() => shapePath("blob" as ShapeId)).toThrow(/unknown shape id/);
  });
});
