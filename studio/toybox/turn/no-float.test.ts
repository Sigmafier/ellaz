// Every number in the turn state is an integer at every sampled tick.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { stepTurn } from "./step";
import { ACT_INPUT_PICK, ACT_INPUT_WAIT, NO_TURN_INPUT } from "./types";
import type { TurnInput } from "./types";

const data = compileTurn(loadTurnMode("meadow", gameDir("ember")));

/** the demo's first moves: knight two right, wizard two right, end the turn, then let the enemies play */
const pick = (c: number, r: number): TurnInput => ({ c, r, act: ACT_INPUT_PICK });
const SCRIPT: Record<number, TurnInput> = { 5: pick(1, 2), 6: pick(3, 2), 40: pick(0, 1), 41: pick(2, 1), 80: { c: 0, r: 0, act: ACT_INPUT_WAIT } };
const scriptAt = (tick: number): TurnInput[] => [SCRIPT[tick] ?? NO_TURN_INPUT];

/** every numeric leaf that is not an integer, with its path (the fight's walker, kept local so this file registers no foreign suite) */
function nonIntegers(o: unknown, path = "$"): string[] {
  if (typeof o === "number") return Number.isInteger(o) ? [] : [`${path}=${o}`];
  if (Array.isArray(o)) return o.flatMap((v, i) => nonIntegers(v, `${path}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => nonIntegers(v, `${path}.${k}`));
  return [];
}

describe("no float in the turn state", () => {
  it("compiled data is all integers", () => {
    expect(nonIntegers(data)).toEqual([]);
  });

  it("the state is all integers at every 50th tick and at the end, through walks, strikes and floats", () => {
    let s = createState(data), floats = 0;
    for (let t = 0; t < 900; t++) {
      s = stepTurn(s, scriptAt(t), data);
      floats += s.floats.length;
      if (t % 50 === 0 || t === 899) expect(nonIntegers(s)).toEqual([]);
    }
    expect(floats).toBeGreaterThan(0);
  });

  it("the control: the walker sees a planted float", () => {
    const s = JSON.parse(JSON.stringify(createState(data)));
    s.units[1].x = 0.5;
    expect(nonIntegers(s)).toEqual(["$.units[1].x=0.5"]);
  });
});
