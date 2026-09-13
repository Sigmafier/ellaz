// The room's geometry on the crypt's real data: walls and props block, a body
// slides along a wall, a line of sight sees a pillar, A* walks round it and
// never cuts a blocked corner, and the straightening drops the waypoints a
// clear line makes redundant.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { centre, clampInside, clearLine, dist, findPath, hits, isBlocked, isqrt, moveBy, pull, tileI, tileIndex, tileJ, tileOf } from "./grid";
import { TILE } from "./types";
import type { CRoom } from "./types";

const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const room = data.room;
const R = data.actors[0].radius;
const STEP = data.rules.lineStep;
const at = (i: number, j: number): { x: number; y: number } => ({ x: centre(i), y: centre(j) });

describe("tiles", () => {
  it("index, i, j and tileOf round-trip", () => {
    expect(tileIndex(12, 3, 7)).toBe(43);
    expect(tileI(12, 43)).toBe(3);
    expect(tileJ(12, 43)).toBe(7);
    expect(tileOf(centre(5))).toBe(5);
    expect(tileOf(5 * TILE)).toBe(5);
    expect(tileOf(5 * TILE - 1)).toBe(4);
  });

  it("the five props and every wall are blocked; the start and the door tiles are not", () => {
    for (const [i, j] of [[3, 7], [7, 3], [1, 10], [2, 10], [10, 1]]) expect({ i, j, blocked: isBlocked(room, i, j) }).toEqual({ i, j, blocked: true });
    expect(isBlocked(room, -1, 5)).toBe(true);
    expect(isBlocked(room, 5, 12)).toBe(true);
    expect(isBlocked(room, 5, 7)).toBe(false);
    for (const d of room.door) expect(isBlocked(room, tileI(room.n, d), tileJ(room.n, d))).toBe(false);
  });

  it("a body against a prop hits it by any corner; one just inside its own tile does not", () => {
    expect(hits(room, centre(5), centre(7), R)).toBe(false);
    // the knight's body edge crossing into the pillar's tile (3, 7) from tile (4, 7)
    expect(hits(room, 4 * TILE + R - 1, centre(7), R)).toBe(true);
    expect(hits(room, 4 * TILE + R + 1, centre(7), R)).toBe(false);
  });
});

describe("moveBy", () => {
  it("stops at a wall on one axis and slides on the other", () => {
    const a = { x: R + 1, y: centre(5) };
    moveBy(room, a, -TILE, TILE, R);
    expect(a.x).toBe(R + 1);
    expect(a.y).toBe(centre(5) + TILE);
  });

  it("moves freely across the open floor", () => {
    const a = at(5, 5);
    moveBy(room, a, 12, -12, R);
    expect(a).toEqual({ x: centre(5) + 12, y: centre(5) - 12 });
  });

  it("clampInside keeps a flier off the walls by its pad", () => {
    const a = { x: -50, y: 13 * TILE };
    clampInside(room, a, 100);
    expect(a).toEqual({ x: 100, y: 12 * TILE - 100 });
  });
});

describe("isqrt and dist", () => {
  it("is exact on squares, floors between them, and 0 at or below 0", () => {
    expect(isqrt(0)).toBe(0);
    expect(isqrt(-4)).toBe(0);
    expect(isqrt(1)).toBe(1);
    expect(isqrt(255)).toBe(15);
    expect(isqrt(256)).toBe(16);
    expect(isqrt(65535)).toBe(255);
    expect(isqrt(65536)).toBe(256);
    expect(isqrt(3072 * 3072 * 2)).toBe(4344);
    expect(dist(3, 4)).toBe(5);
    expect(dist(-256, 256)).toBe(362);
  });
});

