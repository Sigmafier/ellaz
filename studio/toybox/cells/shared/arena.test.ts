// The arena painter: each art kind turns into flat rects inside the view,
// reproducibly from its seed, in the colours the file names; an unknown kind
// draws nothing and says so once; a rect past the view is clipped away.
//
// The three crypt kinds (stone, flagstones, door) are the ones written with
// this file; the toybox's three (wall, planks, shelf) had no test before it
// and get the same shape checks, so the population below is every kind the
// painter knows.

import { describe, expect, it, vi } from "vitest";
import { arenaOps, PALETTE } from "./arena";
import type { ArenaDrawOp } from "../contract";

const VIEW = { w: 640, h: 360 };
const paint = (item: Record<string, unknown>, view = VIEW): ArenaDrawOp[] =>
  arenaOps({ palette: "snes16", bands: [item], props: [] }, view);
const inside = (o: ArenaDrawOp, x: number, y: number, w: number, h: number) =>
  o.x >= x && o.y >= y && o.x + o.w <= x + w && o.y + o.h <= y + h;
const colorsOf = (ops: ArenaDrawOp[]) => new Set(ops.map((o) => o.color));

const STONE = { kind: "stone", y: 0, h: 150, seed: 5, rowH: 18, colors: ["stoneLight", "stone", "stoneDark", "stoneLine"] };
const FLAGS = { kind: "flagstones", y: 157, h: 203, seed: 7, rowH: 16, rowGrow: 3, colors: ["flag", "flagLine", "flagLight"] };
const DOOR = { kind: "door", x: 525, y: 34, w: 70, h: 123 };

describe("stone: a wall of blocks with mortar lines", () => {
  const ops = paint(STONE);

  it("emits at least two rects per row, every one inside the band, in the four colours the band names", () => {
    const rows = Math.ceil(STONE.h / STONE.rowH);
    expect(ops.length).toBeGreaterThanOrEqual(rows * 2);
    for (const o of ops) expect(inside(o, 0, STONE.y, VIEW.w, STONE.h)).toBe(true);
    const named = new Set(STONE.colors.map((c) => PALETTE[c]));
    for (const c of colorsOf(ops)) expect(named.has(c)).toBe(true);
    expect(colorsOf(ops).size).toBe(4);
  });

  it("covers the band: a rect starts at the band's top and one ends at its bottom", () => {
    expect(Math.min(...ops.map((o) => o.y))).toBe(STONE.y);
    expect(Math.max(...ops.map((o) => o.y + o.h))).toBe(STONE.y + STONE.h);
  });

  it("is the same from the same seed and different from another", () => {
    expect(paint(STONE)).toEqual(ops);
    expect(paint({ ...STONE, seed: 6 })).not.toEqual(ops);
  });

  it("paints the wider world when the view is the world: rects reach past one screen", () => {
    const wide = paint(STONE, { w: 1920, h: 360 });
    expect(Math.max(...wide.map((o) => o.x + o.w))).toBe(1920);
  });
});

describe("flagstones: a floor of slabs in perspective", () => {
  const ops = paint(FLAGS);

  it("emits rects inside the band, in the three colours named, more than one per row", () => {
    expect(ops.length).toBeGreaterThan(Math.ceil(FLAGS.h / FLAGS.rowH));
    for (const o of ops) expect(inside(o, 0, FLAGS.y, VIEW.w, FLAGS.h)).toBe(true);
    const named = new Set(FLAGS.colors.map((c) => PALETTE[c]));
    for (const c of colorsOf(ops)) expect(named.has(c)).toBe(true);
    expect(colorsOf(ops).size).toBe(3);
  });

  it("covers the band top to bottom, and the rows grow toward the camera", () => {
    expect(Math.min(...ops.map((o) => o.y))).toBe(FLAGS.y);
    expect(Math.max(...ops.map((o) => o.y + o.h))).toBe(FLAGS.y + FLAGS.h);
    // the row lines are the full-width rects in the line colour; their spacing must never shrink
    const lines = ops.filter((o) => o.w === VIEW.w && o.color === PALETTE.flagLine).map((o) => o.y).sort((a, b) => a - b);
    expect(lines.length).toBeGreaterThan(3);
    const gaps = lines.slice(1).map((y, i) => y - lines[i]);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
  });

  it("is the same from the same seed and different from another", () => {
    expect(paint(FLAGS)).toEqual(ops);
    expect(paint({ ...FLAGS, seed: 8 })).not.toEqual(ops);
  });
});

describe("door: an archway in the back wall", () => {
  const ops = arenaOps({ palette: "snes16", bands: [], props: [DOOR] }, { w: 1920, h: 360 });

  it("fills exactly its box: the frame's outer edges are the prop's x, y, w, h", () => {
    expect(ops.length).toBeGreaterThan(3);
    for (const o of ops) expect(inside(o, DOOR.x, DOOR.y, DOOR.w, DOOR.h)).toBe(true);
    expect(Math.min(...ops.map((o) => o.x))).toBe(DOOR.x);
    expect(Math.max(...ops.map((o) => o.x + o.w))).toBe(DOOR.x + DOOR.w);
    expect(Math.min(...ops.map((o) => o.y))).toBe(DOOR.y);
    expect(Math.max(...ops.map((o) => o.y + o.h))).toBe(DOOR.y + DOOR.h);
  });

  it("has a dark opening inside a stone frame, and the opening is narrower at the top than at the foot (an arch)", () => {
    const dark = ops.filter((o) => o.color === PALETTE.doorDark);
    expect(dark.length).toBeGreaterThan(1);
    expect(colorsOf(ops).has(PALETTE.doorFrame)).toBe(true);
    const top = dark.reduce((a, b) => (a.y < b.y ? a : b));
    const foot = dark.reduce((a, b) => (a.y + a.h > b.y + b.h ? a : b));
    expect(top.w).toBeLessThan(foot.w);
    // the opening reaches the floor line: the foot of the darkness is the prop's foot
    expect(foot.y + foot.h).toBe(DOOR.y + DOOR.h);
  });

  it("a door past the view is clipped to nothing", () => {
    expect(arenaOps({ palette: "snes16", bands: [], props: [{ ...DOOR, x: 700 }] }, VIEW)).toEqual([]);
  });
});

describe("the painter's edges", () => {
  it("an unknown kind draws nothing and warns once, naming the kind", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(paint({ kind: "portcullis", x: 1, y: 2 })).toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/portcullis/);
    } finally {
      warn.mockRestore();
    }
  });

  it("every kind the painter knows emits something for its file shape - the population", () => {
    const kinds: Record<string, unknown>[] = [
      { kind: "wall", y: 0, h: 150, stripe: 40, colors: ["wallLight", "wallStripe"] },
      { kind: "planks", y: 157, h: 203, seed: 11, rowH: 16, rowGrow: 3, colors: ["floor", "floorLine", "floorLight"] },
      { kind: "shelf", x: 40, y: 104, w: 250, blocks: [{ x: 60, w: 24, h: 26, color: "pink" }] },
      STONE, FLAGS, DOOR,
    ];
    for (const k of kinds) {
      const ops = arenaOps({ palette: "snes16", bands: [k], props: [] }, VIEW);
      expect({ kind: k.kind, drew: ops.length > 0 }).toEqual({ kind: k.kind, drew: true });
      for (const o of ops) expect(inside(o, 0, 0, VIEW.w, VIEW.h)).toBe(true);
    }
  });
});
