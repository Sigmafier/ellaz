// stepTurn must not write to its arguments: the harness keeps `prev` beside
// `next` to interpolate. Deep-freeze both and run the script; any write throws.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { stepTurn } from "./step";
import { ACT_INPUT_PICK, ACT_INPUT_WAIT, NO_TURN_INPUT } from "./types";
import type { TurnInput } from "./types";

/** the demo's first moves: knight two right, wizard two right, end the turn, then let the enemies play */
const pick = (c: number, r: number): TurnInput => ({ c, r, act: ACT_INPUT_PICK });
const SCRIPT: Record<number, TurnInput> = { 5: pick(1, 2), 6: pick(3, 2), 40: pick(0, 1), 41: pick(2, 1), 80: { c: 0, r: 0, act: ACT_INPUT_WAIT } };
const scriptAt = (tick: number): TurnInput[] => [SCRIPT[tick] ?? NO_TURN_INPUT];

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) deepFreeze(v); }
  return o;
}

describe("stepTurn is pure", () => {
  it("never writes to state, inputs or data across 600 ticks of the script", () => {
    const data = compileTurn(loadTurnMode("meadow", gameDir("ember")));
    expect(Object.isFrozen(data)).toBe(true);
    let s = deepFreeze(createState(data));
    for (let t = 0; t < 600; t++) {
      const next = stepTurn(s, deepFreeze(scriptAt(t)), data);
      expect(next).not.toBe(s);
      s = deepFreeze(next);
    }
    expect(s.tick).toBe(600);
  });

  it("the control: a write to a frozen state throws under this test's freeze", () => {
    const s = deepFreeze(createState(compileTurn(loadTurnMode("meadow", gameDir("ember")))));
    expect(() => { (s.units[0] as { x: number }).x = 1; }).toThrow();
    expect(() => { s.units[0].path.push(1); }).toThrow();
  });
});
