// THE CONTROL for the turn kind's desync checks, the fight's shape: a fully
// populated fixture, every hashed field bumped one at a time, the hash must
// move; and the ratchet at the bottom reads the fixture's own keys back
// against the field lists, so a field added to UnitState and not to
// HASHED_UNIT_FIELDS reds here by name.

import { HASHED_FLOAT_FIELDS, HASHED_LOG_FIELDS, HASHED_TURN_STATE_FIELDS, HASHED_UNIT_FIELDS, hashTurnEvents, hashTurnState } from "./hash";
import type { TurnEvent, TurnState } from "./types";

function makeState(): TurnState {
  return {
    tick: 321, rng: 20260913, phase: 1, phaseT: 7, sub: 1, turn: 3, sel: 0, actor: 0, cursor: -1, banner: 1, bannerT: 12,
    log: { kind: 5, a: 0, b: 2, n: 7 },
    units: [
      { c: 2, r: 2, x: 76800, y: 162304, hp: 23, acted: 0, moved: 1, face: 1, clip: 1, clipT: 4, act: 1, actT: 6, fromX: 46080, fromY: 162304, pathIdx: 1, target: -1, strikes: 0, path: [18, 19] },
      { c: 6, r: 1, x: 199680, y: 142336, hp: 14, acted: 0, moved: 0, face: -1, clip: 0, clipT: 9, act: 0, actT: 0, fromX: 0, fromY: 0, pathIdx: 0, target: 0, strikes: 1, path: [] },
    ],
    floats: [{ x: 76800, y: 123904, value: 7, t: 30 }],
    events: [{ kind: "hit", attacker: 0, target: 1, x: 199680, z: 142336, h: 8192, damage: 7, effect: "none" }, { kind: "ko", target: 1 }],
  };
}

type Bag = Record<string, number>;
const read = (o: unknown, k: string): number => (o as Bag)[k];
const write = (o: unknown, k: string, v: number): void => { (o as Bag)[k] = v; };
const bump = (key: string, v: number): number => (key === "face" ? -v : v + 1);
const clone = (s: TurnState): TurnState => structuredClone(s);

