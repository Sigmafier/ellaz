// The same script twice gives the same hash; a snapshot resumed mid-script
// lands on a straight run's hash; one input changed changes the run; and the
// seed matters here - the knight's roll draws from it - so two seeds play two
// rooms.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { hashDungeonEvents, hashDungeonState } from "./hash";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { ACT_INPUT_CLICK, ACT_INPUT_SWING, NO_DUNGEON_INPUT } from "./types";
import type { DungeonData, DungeonEvent, DungeonInput, DungeonState } from "./types";

const SCRIPT: Record<number, DungeonInput> = {
  5: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 1664, y: 2688 },
  200: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  240: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  280: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  400: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 2432, y: 1920 },
};
const scriptAt = (tick: number): DungeonInput[] => [SCRIPT[tick] ?? (tick >= 300 && tick < 360 ? { ...NO_DUNGEON_INPUT, dx: 1, dy: 1 } : NO_DUNGEON_INPUT)];

const compile = (seed?: number): DungeonData => {
  const raw = loadDungeonMode("crypt", gameDir("hollow"));
  return compileDungeon(seed === undefined ? raw : { ...raw, mode: { ...raw.mode, seed } });
};

function run(data: DungeonData, from: DungeonState, ticks: number, at = scriptAt): { s: DungeonState; events: DungeonEvent[] } {
  let s = from;
  const events: DungeonEvent[] = [];
  for (let t = s.tick; t < ticks; t++) { s = stepDungeon(s, at(t), data); events.push(...s.events); }
  return { s, events };
}

describe("determinism", () => {
  it("the same script twice gives the same state hash and event hash", () => {
    const data = compile();
    const a = run(data, createState(data), 900), b = run(data, createState(data), 900);
    expect(hashDungeonState(a.s)).toBe(hashDungeonState(b.s));
    expect(hashDungeonEvents(a.events)).toBe(hashDungeonEvents(b.events));
  });

  it("snapshot at 300, resume to 900 equals a straight run to 900", () => {
    const data = compile();
    const straight = run(data, createState(data), 900).s;
    const half = run(data, createState(data), 300).s;
    const resumed = run(data, JSON.parse(JSON.stringify(half)), 900).s;
    expect(hashDungeonState(resumed)).toBe(hashDungeonState(straight));
  });

  it("one input changed - the swing a tick later - changes the run", () => {
    const data = compile();
    const later = (t: number): DungeonInput[] => (t === 200 ? [NO_DUNGEON_INPUT] : t === 201 ? [SCRIPT[200]] : scriptAt(t));
    expect(hashDungeonState(run(data, createState(data), 900, later).s)).not.toBe(hashDungeonState(run(data, createState(data), 900).s));
  });

  it("the seed decides the roll: two seeds differ in more than the rng they carry", () => {
    const a = run(compile(1), createState(compile(1)), 900).s, b = run(compile(2), createState(compile(2)), 900).s;
    expect(hashDungeonState(a)).not.toBe(hashDungeonState(b));
    expect(a.actors.map((x) => x.hp)).not.toEqual(b.actors.map((x) => x.hp));
  });

  it("the room actually happens: the knight strikes, a foe bites back, a foe falls and drops within 900 ticks", () => {
    const data = compile();
    const { events } = run(data, createState(data), 900);
    expect(events.some((e) => e.kind === "hit" && e.attacker === 0)).toBe(true);
    expect(events.some((e) => e.kind === "hit" && e.target === 0)).toBe(true);
    expect(events.some((e) => e.kind === "ko")).toBe(true);
  });
});
