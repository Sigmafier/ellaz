// step() must not write to its arguments: the harness keeps `prev` beside
// `next` to interpolate, and a stray write would corrupt the frame it is
// about to draw. Deep-freeze both and run the whole tape; any write throws.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { createState } from "./match";
import { step } from "./step";
import { inputsAtTick, readTape } from "./tape";

const tape = readTape(JSON.parse(readFileSync(join(gameDir("fight"), "tapes", "versus-600.json"), "utf8")));

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) deepFreeze(v); }
  return o;
}

describe("step is pure", () => {
  it("never writes to state or data across 600 ticks", () => {
    const data = compileFight(loadMode(tape.mode, gameDir("fight")));
    expect(Object.isFrozen(data)).toBe(true);
    let s = deepFreeze(createState(data));
    for (let t = 0; t < 600; t++) {
      const next = step(s, deepFreeze(inputsAtTick(tape, t, 2)), data);
      expect(next).not.toBe(s);
      s = deepFreeze(next);
    }
    expect(s.tick).toBe(600);
  });

  it("the control: a write to a frozen state throws under this test's freeze", () => {
    const s = deepFreeze(createState(compileFight(loadMode(tape.mode, gameDir("fight")))));
    expect(() => { (s.fighters[0] as { x: number }).x = 1; }).toThrow();
  });
});