describe("clearLine", () => {
  it("sees across the open floor, and not through the pillar at (3, 7)", () => {
    expect(clearLine(room, centre(5), centre(7), centre(9), centre(7), R, STEP)).toBe(true);
    expect(clearLine(room, centre(5), centre(7), centre(1), centre(7), R, STEP)).toBe(false);
  });

  it("a zero-length line is clear", () => {
    expect(clearLine(room, centre(5), centre(7), centre(5), centre(7), R, STEP)).toBe(true);
  });

  it("the control: the same line reads clear once the pillar is lifted", () => {
    const open: CRoom = { ...room, blocked: room.blocked.map((b, k) => (k === tileIndex(12, 3, 7) ? false : b)) };
    expect(clearLine(open, centre(5), centre(7), centre(1), centre(7), R, STEP)).toBe(true);
  });
});

describe("findPath", () => {
  const walk = (p: number[]): [number, number][] => p.map((k) => [tileI(12, k), tileJ(12, k)]);

  it("from the start to the far corner: tile indices, never a blocked one, never cutting a blocked corner", () => {
    const p = findPath(room, centre(5), centre(7), 0, 0)!;
    expect(p).not.toBeNull();
    expect(p[p.length - 1]).toBe(tileIndex(12, 0, 0));
    let pi = 5, pj = 7;
    for (const k of p) {
      const i = tileI(12, k), j = tileJ(12, k);
      expect(isBlocked(room, i, j)).toBe(false);
      expect(Math.max(Math.abs(i - pi), Math.abs(j - pj))).toBe(1);
      if (i !== pi && j !== pj) { expect(isBlocked(room, i, pj)).toBe(false); expect(isBlocked(room, pi, j)).toBe(false); }
      pi = i; pj = j;
    }
  });

  it("walks round the pillar at (3, 7) to reach (1, 7), and the control: lifting the pillar makes the walk straight", () => {
    const round = findPath(room, centre(5), centre(7), 1, 7)!;
    expect(walk(round)).not.toContainEqual([3, 7]);
    // an 8-direction detour costs more (two diagonals) but takes the SAME number of tiles as the straight
    // walk - the first version of this control compared lengths and could not fire (2026-09-13)
    expect(walk(round).some(([, j]) => j !== 7)).toBe(true);
    const open: CRoom = { ...room, blocked: room.blocked.map((b, k) => (k === tileIndex(12, 3, 7) ? false : b)) };
    const straight = findPath(open, centre(5), centre(7), 1, 7)!;
    expect(walk(straight)).toEqual([[4, 7], [3, 7], [2, 7], [1, 7]]);
  });

  it("a blocked goal and a walled-off goal are null; the start tile itself is a one-tile path", () => {
    expect(findPath(room, centre(5), centre(7), 3, 7)).toBeNull();
    expect(findPath(room, centre(5), centre(7), 12, 5)).toBeNull();
    const fenced: CRoom = { ...room, blocked: room.blocked.map((b, k) => b || [tileIndex(12, 0, 1), tileIndex(12, 1, 0), tileIndex(12, 1, 1)].includes(k)) };
    expect(findPath(fenced, centre(5), centre(7), 0, 0)).toBeNull();
    expect(findPath(room, centre(5), centre(7), 5, 7)).toEqual([tileIndex(12, 5, 7)]);
  });

  it("is deterministic: the same query twice gives the same tiles", () => {
    expect(findPath(room, centre(2), centre(3), 10, 9)).toEqual(findPath(room, centre(2), centre(3), 10, 9));
  });
});

describe("pull", () => {
  it("drops the waypoints on a clear line to one, and keeps the ones a pillar hides", () => {
    const a = at(5, 7);
    const straight = findPath(room, a.x, a.y, 9, 7)!;
    expect(straight.length).toBe(4);
    pull(room, a, straight, R, STEP);
    expect(straight).toEqual([tileIndex(12, 9, 7)]);
    const round = findPath(room, a.x, a.y, 1, 7)!;
    const before = round.length;
    pull(room, a, round, R, STEP);
    expect(round.length).toBeGreaterThan(1);
    expect(round.length).toBeLessThanOrEqual(before);
    expect(round[round.length - 1]).toBe(tileIndex(12, 1, 7));
  });
});
