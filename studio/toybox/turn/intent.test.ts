// An enemy's plan, pinned: whom it picks, where it stops, whether it strikes,
// and that two foes never plan the same stop.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { reachable, tileIndex } from "./grid";
import { planIntents } from "./intent";
import type { LoadedTurn, TurnData } from "./types";

const EMBER = gameDir("ember");
const loaded = (): LoadedTurn => JSON.parse(JSON.stringify(loadTurnMode("meadow", EMBER)));
const data = compileTurn(loadTurnMode("meadow", EMBER));
const KNIGHT = 0, WIZARD = 1, SLIME = 2, BAT_A = 3, BAT_B = 4;
const withEdits = (edit: (l: LoadedTurn) => void): TurnData => { const l = loaded(); edit(l); return compileTurn(l); };

describe("planIntents", () => {
  it("on the meadow the bats want the knight (nearer) and the slime, six tiles from both, wants the wizard (less hp); only the near bat can strike this turn", () => {
    const s = createState(data);
    for (const e of [SLIME, BAT_A, BAT_B]) {
      // the bat at (5, 3) reaches (1, 3), one tile under the knight, in its four steps - the demo's first-turn arrow
      expect({ e, target: s.units[e].target, strikes: s.units[e].strikes }).toEqual({ e, target: e === SLIME ? WIZARD : KNIGHT, strikes: e === BAT_B ? 1 : 0 });
      expect(s.units[e].path.length).toBeGreaterThan(0);
    }
    for (const h of [KNIGHT, WIZARD]) expect(s.units[h].target).toBe(-1);
  });

  it("the slime walks its two tiles straight along its row, the bats their four", () => {
    const s = createState(data);
    expect(s.units[SLIME].path).toEqual([tileIndex(data.grid, 5, 1), tileIndex(data.grid, 4, 1)]);
    expect(s.units[BAT_A].path.length).toBe(4);
    expect(s.units[BAT_B].path.length).toBe(4);
  });

  it("nearest hero first; equal distance goes to the one with less hp (the control: swap the hps and the other is picked)", () => {
    // the slime three tiles from each hero: the wizard (18 hp) over the knight (30 hp)
    const d = withEdits((l) => { l.battle.placements[0] = { unit: "knight", c: 3, r: 1 }; l.battle.placements[1] = { unit: "wizard", c: 3, r: 3 }; l.battle.placements[2] = { unit: "slime", c: 5, r: 2 }; });
    expect(createState(d).units[SLIME].target).toBe(WIZARD);
    const d2 = withEdits((l) => { l.battle.placements[0] = { unit: "knight", c: 3, r: 1 }; l.battle.placements[1] = { unit: "wizard", c: 3, r: 3 }; l.battle.placements[2] = { unit: "slime", c: 5, r: 2 }; l.units.find((u) => u.id === "wizard")!.hp = 40; });
    expect(createState(d2).units[SLIME].target).toBe(KNIGHT);
  });

  it("strikes when the stop is within range: a bat two tiles from the knight walks one and strikes", () => {
    const d = withEdits((l) => { l.battle.placements[3] = { unit: "bat", c: 3, r: 2 }; });
    const s = createState(d);
    expect(s.units[BAT_A].target).toBe(KNIGHT);
    expect(s.units[BAT_A].path).toEqual([tileIndex(d.grid, 2, 2)]);
    expect(s.units[BAT_A].strikes).toBe(1);
  });

  it("a foe already in reach stays put and strikes: an empty path", () => {
    const d = withEdits((l) => { l.battle.placements[2] = { unit: "slime", c: 2, r: 2 }; });
    const s = createState(d);
    expect(s.units[SLIME]).toMatchObject({ target: KNIGHT, strikes: 1, path: [] });
  });

  it("two foes never plan the same stop: the second is pushed off the first's tile (the control: unreserved, it would have taken it)", () => {
    // the wizard alone in the corner with one free neighbour; two bats both want that tile
    const d = withEdits((l) => {
      l.battle.blocked = [{ c: 0, r: 1 }];
      l.battle.placements = [{ unit: "wizard", c: 0, r: 0 }, { unit: "knight", c: 7, r: 3 }, { unit: "bat", c: 2, r: 0 }, { unit: "bat", c: 1, r: 2 }];
    });
    const s = createState(d);
    const A = 2, B = 3;
    expect(s.units[A].path).toEqual([tileIndex(d.grid, 1, 0)]);
    expect(s.units[A].strikes).toBe(1);
    // B stops one short and cannot strike
    const stopB = s.units[B].path.length ? s.units[B].path[s.units[B].path.length - 1] : tileIndex(d.grid, s.units[B].c, s.units[B].r);
    expect(stopB).not.toBe(tileIndex(d.grid, 1, 0));
    expect(s.units[B].strikes).toBe(0);
    // the control: with nothing reserved, (1, 0) is B's nearest reachable stop
    const free = reachable(d, s.units, B, null);
    expect(free.some((t) => t.c === 1 && t.r === 0)).toBe(true);
  });

  it("with no hero standing a foe has no plan", () => {
    const s = createState(data);
    s.units[KNIGHT].hp = 0; s.units[WIZARD].hp = 0;
    planIntents(data, s.units);
    for (const e of [SLIME, BAT_A, BAT_B]) expect(s.units[e]).toMatchObject({ target: -1, strikes: 0, path: [] });
  });
});
