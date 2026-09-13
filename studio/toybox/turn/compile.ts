// Raw files -> the frozen TurnData step() reads. The grid goes to FP once;
// every clip's frame duration becomes whole ticks once; every placement is
// checked against the grid, the blocked tiles and each other; every unit's
// set is checked for the five clips the rules will ask for. A refusal names
// the battle and the row, because a rule armed by data can be armed by wrong
// data, and "undefined" three ticks in is not a name.

import { floorDiv, toFP } from "../sim/fixed";
import { CLIPS } from "./types";
import type { CClip, CGrid, CUnit, LoadedTurn, TurnData, UnitFile } from "./types";

function compileGrid(loaded: LoadedTurn): CGrid {
  const g = loaded.battle.grid;
  const blocked: boolean[] = new Array(g.cols * g.rows).fill(false);
  for (const t of loaded.battle.blocked) {
    if (t.c < 0 || t.c >= g.cols || t.r < 0 || t.r >= g.rows) throw new Error(`turn: battle "${loaded.battle.id}" blocks (${t.c}, ${t.r}), off its ${g.cols}x${g.rows} grid`);
    blocked[t.r * g.cols + t.c] = true;
  }
  return Object.freeze({ cols: g.cols, rows: g.rows, tileW: toFP(g.tileW), tileH: toFP(g.tileH), x: toFP(g.x), y: toFP(g.y), blocked: Object.freeze(blocked) });
}

/** the five clips of one set, each frame lasting `tickRate / fps` whole ticks (never fewer than one) */
function compileClips(loaded: LoadedTurn, unit: UnitFile): CClip[] {
  const set = loaded.sets[unit.sprites];
  if (!set) throw new Error(`turn: unit "${unit.id}" names set "${unit.sprites}", which was not loaded`);
  return CLIPS.map((name) => {
    const anim = set.manifest.animations[name];
    if (!anim || anim.frames.length === 0) throw new Error(`turn: set "${unit.sprites}" (unit "${unit.id}") has no "${name}" clip, which the rules need`);
    const ticksPerFrame = Math.max(1, floorDiv(loaded.rules.tickRate, anim.fps));
    return Object.freeze({ frames: Object.freeze([...anim.frames]), ticksPerFrame, loop: anim.loop });
  });
}

function compileUnits(loaded: LoadedTurn, grid: CGrid): CUnit[] {
  const taken: boolean[] = new Array(grid.cols * grid.rows).fill(false);
  return loaded.battle.placements.map((p, i) => {
    const file = loaded.units.find((u) => u.id === p.unit);
    if (!file) throw new Error(`turn: battle "${loaded.battle.id}" placement ${i} names unit "${p.unit}", which was not loaded`);
    if (p.c < 0 || p.c >= grid.cols || p.r < 0 || p.r >= grid.rows) throw new Error(`turn: battle "${loaded.battle.id}" placement ${i} (${p.unit}) at (${p.c}, ${p.r}) is off the ${grid.cols}x${grid.rows} grid`);
    const idx = p.r * grid.cols + p.c;
    if (grid.blocked[idx]) throw new Error(`turn: battle "${loaded.battle.id}" placement ${i} (${p.unit}) stands on blocked tile (${p.c}, ${p.r})`);
    if (taken[idx]) throw new Error(`turn: battle "${loaded.battle.id}" placement ${i} (${p.unit}) shares tile (${p.c}, ${p.r}) with an earlier placement`);
    taken[idx] = true;
    if (file.hover !== undefined && !file.flying) throw new Error(`turn: unit "${file.id}" has a hover height but does not fly`);
    return Object.freeze({
      id: file.id, set: file.sprites, team: file.team, name: file.name,
      hp: file.hp, atk: file.atk, move: file.move, range: file.range, tall: file.tall,
      hover: file.flying ? file.hover ?? 0 : 0, flying: !!file.flying,
      clips: Object.freeze(compileClips(loaded, file)),
      c: p.c, r: p.r,
    });
  });
}

export function compileTurn(loaded: LoadedTurn): TurnData {
  const grid = compileGrid(loaded);
  const units = compileUnits(loaded, grid);
  if (!units.some((u) => u.team === 0)) throw new Error(`turn: battle "${loaded.battle.id}" places no unit on team 0 - nobody for the player to command`);
  return Object.freeze({
    rules: Object.freeze({ ...loaded.rules }),
    grid,
    units: Object.freeze(units),
    view: Object.freeze({ w: loaded.battle.view.w, h: loaded.battle.view.h }),
    seed: loaded.mode.seed,
  });
}
