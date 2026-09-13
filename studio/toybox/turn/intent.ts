// An enemy's plan, written onto its own row so the player can read it before
// ending the turn: the nearest hero (ties to the one with less hp, then to the
// earlier row), the reachable tile that gets closest to that hero (ties to the
// shorter walk, then to the earlier-found tile), and whether the strike lands
// from there. Enemies plan in row order and each reserves its stop, so two
// never plan the same tile - the demo's own fix, carried over.
//
// `planIntents` writes into the units it is given. step() hands it a fresh
// copy; nothing else may call it on a state it did not clone.

import { dist, reachable, tileIndex } from "./grid";
import type { TurnData, UnitState } from "./types";

/** the hero an enemy wants: nearest, then weakest, then earliest; -1 when none stands */
function pickTarget(data: TurnData, units: readonly UnitState[], e: number): number {
  let best = -1, bestD = 0, bestHp = 0;
  for (let i = 0; i < units.length; i++) {
    if (units[i].hp <= 0 || data.units[i].team !== 0) continue;
    const d = dist(units[i].c, units[i].r, units[e].c, units[e].r);
    if (best < 0 || d < bestD || (d === bestD && units[i].hp < bestHp)) { best = i; bestD = d; bestHp = units[i].hp; }
  }
  return best;
}

export function planIntents(data: TurnData, units: UnitState[]): void {
  const reserved: boolean[] = new Array(data.grid.cols * data.grid.rows).fill(false);
  for (let e = 0; e < units.length; e++) {
    const unit = units[e];
    if (unit.hp <= 0 || data.units[e].team === 0) continue;
    const target = pickTarget(data, units, e);
    if (target < 0) { unit.target = -1; unit.strikes = 0; unit.path = []; continue; }
    const t = units[target];
    const near = (c: number, r: number): number => dist(c, r, t.c, t.r);
    let from = { c: unit.c, r: unit.r, path: [] as number[] }, fromNear = near(unit.c, unit.r);
    for (const tile of reachable(data, units, e, reserved)) {
      const n = near(tile.c, tile.r);
      if (n < fromNear || (n === fromNear && tile.path.length < from.path.length)) { from = tile; fromNear = n; }
    }
    reserved[tileIndex(data.grid, from.c, from.r)] = true;
    unit.target = target;
    unit.path = from.path;
    unit.strikes = fromNear <= data.units[e].range ? 1 : 0;
  }
}
