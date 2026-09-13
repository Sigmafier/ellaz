// The same script twice gives the same hash; a snapshot resumed mid-script
// lands on a straight run's hash; and the turn machine is input-only - the
// seed rides in the state and decides nothing, so two seeds play one battle.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { hashTurnEvents, hashTurnState } from "./hash";
import { stepTurn } from "./step";
import { ACT_INPUT_PICK, ACT_INPUT_WAIT, NO_TURN_INPUT } from "./types";
import type { TurnData, TurnEvent, TurnInput, TurnState } from "./types";

/** the demo's first moves: knight two right, wizard two right, end the turn, then let the enemies play */
const pick = (c: number, r: number): TurnInput => ({ c, r, act: ACT_INPUT_PICK });
const SCRIPT: Record<number, TurnInput> = { 5: pick(1, 2), 6: pick(3, 2), 40: pick(0, 1), 41: pick(2, 1), 80: { c: 0, r: 0, act: ACT_INPUT_WAIT } };
const scriptAt = (tick: number): TurnInput[] => [SCRIPT[tick] ?? NO_TURN_INPUT];

const compile = (seed?: number): TurnData => {
  const raw = loadTurnMode("meadow", gameDir("ember"));
  return compileTurn(seed === undefined ? raw : { ...raw, mode: { ...raw.mode, seed } });
};

function run(data: TurnData, from: TurnState, ticks: number): { s: TurnState; events: TurnEvent[] } {
  let s = from;
  const events: TurnEvent[] = [];
  for (let t = s.tick; t < ticks; t++) { s = stepTurn(s, scriptAt(t), data); events.push(...s.events); }
  return { s, events };
}

describe("determinism", () => {
  it("the same script twice gives the same state hash and event hash", () => {
    const data = compile();
    const a = run(data, createState(data), 900), b = run(data, createState(data), 900);
    expect(hashTurnState(a.s)).toBe(hashTurnState(b.s));
    expect(hashTurnEvents(a.events)).toBe(hashTurnEvents(b.events));
  });

  it("snapshot at 300, resume to 900 equals a straight run to 900", () => {
    const data = compile();
    const straight = run(data, createState(data), 900).s;
    const half = run(data, createState(data), 300).s;
    const resumed = run(data, JSON.parse(JSON.stringify(half)), 900).s;
    expect(hashTurnState(resumed)).toBe(hashTurnState(straight));
  });

  it("the battle is input-only: two seeds differ only in the rng field they carry", () => {
    const a = run(compile(1), createState(compile(1)), 900).s, b = run(compile(2), createState(compile(2)), 900).s;
    expect(hashTurnState(a)).not.toBe(hashTurnState(b));
    expect({ ...a, rng: 0 }).toEqual({ ...b, rng: 0 });
  });

  it("the battle actually happens: the enemies' turn plays and someone is hit within 900 ticks", () => {
    const data = compile();
    const { s, events } = run(data, createState(data), 900);
    expect(events.some((e) => e.kind === "phase" && e.phase === 2)).toBe(true);
    expect(events.filter((e) => e.kind === "hit").length).toBeGreaterThan(0);
    expect(s.turn).toBeGreaterThanOrEqual(2);
  });
});
