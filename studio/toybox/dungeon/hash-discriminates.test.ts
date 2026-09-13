// THE CONTROL for the dungeon kind's desync checks, the turn's shape: a fully
// populated fixture, every hashed field bumped one at a time, the hash must
// move; and the ratchet at the bottom reads the fixture's own keys back against
// the field lists, so a field added to ActorState and not to
// HASHED_ACTOR_FIELDS reds here by name. Written before hash.ts existed and
// watched failing on the missing module (2026-09-13).

import { HASHED_ACTOR_FIELDS, HASHED_DROP_FIELDS, HASHED_DUNGEON_STATE_FIELDS, HASHED_FLOAT_FIELDS, HASHED_MARKER_FIELDS, hashDungeonEvents, hashDungeonState } from "./hash";
import type { DungeonEvent, DungeonState } from "./types";

function makeState(): DungeonState {
  return {
    tick: 321, rng: 20260913, phase: 1, bannerT: 12, banner: 1, coins: 6,
    actors: [
      { x: 1408, y: 1920, vx: 3, vy: -2, hp: 77, mp: 40, face: 2, state: 1, stateT: 4, cd: 0, pause: 0, since: 90, swoopT: 0, alt: 0, aimX: 0, aimY: 0, target: 1, repath: 6, struck: 0, dropped: 0, flash: 2, goalX: -1, goalY: -1, path: [43, 44] },
      { x: 640, y: 768, vx: 0, vy: 0, hp: 12, mp: 0, face: 3, state: 2, stateT: 9, cd: 30, pause: 5, since: 40, swoopT: 0, alt: 0, aimX: 0, aimY: 0, target: -1, repath: 0, struck: 1, dropped: 0, flash: 0, goalX: -1, goalY: -1, path: [] },
      { x: 1408, y: 640, vx: 0, vy: 0, hp: 20, mp: 0, face: 2, state: 6, stateT: 3, cd: 0, pause: 0, since: 999, swoopT: 0, alt: 5120, aimX: 1500, aimY: 1900, target: -1, repath: 0, struck: 0, dropped: 0, flash: 0, goalX: -1, goalY: -1, path: [] },
    ],
    drops: [{ x: 700, y: 800, value: 3, t: 12 }],
    floats: [{ x: 640, y: 768, z: 62, value: 11, t: 30 }],
    markers: [{ i: 8, j: 8, t: 20 }],
    events: [{ kind: "hit", attacker: 0, target: 1, x: 640, z: 768, h: 31, damage: 11, effect: "none" }, { kind: "ko", target: 1 }],
  };
}

type Bag = Record<string, number>;
const read = (o: unknown, k: string): number => (o as Bag)[k];
const write = (o: unknown, k: string, v: number): void => { (o as Bag)[k] = v; };
const clone = (s: DungeonState): DungeonState => structuredClone(s);

