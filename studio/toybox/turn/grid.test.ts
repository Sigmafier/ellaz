// The grid rules, against the meadow's real data: what a unit can reach, whom
// it can hit, and the edges (the board, the campfire, a foe in the way).

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { inGrid, reachable, targetsFrom, tileIndex, tileX, tileY, unitAt } from "./grid";
import type { LoadedTurn, TurnData } from "./types";

const EMBER = gameDir("ember");
const loaded = (): LoadedTurn => JSON.parse(JSON.stringify(loadTurnMode("meadow", EMBER)));
const data = compileTurn(loadTurnMode("meadow", EMBER));
const KNIGHT = 0, WIZARD = 1, SLIME = 2, BAT_A = 3, BAT_B = 4;

/** the meadow with its placements or units edited before compiling */
function withEdits(edit: (l: LoadedTurn) => void): TurnData {
  const l = loaded();
  edit(l);
  return compileTurn(l);
}

describe("the grid", () => {
  it("is 8x4 with the campfire blocked, and a tile's feet sit at its bottom-centre in FP", () => {
    expect(data.grid.cols).toBe(8);
    expect(data.grid.rows).toBe(4);
    expect(inGrid(data.grid, 5, 0)).toBe(false);
    expect(inGrid(data.grid, 4, 0)).toBe(true);
    expect(inGrid(data.grid, 8, 0)).toBe(false);
    expect(inGrid(data.grid, 0, 4)).toBe(false);
    expect(inGrid(data.grid, -1, 2)).toBe(false);
    // the demo's tileX(c) = 120 + c * 120 + 60, tileY(r) = 478 + r * 78, in view px
    expect(tileX(data.grid, 0) / 256).toBe(180);
    expect(tileX(data.grid, 7) / 256).toBe(1020);
    expect(tileY(data.grid, 0) / 256).toBe(478);
    expect(tileY(data.grid, 3) / 256).toBe(712);
    expect(tileIndex(data.grid, 5, 0)).toBe(5);
    expect(tileIndex(data.grid, 1, 2)).toBe(17);
  });

  it("unitAt finds the alive unit on a tile and skips a fallen one", () => {
    const s = createState(data);
    expect(unitAt(s.units, 1, 2)).toBe(KNIGHT);
    expect(unitAt(s.units, 6, 1)).toBe(SLIME);
    expect(unitAt(s.units, 3, 3)).toBe(-1);
    s.units[SLIME].hp = 0;
    expect(unitAt(s.units, 6, 1)).toBe(-1);
  });
});

describe("reachable", () => {
  it("the knight walks up to three tiles, the origin first with an empty path, every path shortest and in tile indices", () => {
    const s = createState(data);
    const tiles = reachable(data, s.units, KNIGHT, null);
    expect(tiles[0]).toEqual({ c: 1, r: 2, path: [] });
    for (const t of tiles) expect(t.path.length).toBeLessThanOrEqual(3);
    const far = tiles.find((t) => t.c === 4 && t.r === 2)!;
    expect(far.path).toEqual([tileIndex(data.grid, 2, 2), tileIndex(data.grid, 3, 2), tileIndex(data.grid, 4, 2)]);
    expect(tiles.some((t) => t.c === 5 && t.r === 2)).toBe(false);
  });

  it("refuses the board's edge and the campfire", () => {
    const d = withEdits((l) => { l.battle.placements[0] = { unit: "knight", c: 4, r: 1 }; });
    const tiles = reachable(d, createState(d).units, KNIGHT, null);
    expect(tiles.some((t) => t.c === 5 && t.r === 0)).toBe(false);
    expect(tiles.some((t) => t.c === 4 && t.r === -1)).toBe(false);
    expect(tiles.some((t) => t.c === 4 && t.r === 0)).toBe(true);
  });

  it("passes through an ally and never stops on it; a foe stops the walk", () => {
    // the wizard beside the knight: the knight reaches past her but not onto her
    const d = withEdits((l) => { l.battle.placements[1] = { unit: "wizard", c: 2, r: 2 }; });
    const s = createState(d);
    const tiles = reachable(d, s.units, KNIGHT, null);
    expect(tiles.some((t) => t.c === 2 && t.r === 2)).toBe(false);
    expect(tiles.find((t) => t.c === 3 && t.r === 2)?.path).toEqual([tileIndex(d.grid, 2, 2), tileIndex(d.grid, 3, 2)]);
    // the slime there instead: the knight goes around, so (3, 1) costs three steps and (3, 2) is out of reach
    const d2 = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 2, r: 2 }; });
    const t2 = reachable(d2, createState(d2).units, KNIGHT, null);
    expect(t2.some((t) => t.c === 2 && t.r === 2)).toBe(false);
    expect(t2.find((t) => t.c === 3 && t.r === 1)?.path.length).toBe(3);
    expect(t2.some((t) => t.c === 3 && t.r === 2)).toBe(false);
  });

  it("honours reserved tiles: a reserved stop is walked through, never stopped on, and comes back when unreserved (the control)", () => {
    const s = createState(data);
    const reserved: boolean[] = new Array(data.grid.cols * data.grid.rows).fill(false);
    reserved[tileIndex(data.grid, 2, 2)] = true;
    const withR = reachable(data, s.units, KNIGHT, reserved);
    expect(withR.some((t) => t.c === 2 && t.r === 2)).toBe(false);
    expect(withR.find((t) => t.c === 3 && t.r === 2)?.path[0]).toBe(tileIndex(data.grid, 2, 2));
    expect(reachable(data, s.units, KNIGHT, null).some((t) => t.c === 2 && t.r === 2)).toBe(true);
  });

  it("a unit with no move reaches only its own tile", () => {
    const d = withEdits((l) => { l.units.find((u) => u.id === "knight")!.move = 0; });
    expect(reachable(d, createState(d).units, KNIGHT, null)).toEqual([{ c: 1, r: 2, path: [] }]);
  });
});

describe("targetsFrom", () => {
  it("is manhattan range: the knight reaches an adjacent foe and not a diagonal one", () => {
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 2, r: 2 }; l.battle.placements[3] = { unit: "bat", c: 2, r: 3 }; });
    const s = createState(d);
    expect(targetsFrom(d, s.units, KNIGHT, 1, 2)).toEqual([SLIME]);
    expect(targetsFrom(d, s.units, KNIGHT, 2, 1)).toEqual([SLIME]);
  });

  it("the wizard's range 3 reaches over a slime, and never counts an ally or a fallen foe", () => {
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 1, r: 1 }; l.battle.placements[3] = { unit: "bat", c: 3, r: 1 }; });
    const s = createState(d);
    expect(targetsFrom(d, s.units, WIZARD, 0, 1)).toEqual([SLIME, BAT_A]);
    s.units[SLIME].hp = 0;
    expect(targetsFrom(d, s.units, WIZARD, 0, 1)).toEqual([BAT_A]);
    expect(targetsFrom(d, s.units, BAT_B, 5, 3)).toEqual([]);
  });

  it("on the real meadow nobody starts in reach of anyone", () => {
    const s = createState(data);
    for (let i = 0; i < s.units.length; i++) expect(targetsFrom(data, s.units, i, s.units[i].c, s.units[i].r)).toEqual([]);
  });
});
