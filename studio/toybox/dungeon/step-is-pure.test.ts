// stepDungeon must not write to its arguments: the harness keeps `prev`
// beside `next` to interpolate. Deep-freeze both and run the script; any
// write throws.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { ACT_INPUT_CLICK, ACT_INPUT_SWING, NO_DUNGEON_INPUT } from "./types";
import type { DungeonInput } from "./types";

/** a click on the nearest slime, three swings, a held walk down-right, a click on a far tile */
const SCRIPT: Record<number, DungeonInput> = {
  5: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 1664, y: 2688 },
  200: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  240: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  280: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  400: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 2432, y: 1920 },
};
const scriptAt = (tick: number): DungeonInput[] => [SCRIPT[tick] ?? (tick >= 300 && tick < 360 ? { ...NO_DUNGEON_INPUT, dx: 1, dy: 1 } : NO_DUNGEON_INPUT)];

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) deepFreeze(v); }
  return o;
}

describe("stepDungeon is pure", () => {
  it("never writes to state, inputs or data across 600 ticks of the script", () => {
    const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
    expect(Object.isFrozen(data)).toBe(true);
    let s = deepFreeze(createState(data));
    for (let t = 0; t < 600; t++) {
      const next = stepDungeon(s, deepFreeze(scriptAt(t)), data);
      expect(next).not.toBe(s);
      s = deepFreeze(next);
    }
    expect(s.tick).toBe(600);
  });

  it("the control: a write to a frozen state throws under this test's freeze", () => {
    const s = deepFreeze(createState(compileDungeon(loadDungeonMode("crypt", gameDir("hollow")))));
    expect(() => { (s.actors[0] as { x: number }).x = 1; }).toThrow();
    expect(() => { s.actors[0].path.push(1); }).toThrow();
  });
});
