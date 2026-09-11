// Every number in the state is an integer at every sampled tick. A float
// anywhere means a bare `/` or a `* 0.2` crept in, and the hash would then
// depend on rounding nobody controls.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { createState } from "./match";
import { step } from "./step";
import { inputsAtTick, readTape } from "./tape";

const HERE = dirname(fileURLToPath(import.meta.url));
const tape = readTape(JSON.parse(readFileSync(join(HERE, "..", "tournament", "tapes", "versus-600.json"), "utf8")));

/** every numeric leaf that is not an integer, with its path */
export function nonIntegers(o: unknown, path = "$"): string[] {
  if (typeof o === "number") return Number.isInteger(o) ? [] : [`${path}=${o}`];
  if (Array.isArray(o)) return o.flatMap((v, i) => nonIntegers(v, `${path}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => nonIntegers(v, `${path}.${k}`));
  return [];
}

describe("no float in the state", () => {
  it("compiled data is all integers", () => {
    expect(nonIntegers(compileFight(loadMode(tape.mode)))).toEqual([]);
  });

  it("the state is all integers at every 50th tick and at the end", () => {
    const data = compileFight(loadMode(tape.mode));
    let s = createState(data);
    for (let t = 0; t < 600; t++) {
      s = step(s, inputsAtTick(tape, t, 2), data);
      if (t % 50 === 0 || t === 599) expect(nonIntegers(s)).toEqual([]);
    }
  });

  it("the control: the walker sees a planted float", () => {
    const data = compileFight(loadMode(tape.mode));
    const s = JSON.parse(JSON.stringify(createState(data)));
    s.fighters[1].vx = 0.5;
    expect(nonIntegers(s)).toEqual(["$.fighters[1].vx=0.5"]);
  });
});