describe("hashDungeonState", () => {
  const base = hashDungeonState(makeState());

  it("is stable and eight lowercase hex characters", () => {
    expect(hashDungeonState(makeState())).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{8}$/);
    expect(hashDungeonEvents(makeState().events)).toMatch(/^[0-9a-f]{8}$/);
  });

  for (const field of HASHED_DUNGEON_STATE_FIELDS) {
    it(`state.${field}`, () => {
      const s = clone(makeState());
      write(s, field, read(s, field) + 1);
      expect(hashDungeonState(s)).not.toBe(base);
    });
  }

  for (const i of [0, 1, 2] as const) {
    for (const field of HASHED_ACTOR_FIELDS) {
      it(`actors[${i}].${field}`, () => {
        const s = clone(makeState());
        write(s.actors[i], field, read(s.actors[i], field) + 1);
        expect(hashDungeonState(s)).not.toBe(base);
      });
    }
  }

  for (const [list, key] of [[HASHED_DROP_FIELDS, "drops"], [HASHED_FLOAT_FIELDS, "floats"], [HASHED_MARKER_FIELDS, "markers"]] as const) {
    for (const field of list) {
      it(`${key}[0].${field}`, () => {
        const s = clone(makeState());
        const row = (s as unknown as Record<string, unknown[]>)[key][0];
        write(row, field, read(row, field) + 1);
        expect(hashDungeonState(s)).not.toBe(base);
      });
    }
  }

  it("an actor's path: one index changed, one dropped, one added, all move the hash", () => {
    const a = clone(makeState()); a.actors[0].path[1] = 45;
    const b = clone(makeState()); b.actors[0].path.pop();
    const c = clone(makeState()); c.actors[1].path.push(9);
    expect(new Set([base, hashDungeonState(a), hashDungeonState(b), hashDungeonState(c)]).size).toBe(4);
  });

  it("the path COUNT is part of the state: a path entry shifted into the next actor's scalars hashes differently", () => {
    const s = makeState();
    const scalars = HASHED_ACTOR_FIELDS.map((k) => read(s.actors[1], k));
    const shifted = clone(s);
    shifted.actors[0].path = [s.actors[0].path[0]];
    const moved = [s.actors[0].path[1], ...scalars.slice(0, -1)];
    HASHED_ACTOR_FIELDS.forEach((k, i) => write(shifted.actors[1], k, moved[i]));
    shifted.actors[1].path = [scalars[scalars.length - 1]];
    expect(hashDungeonState(shifted)).not.toBe(base);
  });

  it("the drop, float and marker counts and the actor order are part of the state", () => {
    const more = clone(makeState()); more.drops.push({ ...more.drops[0] });
    const none = clone(makeState()); none.floats = [];
    const mark = clone(makeState()); mark.markers = [];
    const swapped = clone(makeState()); swapped.actors.reverse();
    expect(new Set([base, hashDungeonState(more), hashDungeonState(none), hashDungeonState(mark), hashDungeonState(swapped)]).size).toBe(5);
  });

  it("the events move hashDungeonEvents and never hashDungeonState", () => {
    const s = clone(makeState()); s.events = [];
    expect(hashDungeonState(s)).toBe(base);
    const ev = (e: DungeonEvent[]): string => hashDungeonEvents(e);
    const hit = makeState().events[0] as Extract<DungeonEvent, { kind: "hit" }>;
    const seen = new Set([
      ev([]), ev([hit]), ev([{ ...hit, attacker: 1 }]), ev([{ ...hit, target: 0 }]), ev([{ ...hit, x: 1 }]), ev([{ ...hit, z: 1 }]), ev([{ ...hit, h: 1 }]), ev([{ ...hit, damage: 8 }]),
      ev([{ kind: "ko", target: 0 }]), ev([{ kind: "ko", target: 1 }]), ev([{ kind: "phase", phase: 2 }]), ev([{ kind: "phase", phase: 3 }]),
      ev([{ kind: "coin", x: 1, z: 2, coins: 3 }]), ev([{ kind: "coin", x: 1, z: 2, coins: 4 }]),
      ev([hit, { kind: "ko", target: 1 }]), ev([{ kind: "ko", target: 1 }, hit]),
    ]);
    expect(seen.size).toBe(16);
  });
});

describe("the field lists cover the interfaces - the ratchet", () => {
  const sorted = (xs: readonly string[]): string[] => [...xs].sort();

  it("HASHED_DUNGEON_STATE_FIELDS is every DungeonState scalar: not actors, drops, floats, markers or events", () => {
    const keys = Object.keys(makeState()).filter((k) => !["actors", "drops", "floats", "markers", "events"].includes(k));
    expect(sorted(keys)).toEqual(sorted(HASHED_DUNGEON_STATE_FIELDS));
  });

  it("HASHED_ACTOR_FIELDS is every ActorState key except `path`", () => {
    for (const a of makeState().actors) expect(sorted(Object.keys(a).filter((k) => k !== "path"))).toEqual(sorted(HASHED_ACTOR_FIELDS));
  });

  it("the drop, float and marker lists are every key of theirs", () => {
    expect(sorted(Object.keys(makeState().drops[0]))).toEqual(sorted(HASHED_DROP_FIELDS));
    expect(sorted(Object.keys(makeState().floats[0]))).toEqual(sorted(HASHED_FLOAT_FIELDS));
    expect(sorted(Object.keys(makeState().markers[0]))).toEqual(sorted(HASHED_MARKER_FIELDS));
  });

  it("no list repeats a field", () => {
    for (const list of [HASHED_DUNGEON_STATE_FIELDS, HASHED_ACTOR_FIELDS, HASHED_DROP_FIELDS, HASHED_FLOAT_FIELDS, HASHED_MARKER_FIELDS]) expect(new Set(list).size).toBe(list.length);
  });
});
