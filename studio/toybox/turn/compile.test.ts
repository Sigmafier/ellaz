// The compiler refuses what the schema cannot see, naming the battle and the
// row; and what it accepts is FP geometry and whole-tick clips.

import { gameDir, loadTurnMode } from "../data/load";
import { compileTurn } from "./compile";
import { CLIPS } from "./types";
import type { LoadedTurn } from "./types";

const EMBER = gameDir("ember");
const loaded = (): LoadedTurn => JSON.parse(JSON.stringify(loadTurnMode("meadow", EMBER)));

describe("compileTurn", () => {
  it("turns the grid into FP and the clips into whole ticks per frame", () => {
    const d = compileTurn(loaded());
    expect(d.grid.tileW).toBe(120 * 256);
    expect(d.grid.x).toBe(120 * 256);
    expect(d.grid.blocked.filter(Boolean).length).toBe(1);
    expect(d.units.map((u) => u.id)).toEqual(["knight", "wizard", "slime", "bat", "bat"]);
    expect(d.units[3]).toMatchObject({ flying: true, hover: 40, team: 1 });
    expect(d.units[0]).toMatchObject({ flying: false, hover: 0, team: 0 });
    const knight = d.units[0];
    expect(knight.clips.length).toBe(CLIPS.length);
    // idle 6 fps -> 10 ticks a frame, walk 10 -> 6, attack 12 -> 5, hurt 10 -> 6, ko 8 -> 7 (60 / 8 floored)
    expect(knight.clips.map((c) => c.ticksPerFrame)).toEqual([10, 6, 5, 6, 7]);
    expect(knight.clips.map((c) => c.loop)).toEqual([true, true, false, false, false]);
    expect(Object.isFrozen(d)).toBe(true);
    expect(Object.isFrozen(d.units[0].clips)).toBe(true);
  });

  it("refuses a placement off the grid, naming the battle and the row", () => {
    const l = loaded(); l.battle.placements[4] = { unit: "bat", c: 8, r: 3 };
    expect(() => compileTurn(l)).toThrow(/battle "meadow" placement 4 \(bat\) at \(8, 3\) is off the 8x4 grid/);
  });

  it("refuses a placement on the campfire and one sharing a tile", () => {
    const fire = loaded(); fire.battle.placements[2] = { unit: "slime", c: 5, r: 0 };
    expect(() => compileTurn(fire)).toThrow(/placement 2 \(slime\) stands on blocked tile \(5, 0\)/);
    const twin = loaded(); twin.battle.placements[1] = { unit: "wizard", c: 1, r: 2 };
    expect(() => compileTurn(twin)).toThrow(/placement 1 \(wizard\) shares tile \(1, 2\)/);
  });

  it("refuses a unit whose set lacks a clip the rules need", () => {
    const l = loaded();
    delete (l.sets["slime--snes16"].manifest.animations as Record<string, unknown>).hurt;
    expect(() => compileTurn(l)).toThrow(/set "slime--snes16" \(unit "slime"\) has no "hurt" clip/);
  });

  it("refuses a hover without flying, a blocked tile off the grid, and a battle with no hero", () => {
    const hover = loaded(); hover.units.find((u) => u.id === "slime")!.hover = 20;
    expect(() => compileTurn(hover)).toThrow(/"slime" has a hover height but does not fly/);
    const off = loaded(); off.battle.blocked = [{ c: 9, r: 9 }];
    expect(() => compileTurn(off)).toThrow(/blocks \(9, 9\), off its 8x4 grid/);
    const noHero = loaded(); noHero.battle.placements = noHero.battle.placements.slice(2);
    expect(() => compileTurn(noHero)).toThrow(/places no unit on team 0/);
  });
});
