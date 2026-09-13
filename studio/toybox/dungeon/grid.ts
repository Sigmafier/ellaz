// The room's geometry: which tiles are in the way, how a body moves against
// them, whether a straight line is clear, and the path round what is not.
// Positions are FP tile units (256 = one tile); a tile index is i * n + j.
// The sketch's dungeon-actors.js is the line-by-line reference; where it used
// hypot and 1.414, this uses an integer square root and the costs 10 and 14.
//
// The two literals here, 10 and 14 (a straight step and a diagonal one in
// tenths), tune nothing: they are 1 and sqrt 2 as integers, the A* costs every
// port agrees on, in the same class as FP and the FNV constants.

import { floorDiv } from "../sim/fixed";
import { TILE } from "./types";
import type { CRoom } from "./types";

const COST_STRAIGHT = 10;
const COST_DIAGONAL = 14;
const HALF = floorDiv(TILE, 2);

export const tileIndex = (n: number, i: number, j: number): number => i * n + j;
export const tileI = (n: number, idx: number): number => floorDiv(idx, n);
export const tileJ = (n: number, idx: number): number => idx - floorDiv(idx, n) * n;
/** the tile an FP coordinate lies in */
export const tileOf = (v: number): number => floorDiv(v, TILE);
/** the FP centre of tile index k on one axis */
export const centre = (k: number): number => k * TILE + HALF;

/** off the grid counts as blocked: the walls */
export function isBlocked(room: CRoom, i: number, j: number): boolean {
  if (i < 0 || j < 0 || i >= room.n || j >= room.n) return true;
  return room.blocked[tileIndex(room.n, i, j)];
}

/** does a body of half-width r at (x, y) overlap a blocked tile: its four corners */
export function hits(room: CRoom, x: number, y: number, r: number): boolean {
  return isBlocked(room, tileOf(x - r), tileOf(y - r)) || isBlocked(room, tileOf(x + r), tileOf(y - r))
    || isBlocked(room, tileOf(x - r), tileOf(y + r)) || isBlocked(room, tileOf(x + r), tileOf(y + r));
}

/** move a body by (dx, dy), each axis on its own so a wall stops one and the other slides */
export function moveBy(room: CRoom, a: { x: number; y: number }, dx: number, dy: number, r: number): void {
  if (!hits(room, a.x + dx, a.y, r)) a.x += dx;
  if (!hits(room, a.x, a.y + dy, r)) a.y += dy;
}

/** keep a point at least `pad` from the room's edge (a bat flies over props, never over walls) */
export function clampInside(room: CRoom, a: { x: number; y: number }, pad: number): void {
  const hi = room.n * TILE - pad;
  if (a.x < pad) a.x = pad; else if (a.x > hi) a.x = hi;
  if (a.y < pad) a.y = pad; else if (a.y > hi) a.y = hi;
}

/** the integer square root: floor(sqrt(n)), exact by the two adjusting loops whatever Math.sqrt rounds to */
export function isqrt(n: number): number {
  if (n <= 0) return 0;
  let x = Math.floor(Math.sqrt(n));
  while (x * x > n) x -= 1;
  while ((x + 1) * (x + 1) <= n) x += 1;
  return x;
}

/** the length of (dx, dy) in FP, floored */
export const dist = (dx: number, dy: number): number => isqrt(dx * dx + dy * dy);

/** is the straight line from a to b clear for a body of half-width r, sampled every `step` FP along it (manhattan) */
export function clearLine(room: CRoom, ax: number, ay: number, bx: number, by: number, r: number, step: number): boolean {
  const dx = bx - ax, dy = by - ay;
  const n = floorDiv((dx < 0 ? -dx : dx) + (dy < 0 ? -dy : dy) + step - 1, step);
  for (let s = 1; s <= n; s++) if (hits(room, ax + floorDiv(dx * s, n), ay + floorDiv(dy * s, n), r)) return false;
  return true;
}

/** A* over the grid, 8 directions, no cutting a blocked corner; the path as tile indices, the start tile excluded; null when unreachable */
export function findPath(room: CRoom, sx: number, sy: number, gi: number, gj: number): number[] | null {
  const n = room.n;
  if (isBlocked(room, gi, gj)) return null;
  const start = tileIndex(n, tileOf(sx), tileOf(sy)), goal = tileIndex(n, gi, gj);
  if (start === goal) return [goal];
  const g = new Array<number>(n * n).fill(-1), came = new Array<number>(n * n).fill(-1), done = new Array<boolean>(n * n).fill(false);
  const h = (p: number): number => {
    const a = tileI(n, p) - gi, b = tileJ(n, p) - gj;
    const da = a < 0 ? -a : a, db = b < 0 ? -b : b;
    return da > db ? COST_STRAIGHT * da + (COST_DIAGONAL - COST_STRAIGHT) * db : COST_STRAIGHT * db + (COST_DIAGONAL - COST_STRAIGHT) * da;
  };
  const open: number[] = [start];
  g[start] = 0;
  while (open.length > 0) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (g[open[k]] + h(open[k]) < g[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (done[cur]) continue;
    done[cur] = true;
    const ci = tileI(n, cur), cj = tileJ(n, cur);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      const ni = ci + di, nj = cj + dj;
      if (isBlocked(room, ni, nj) || (di !== 0 && dj !== 0 && (isBlocked(room, ci + di, cj) || isBlocked(room, ci, cj + dj)))) continue;
      const np = tileIndex(n, ni, nj), cost = g[cur] + (di !== 0 && dj !== 0 ? COST_DIAGONAL : COST_STRAIGHT);
      if (g[np] < 0 || cost < g[np]) { g[np] = cost; came[np] = cur; open.push(np); }
    }
  }
  if (g[goal] < 0) return null;
  const path: number[] = [];
  for (let p = goal; p !== start && p !== -1; p = came[p]) path.push(p);
  return path.reverse();
}

/** drop the path's next tile while the line to the one after it is clear: the sketch's straightening */
export function pull(room: CRoom, a: { x: number; y: number }, path: number[], r: number, step: number): void {
  while (path.length > 1 && clearLine(room, a.x, a.y, centre(tileI(room.n, path[1])), centre(tileJ(room.n, path[1])), r, step)) path.shift();
}
