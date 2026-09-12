// The whole point of a shared sim: the same seed and tape give the same hash,
// and a snapshot resumed mid-tape lands on the same hash as a straight run -
// which proves no state lives anywhere but in FightState.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { hashEvents, hashState } from "./hash";
import { createState } from "./match";
import { step } from "./step";
import { inputsAtTick, readTape } from "./tape";
import type { FightData, FightState } from "./types";

const tape = readTape(JSON.parse(readFileSync(join(gameDir("fight"), "tapes", "versus-600.json"), "utf8")));
const compile = (seed = tape.seed): FightData => { const raw = loadMode(tape.mode, gameDir("fight")); return compileFight({ ...raw, mode: { ...raw.mode, seed } }); };

function run(data: FightData, from: FightState, ticks: number): FightState {
  let s = from;
  for (let t = s.tick; t < ticks; t++) s = step(s, inputsAtTick(tape, t, s.fighters.length), data);
  return s;
}

describe("determinism", () => {
  it("the same seed and tape twice give the same state hash and event hash", () => {
    const data = compile();
    const a = run(data, createState(data), 600), b = run(data, createState(data), 600);
    expect(hashState(a)).toBe(hashState(b));
    expect(hashEvents(a.events)).toBe(hashEvents(b.events));
  });

  it("snapshot at 300, resume to 600 equals a straight run to 600", () => {
    const data = compile();
    const straight = run(data, createState(data), 600);
    const half = run(data, createState(data), 300);
    const resumed = run(data, JSON.parse(JSON.stringify(half)), 600);
    expect(hashState(resumed)).toBe(hashState(straight));
  });

  it("a different seed gives a different hash (the fight is not input-only)", () => {
    const a = run(compile(1), createState(compile(1)), 600);
    const b = run(compile(2), createState(compile(2)), 600);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it("the fight actually happens: someone lands a hit within 600 ticks", () => {
    const data = compile();
    let s = createState(data), hits = 0;
    for (let t = 0; t < 600; t++) { s = step(s, inputsAtTick(tape, t, 2), data); hits += s.events.filter((e) => e.kind === "hit").length; }
    expect(hits).toBeGreaterThan(0);
    expect(Math.min(...s.fighters.map((f) => f.hp))).toBeLessThan(data.match.hp);
  });
});