describe("hashTurnState", () => {
  const base = hashTurnState(makeState());

  it("is stable and eight lowercase hex characters", () => {
    expect(hashTurnState(makeState())).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{8}$/);
    expect(hashTurnEvents(makeState().events)).toMatch(/^[0-9a-f]{8}$/);
  });

  for (const field of HASHED_TURN_STATE_FIELDS) {
    it(`state.${field}`, () => {
      const s = clone(makeState());
      write(s, field, bump(field, read(s, field)));
      expect(hashTurnState(s)).not.toBe(base);
    });
  }

  for (const field of HASHED_LOG_FIELDS) {
    it(`log.${field}`, () => {
      const s = clone(makeState());
      write(s.log, field, bump(field, read(s.log, field)));
      expect(hashTurnState(s)).not.toBe(base);
    });
  }

  for (const i of [0, 1] as const) {
    for (const field of HASHED_UNIT_FIELDS) {
      it(`units[${i}].${field}`, () => {
        const s = clone(makeState());
        write(s.units[i], field, bump(field, read(s.units[i], field)));
        expect(hashTurnState(s)).not.toBe(base);
      });
    }
  }

  it("a unit's path: one index changed, one dropped, one added, all move the hash", () => {
    const a = clone(makeState()); a.units[0].path[1] = 20;
    const b = clone(makeState()); b.units[0].path.pop();
    const c = clone(makeState()); c.units[1].path.push(9);
    const seen = new Set([base, hashTurnState(a), hashTurnState(b), hashTurnState(c)]);
    expect(seen.size).toBe(4);
  });

  for (const field of HASHED_FLOAT_FIELDS) {
    it(`floats[0].${field}`, () => {
      const s = clone(makeState());
      write(s.floats[0], field, bump(field, read(s.floats[0], field)));
      expect(hashTurnState(s)).not.toBe(base);
    });
  }

  it("the path COUNT is part of the state: a state whose byte stream would match with one path entry shifted into the next unit's scalars hashes differently", () => {
    // deep-test 2026-09-13: dropping the count fold SURVIVED the three cells above, because the entries
    // that follow still differ. This is the collision the count prevents: unit 0's second path entry
    // becomes unit 1's first scalar, every scalar of unit 1 shifts one word, and its last scalar becomes
    // a one-entry path. Without the count the two streams are byte-identical.
    const s = makeState();
    const u1 = s.units[1];
    const scalars = HASHED_UNIT_FIELDS.map((k) => read(u1, k));
    const shifted = clone(s);
    shifted.units[0].path = [s.units[0].path[0]];
    const moved = [s.units[0].path[1], ...scalars.slice(0, -1)];
    HASHED_UNIT_FIELDS.forEach((k, i) => write(shifted.units[1], k, moved[i]));
    shifted.units[1].path = [scalars[scalars.length - 1]];
    expect(hashTurnState(shifted)).not.toBe(base);
  });

  it("the float count and the unit order are part of the state", () => {
    const more = clone(makeState()); more.floats.push({ ...more.floats[0] });
    const none = clone(makeState()); none.floats = [];
    const swapped = clone(makeState()); swapped.units.reverse();
    expect(new Set([base, hashTurnState(more), hashTurnState(none), hashTurnState(swapped)]).size).toBe(4);
  });

  it("the events move hashTurnEvents and never hashTurnState", () => {
    const s = clone(makeState()); s.events = [];
    expect(hashTurnState(s)).toBe(base);
    const ev = (e: TurnEvent[]): string => hashTurnEvents(e);
    const hit = makeState().events[0] as Extract<TurnEvent, { kind: "hit" }>;
    const seen = new Set([
      ev([]), ev([hit]), ev([{ ...hit, attacker: 1 }]), ev([{ ...hit, target: 0 }]), ev([{ ...hit, x: 1 }]), ev([{ ...hit, z: 1 }]), ev([{ ...hit, h: 1 }]), ev([{ ...hit, damage: 8 }]),
      ev([{ kind: "ko", target: 0 }]), ev([{ kind: "ko", target: 1 }]), ev([{ kind: "phase", phase: 2 }]), ev([{ kind: "phase", phase: 3 }]), ev([{ kind: "turn", turn: 2 }]), ev([{ kind: "turn", turn: 3 }]),
      ev([hit, { kind: "ko", target: 1 }]), ev([{ kind: "ko", target: 1 }, hit]),
    ]);
    expect(seen.size).toBe(16);
  });
});

describe("the field lists cover the interfaces - the ratchet", () => {
  const sorted = (xs: readonly string[]): string[] => [...xs].sort();

  it("HASHED_TURN_STATE_FIELDS is every TurnState scalar: not units, floats, events or the log", () => {
    const keys = Object.keys(makeState()).filter((k) => !["units", "floats", "events", "log"].includes(k));
    expect(sorted(keys)).toEqual(sorted(HASHED_TURN_STATE_FIELDS));
  });

  it("HASHED_UNIT_FIELDS is every UnitState key except `path`", () => {
    for (const u of makeState().units) expect(sorted(Object.keys(u).filter((k) => k !== "path"))).toEqual(sorted(HASHED_UNIT_FIELDS));
  });

  it("HASHED_LOG_FIELDS and HASHED_FLOAT_FIELDS are every key of theirs", () => {
    expect(sorted(Object.keys(makeState().log))).toEqual(sorted(HASHED_LOG_FIELDS));
    expect(sorted(Object.keys(makeState().floats[0]))).toEqual(sorted(HASHED_FLOAT_FIELDS));
  });

  it("no list repeats a field", () => {
    for (const list of [HASHED_TURN_STATE_FIELDS, HASHED_UNIT_FIELDS, HASHED_LOG_FIELDS, HASHED_FLOAT_FIELDS]) expect(new Set(list).size).toBe(list.length);
  });
});
