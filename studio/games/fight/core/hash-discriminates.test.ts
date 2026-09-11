// THE CONTROL for every desync check this sim will ever have.
//
// A checksum's whole value is that it disagrees when the states disagree. A
// hash that quietly skips a field is not a weaker hash - it is an ABSENT one
// over that field, and it reads as present in every green run, because the
// only thing a passing desync check proves is that the hash returned the same
// string. So this file changes each hashed field by one unit, one at a time,
// and requires the hash to move. If a field is ever added to FighterState and
// not added to HASHED_FIGHTER_FIELDS, the coverage block at the bottom goes
// red naming it - that is the part that survives the next person.

import {
  HASHED_AI_FIELDS,
  HASHED_FIGHTER_FIELDS,
  HASHED_STATE_FIELDS,
  fnv1a,
  hashEvents,
  hashState,
} from "./hash";
import type { AiState, FightEvent, FightState } from "./types";

/** A fully-populated state: two fighters, one with ai, one without. */
function makeState(): FightState {
  const ai: AiState = {
    cooldown: 13,
    mode: 0, // +1 -> 1, still a valid 0 | 1 | 2
    modeT: 6,
    wantMx: -1, // +1 -> 0
    wantMz: 0, // +1 -> 1
    wantAttack: false, // flips
  };
  return {
    tick: 1234,
    rng: 0xdeadbeef,
    phase: 1, // +1 -> 2, still a valid Phase
    phaseT: 20,
    freeze: 3,
    shake: 7,
    winner: -1, // +1 -> 0
    fighters: [
      {
        x: 1000, z: 200, h: 30,
        vx: -7, vz: 3, vh: -11,
        face: 1, // flips sign
        st: 4, stT: 9, frame: 2,
        hp: 87, stun: 5, inv: 12,
        down: 0, fall: 3,
        hits: 2, hitsT: 17, hitMask: 1,
        ai,
      },
      {
        x: -400, z: -90, h: 0,
        vx: 6, vz: -2, vh: 0,
        face: -1, // flips sign
        st: 1, stT: 33, frame: 5,
        hp: 42, stun: 0, inv: 0,
        down: 8, fall: 14,
        hits: 1, hitsT: 4, hitMask: 2,
        ai: null,
      },
    ],
    events: [
      { kind: "hit", attacker: 0, target: 1, x: 1000, z: 200, h: 30, damage: 9, effect: "spark" },
      { kind: "land", who: 1 },
    ],
  };
}

type Bag = Record<string, number | boolean>;
const read = (o: unknown, k: string): number | boolean => (o as Bag)[k];
const write = (o: unknown, k: string, v: number | boolean): void => {
  (o as Bag)[k] = v;
};

/** one unit of change that is still a legal value for that field */
function bump(key: string, v: number | boolean): number | boolean {
  if (typeof v === "boolean") return !v;
  if (key === "face") return -v; // 1 <-> -1; +1 would leave the type
  return v + 1;
}

const clone = (s: FightState): FightState => structuredClone(s);

describe("fnv1a", () => {
  it("matches the published 32-bit test vectors", () => {
    const bytesOf = (s: string) => [...s].map((c) => c.charCodeAt(0));
    expect(fnv1a([])).toBe(0x811c9dc5);
    expect(fnv1a(bytesOf("a"))).toBe(0xe40c292c);
    expect(fnv1a(bytesOf("foobar"))).toBe(0xbf9cf968);
  });

  it("stays inside uint32 across a long fold", () => {
    const many = Array.from({ length: 10000 }, (_, i) => i % 256);
    const h = fnv1a(many);
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(4294967296);
  });
});

