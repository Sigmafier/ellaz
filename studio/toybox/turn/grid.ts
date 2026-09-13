// The grid: which tiles exist, who stands where, how far a unit can walk and
// whom it can reach. Every function here is a pure read of the data and the
// units; `reachable` is the one with a loop worth naming - a breadth-first
// walk that passes through allies and never through foes, so a unit can
// slip past a friend but never a wall of enemies.
//
// Tiles are named by row-major index (r * cols + c) wherever a list of them
// is stored, and by (c, r) wherever a rule is written, because the first is
// what a hashed path holds and the second is what a human reads.

import { abs, floorDiv } from "../sim/fixed";
import type { CGrid, TurnData, UnitState } from "./types";

export const tileIndex = (g: CGrid, c: number, r: number): number => r * g.cols + c;
export const colOf = (g: CGrid, idx: number): number => idx - floorDiv(idx, g.cols) * g.cols;
export const rowOf = (g: CGrid, idx: number): number => floorDiv(idx, g.cols);

/** the bottom-centre of tile (c, r), FP: where a unit's feet stand */
export const tileX = (g: CGrid, c: number): number => g.x + c * g.tileW + floorDiv(g.tileW, 2);
export const tileY = (g: CGrid, r: number): number => g.y + r * g.tileH;

/** on the board and not blocked */
export function inGrid(g: CGrid, c: number, r: number): boolean {
  return c >= 0 && c < g.cols && r >= 0 && r < g.rows && !g.blocked[tileIndex(g, c, r)];
}

export const dist = (ac: number, ar: number, bc: number, br: number): number => abs(ac - bc) + abs(ar - br);

/** the alive unit standing on (c, r), or -1 */
export function unitAt(units: readonly UnitState[], c: number, r: number): number {
  for (let i = 0; i < units.length; i++) if (units[i].hp > 0 && units[i].c === c && units[i].r === r) return i;
  return -1;
}

/** a tile a unit can stop on, and the tiles walked to reach it (row-major indices, the origin excluded) */
export interface Reach { c: number; r: number; path: number[] }

const STEPS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * The tiles unit `u` can reach this turn, in discovery order, the origin first
 * with an empty path. A tile with an alive foe stops the walk; one with an ally
 * is passed through but never stopped on; one in `reserved` (an earlier
 * enemy's planned stop) is likewise passable and unstoppable. Paths are the
 * shortest by construction (breadth-first), and among equals the first found.
 */
export function reachable(data: TurnData, units: readonly UnitState[], u: number, reserved: readonly boolean[] | null): Reach[] {
  const g = data.grid;
  const me = units[u], team = data.units[u].team, move = data.units[u].move;
  const seen: boolean[] = new Array(g.cols * g.rows).fill(false);
  seen[tileIndex(g, me.c, me.r)] = true;
  const out: Reach[] = [{ c: me.c, r: me.r, path: [] }];
  const queue: { c: number; r: number; path: number[]; n: number }[] = [{ c: me.c, r: me.r, path: [], n: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur.n === move) continue;
    for (const [dc, dr] of STEPS) {
      const c = cur.c + dc, r = cur.r + dr;
      if (!inGrid(g, c, r)) continue;
      const idx = tileIndex(g, c, r);
      if (seen[idx]) continue;
      const o = unitAt(units, c, r);
      if (o >= 0 && data.units[o].team !== team) continue;
      seen[idx] = true;
      const path = [...cur.path, idx];
      if (o < 0 && !(reserved && reserved[idx])) out.push({ c, r, path });
      queue.push({ c, r, path, n: cur.n + 1 });
    }
  }
  return out;
}

/** the alive foes of unit `u` within its range of (c, r), in unit order */
export function targetsFrom(data: TurnData, units: readonly UnitState[], u: number, c: number, r: number): number[] {
  const out: number[] = [];
  const team = data.units[u].team, range = data.units[u].range;
  for (let i = 0; i < units.length; i++) {
    if (units[i].hp <= 0 || data.units[i].team === team) continue;
    if (dist(units[i].c, units[i].r, c, r) <= range) out.push(i);
  }
  return out;
}