describe("hashState shape", () => {
  it("is stable across two calls on the same state", () => {
    const s = makeState();
    expect(hashState(s)).toBe(hashState(s));
    expect(hashState(s)).toBe(hashState(makeState()));
  });

  it("is exactly 8 lowercase hex characters", () => {
    expect(hashState(makeState())).toMatch(/^[0-9a-f]{8}$/);
    expect(hashEvents(makeState().events)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("zero-pads rather than shortening", () => {
    // Every hash this file produces is 8 chars; the padStart is what makes
    // that true for the ~1-in-16 hashes whose top nibble is 0.
    for (let tick = 0; tick < 200; tick++) {
      const s = makeState();
      s.tick = tick;
      expect(hashState(s)).toHaveLength(8);
    }
  });
});

describe("hashState discriminates EVERY hashed field", () => {
  const base = hashState(makeState());

  for (const field of HASHED_STATE_FIELDS) {
    it(`state.${field}`, () => {
      const s = clone(makeState());
      write(s, field, bump(field, read(s, field)));
      expect(hashState(s)).not.toBe(base);
    });
  }

  for (const i of [0, 1] as const) {
    for (const field of HASHED_FIGHTER_FIELDS) {
      it(`fighters[${i}].${field}`, () => {
        const s = clone(makeState());
        const f = s.fighters[i];
        write(f, field, bump(field, read(f, field)));
        expect(hashState(s)).not.toBe(base);
      });
    }
  }

  for (const field of HASHED_AI_FIELDS) {
    it(`fighters[0].ai.${field}`, () => {
      const s = clone(makeState());
      const ai = s.fighters[0].ai;
      expect(ai).not.toBeNull();
      write(ai, field, bump(field, read(ai, field)));
      expect(hashState(s)).not.toBe(base);
    });
  }

  it("dropping the ai entirely changes the hash", () => {
    const s = clone(makeState());
    s.fighters[0].ai = null;
    expect(hashState(s)).not.toBe(base);
  });

  it("giving the ai-less fighter an ai changes the hash", () => {
    const s = clone(makeState());
    s.fighters[1].ai = { cooldown: 0, mode: 0, modeT: 0, wantMx: 0, wantMz: 0, wantAttack: false };
    expect(hashState(s)).not.toBe(base);
  });

  it("the fighters' ORDER is part of the state", () => {
    const s = clone(makeState());
    s.fighters.reverse();
    expect(hashState(s)).not.toBe(base);
  });

  it("dropping a fighter changes the hash", () => {
    const s = clone(makeState());
    s.fighters.pop();
    expect(hashState(s)).not.toBe(base);
  });
});

describe("events are hashed separately, never into hashState", () => {
  const base = hashState(makeState());
  const baseEvents = hashEvents(makeState().events);

  it("changing the events does NOT move hashState", () => {
    const s = clone(makeState());
    s.events = [{ kind: "ko", target: 0 }];
    expect(hashState(s)).toBe(base);
    const empty = clone(makeState());
    empty.events = [];
    expect(hashState(empty)).toBe(base);
  });

  it("...but DOES move hashEvents", () => {
    // the control for the assertion above: without this, a hashEvents that
    // ignored its argument would make both halves pass.
    expect(hashEvents([{ kind: "ko", target: 0 }])).not.toBe(baseEvents);
    expect(hashEvents([])).not.toBe(baseEvents);
  });

  it("discriminates the kind, with every other field held equal", () => {
    const kinds: FightEvent[] = [
      { kind: "block", target: 1 },
      { kind: "knockdown", target: 1 },
      { kind: "ko", target: 1 },
    ];
    const seen = kinds.map((e) => hashEvents([e]));
    expect(new Set(seen).size).toBe(kinds.length);
  });

  it("discriminates every field of a hit", () => {
    const hit = (over: Partial<Extract<FightEvent, { kind: "hit" }>>): string =>
      hashEvents([
        { kind: "hit", attacker: 0, target: 1, x: 1000, z: 200, h: 30, damage: 9, effect: "spark", ...over },
      ]);
    const base1 = hit({});
    for (const over of [
      { attacker: 1 },
      { target: 0 },
      { x: 1001 },
      { z: 201 },
      { h: 31 },
      { damage: 10 },
      { effect: "dust" as const },
    ]) {
      expect(hit(over)).not.toBe(base1);
    }
  });

  it("discriminates the target of a block, a knockdown, a ko and a land", () => {
    expect(hashEvents([{ kind: "block", target: 0 }])).not.toBe(hashEvents([{ kind: "block", target: 1 }]));
    expect(hashEvents([{ kind: "knockdown", target: 0 }])).not.toBe(hashEvents([{ kind: "knockdown", target: 1 }]));
    expect(hashEvents([{ kind: "ko", target: 0 }])).not.toBe(hashEvents([{ kind: "ko", target: 1 }]));
    expect(hashEvents([{ kind: "land", who: 0 }])).not.toBe(hashEvents([{ kind: "land", who: 1 }]));
    expect(hashEvents([{ kind: "phase", phase: 0 }])).not.toBe(hashEvents([{ kind: "phase", phase: 1 }]));
  });

  it("the events' ORDER matters", () => {
    const a: FightEvent = { kind: "land", who: 0 };
    const b: FightEvent = { kind: "ko", target: 1 };
    expect(hashEvents([a, b])).not.toBe(hashEvents([b, a]));
  });
});

describe("the field lists cover the interfaces", () => {
  // The ratchet. Adding a field to FighterState without adding it to
  // HASHED_FIGHTER_FIELDS is otherwise completely silent: the hash keeps
  // working, every desync check keeps passing, and the new field is invisible.
  const sorted = (xs: readonly string[]) => [...xs].sort();

  it("HASHED_FIGHTER_FIELDS is every FighterState key except `ai`", () => {
    const s = makeState();
    for (const f of s.fighters) {
      const keys = Object.keys(f).filter((k) => k !== "ai");
      expect(sorted(keys)).toEqual(sorted(HASHED_FIGHTER_FIELDS));
    }
  });

  it("HASHED_AI_FIELDS is every AiState key", () => {
    const ai = makeState().fighters[0].ai as AiState;
    expect(sorted(Object.keys(ai))).toEqual(sorted(HASHED_AI_FIELDS));
  });

  it("HASHED_STATE_FIELDS is every FightState key except the two collections", () => {
    const keys = Object.keys(makeState()).filter((k) => k !== "fighters" && k !== "events");
    expect(sorted(keys)).toEqual(sorted(HASHED_STATE_FIELDS));
  });

  it("no list repeats a field", () => {
    for (const list of [HASHED_STATE_FIELDS, HASHED_FIGHTER_FIELDS, HASHED_AI_FIELDS]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
