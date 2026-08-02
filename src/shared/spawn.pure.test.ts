import { describe, it, expect } from "vitest";
import {
  SPAWN_DIFFICULTIES,
  SPAWN_PRESETS,
  alive,
  dueToSpawn,
  isAlive,
  isSustainable,
  judgeTap,
  pickLane,
  spawn,
  steadyStateAlive,
  type Prop,
  type SpawnSpec,
} from "./spawn.pure";
import { mulberry32 } from "./rng";

type Kind = "red" | "blue" | "green";

const SPEC: SpawnSpec = { everyMs: 1000, lifeMs: 3000, maxAlive: 3 };

function prop(over: Partial<Prop<Kind>> = {}): Prop<Kind> {
  return { id: 1, kind: "red", bornAt: 0, lifeMs: 1000, lane: 0, ...over };
}

/** Drive `spawn` forward in fixed steps and collect everything it produced. */
function run(
  spec: SpawnSpec,
  lanes: number,
  untilMs: number,
  stepMs: number,
  rng: () => number,
): Prop<Kind>[] {
  const born: Prop<Kind>[] = [];
  let props: Prop<Kind>[] = [];
  let lastSpawnAt = -Infinity;
  let nextId = 1;
  for (let now = 0; now <= untilMs; now += stepMs) {
    props = alive(props, now);
    const p = spawn<Kind>(
      { props, now, lastSpawnAt, spec, lanes, nextId, kindFor: () => "red" },
      rng,
    );
    if (p) {
      props = [...props, p];
      born.push(p);
      lastSpawnAt = now;
      nextId++;
    }
  }
  return born;
}

describe("isAlive / alive — the expiry boundary", () => {
  it("is alive from bornAt up to but NOT including bornAt + lifeMs", () => {
    const p = prop({ bornAt: 500, lifeMs: 1000 });
    expect(isAlive(p, 499)).toBe(false); // not born yet
    expect(isAlive(p, 500)).toBe(true); // born exactly now
    expect(isAlive(p, 1499)).toBe(true); // last living millisecond
    expect(isAlive(p, 1500)).toBe(false); // exactly expired
    expect(isAlive(p, 1501)).toBe(false);
  });

  it("treats a zero, negative or NaN lifetime as never alive", () => {
    for (const lifeMs of [0, -1, -1000, NaN]) {
      expect(isAlive(prop({ bornAt: 0, lifeMs }), 0)).toBe(false);
      expect(isAlive(prop({ bornAt: 0, lifeMs }), 100)).toBe(false);
    }
  });

  it("supports an endless prop (Infinity) — the reaction game's green light", () => {
    const light = prop({ bornAt: 0, lifeMs: Infinity });
    expect(isAlive(light, 0)).toBe(true);
    expect(isAlive(light, 10 ** 9)).toBe(true);
  });

  it("says nothing is alive at a NaN clock rather than everything", () => {
    expect(isAlive(prop(), NaN)).toBe(false);
  });

  it("keeps survivors in order, and does not mutate the input", () => {
    const props = [
      prop({ id: 1, bornAt: 0, lifeMs: 100 }),
      prop({ id: 2, bornAt: 0, lifeMs: 5000 }),
      prop({ id: 3, bornAt: 0, lifeMs: 50 }),
      prop({ id: 4, bornAt: 0, lifeMs: 5000 }),
    ];
    const snapshot = props.map((p) => ({ ...p }));
    expect(alive(props, 200).map((p) => p.id)).toEqual([2, 4]);
    expect(props).toEqual(snapshot);
  });

  it("returns the SAME objects, so a renderer can compare by identity", () => {
    const p = prop({ lifeMs: 5000 });
    expect(alive([p], 10)[0]).toBe(p);
  });
});

describe("dueToSpawn — the interval AND the cap", () => {
  it("fires at exactly the interval, not before", () => {
    expect(dueToSpawn(0, 999, SPEC, 0)).toBe(false);
    expect(dueToSpawn(0, 1000, SPEC, 0)).toBe(true);
    expect(dueToSpawn(0, 9999, SPEC, 0)).toBe(true);
  });

  it("spawns immediately from -Infinity, so a round starts with something", () => {
    expect(dueToSpawn(-Infinity, 0, SPEC, 0)).toBe(true);
  });

  it("REFUSES once the board is full, however overdue the interval is", () => {
    expect(dueToSpawn(0, 60_000, SPEC, SPEC.maxAlive)).toBe(false);
    expect(dueToSpawn(0, 60_000, SPEC, SPEC.maxAlive + 5)).toBe(false);
    // ...and allows it again at one below the cap.
    expect(dueToSpawn(0, 60_000, SPEC, SPEC.maxAlive - 1)).toBe(true);
  });

  it("refuses on a NaN alive count rather than flooding the screen", () => {
    expect(dueToSpawn(-Infinity, 0, SPEC, NaN)).toBe(false);
  });

  it("refuses when the clock has not advanced or has gone backwards", () => {
    expect(dueToSpawn(5000, 5000, SPEC, 0)).toBe(false);
    expect(dueToSpawn(5000, 1000, SPEC, 0)).toBe(false);
    expect(dueToSpawn(0, NaN, SPEC, 0)).toBe(false);
  });

  it("falls back to the cap alone on a degenerate interval", () => {
    const degenerate = { ...SPEC, everyMs: 0 };
    expect(dueToSpawn(0, 0, degenerate, 0)).toBe(true);
    expect(dueToSpawn(0, 0, degenerate, degenerate.maxAlive)).toBe(false);
  });
});

describe("judgeTap — total, and never a lie", () => {
  it("credits the asked-for kind and only that one", () => {
    const p = prop({ kind: "red", lifeMs: 5000 });
    expect(judgeTap(p, "red")).toBe("hit");
    expect(judgeTap(p, "blue")).toBe("wrong");
    expect(judgeTap(p, "green")).toBe("wrong");
  });

  it("calls a tap on empty space a miss", () => {
    expect(judgeTap(null, "red")).toBe("miss");
    expect(judgeTap(undefined, "red")).toBe("miss");
  });

  it("calls a tap on an ALREADY EXPIRED prop a miss, not a hit", () => {
    const p = prop({ kind: "red", bornAt: 0, lifeMs: 1000 });
    expect(judgeTap(p, "red", 999)).toBe("hit");
    expect(judgeTap(p, "red", 1000)).toBe("miss");
    expect(judgeTap(p, "blue", 1000)).toBe("miss");
    // Omitting the clock keeps the old behaviour: judge the kind only.
    expect(judgeTap(p, "red")).toBe("hit");
  });

  it("is total over awkward kinds and never throws", () => {
    const cases: ReadonlyArray<readonly [unknown, unknown, string]> = [
      [0, 0, "hit"],
      [0, 1, "wrong"],
      ["", "", "hit"],
      [false, false, "hit"],
      [false, 0, "wrong"], // Object.is, not ==
      [NaN, NaN, "hit"], // Object.is, not ===
      [null, null, "hit"],
    ];
    for (const [kind, target, want] of cases) {
      const p = { id: 1, kind, bornAt: 0, lifeMs: 1000, lane: 0 };
      expect(() => judgeTap(p, target)).not.toThrow();
      expect(judgeTap(p, target)).toBe(want);
    }
  });

  it("compares by identity for object kinds", () => {
    const bee = { name: "bee" };
    const p = { id: 1, kind: bee, bornAt: 0, lifeMs: 1000, lane: 0 };
    expect(judgeTap(p, bee)).toBe("hit");
    expect(judgeTap(p, { name: "bee" })).toBe("wrong");
  });
});

describe("pickLane — never stack two props on one spot", () => {
  it("never returns an occupied lane, over many seeded draws", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const occupied = [0, 2, 4];
      const lane = pickLane(occupied, 6, rng);
      expect(lane).not.toBeNull();
      expect(occupied).not.toContain(lane);
      expect([1, 3, 5]).toContain(lane);
    }
  });

  it("returns NULL when every lane is taken — never a wrong lane", () => {
    expect(pickLane([0, 1, 2], 3, mulberry32(1))).toBeNull();
    // Duplicates and out-of-range entries must not fake a free lane...
    expect(pickLane([0, 0, 1, 1, 2, 9, -1], 3, mulberry32(1))).toBeNull();
    // ...nor hide one.
    expect(pickLane([0, 0, 2, 2, 7], 3, mulberry32(1))).toBe(1);
  });

  it("returns null for a nonsensical lane count instead of guessing", () => {
    for (const lanes of [0, -1, NaN, Infinity, 0.5]) {
      expect(pickLane([], lanes)).toBeNull();
    }
  });

  it("floors a fractional lane count rather than producing a fractional lane", () => {
    const lanes = new Set<number | null>();
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) lanes.add(pickLane([], 3.9, rng));
    expect([...lanes].sort()).toEqual([0, 1, 2]);
  });

  it("eventually reaches every free lane (not pinned to one)", () => {
    const rng = mulberry32(2024);
    const seen = new Set<number | null>();
    for (let i = 0; i < 300; i++) seen.add(pickLane([], 5, rng));
    expect(seen.size).toBe(5);
  });

  it("is deterministic under a seeded rng", () => {
    const draw = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 20 }, () => pickLane([], 5, rng));
    };
    expect(draw(11)).toEqual(draw(11));
    expect(draw(11)).not.toEqual(draw(12));
  });
});

describe("spawn — the three gates composed", () => {
  const base = {
    props: [] as Prop<Kind>[],
    now: 0,
    lastSpawnAt: -Infinity,
    spec: SPEC,
    lanes: 4,
    nextId: 42,
    kindFor: () => "red" as Kind,
  };

  it("produces a prop stamped with now, the spec's life, and a free lane", () => {
    const p = spawn<Kind>({ ...base, now: 250 }, mulberry32(1));
    expect(p).not.toBeNull();
    expect(p).toMatchObject({ id: 42, kind: "red", bornAt: 250, lifeMs: SPEC.lifeMs });
    expect(p && p.lane).toBeGreaterThanOrEqual(0);
    expect(p && p.lane).toBeLessThan(base.lanes);
  });

  it("tells kindFor which lane it landed on", () => {
    const seen: number[] = [];
    const p = spawn<Kind>(
      {
        ...base,
        kindFor: (lane) => {
          seen.push(lane);
          return "blue";
        },
      },
      mulberry32(5),
    );
    expect(seen).toHaveLength(1);
    expect(p && p.lane).toBe(seen[0]);
    expect(p && p.kind).toBe("blue");
  });

  it("returns null before the interval is up", () => {
    expect(spawn<Kind>({ ...base, lastSpawnAt: 0, now: 999 }, mulberry32(1))).toBeNull();
  });

  it("returns null when the CAP is reached, however overdue", () => {
    // Endless lifetimes, so the refusal can only be the cap — a finite one would
    // have expired by `now` and the refusal would be measuring the wrong gate.
    const full = Array.from({ length: SPEC.maxAlive }, (_, i) =>
      prop({ id: i, lane: i, bornAt: 0, lifeMs: Infinity }),
    );
    expect(spawn<Kind>({ ...base, props: full, now: 60_000 }, mulberry32(1))).toBeNull();
    // Positive control: one fewer, and the same call spawns.
    expect(spawn<Kind>({ ...base, props: full.slice(1), now: 60_000 }, mulberry32(1))).not.toBeNull();
  });

  it("returns null when every LANE is taken, even below the cap", () => {
    // 2 lanes, cap of 3: the lanes run out first, and that must not stack.
    const twoLanes = { ...base, lanes: 2 };
    const full = [
      prop({ id: 1, lane: 0, bornAt: 0, lifeMs: Infinity }),
      prop({ id: 2, lane: 1, bornAt: 0, lifeMs: Infinity }),
    ];
    expect(spawn<Kind>({ ...twoLanes, props: full, now: 60_000 }, mulberry32(1))).toBeNull();
    // Positive control: a third lane, and the same board spawns again.
    expect(spawn<Kind>({ ...twoLanes, lanes: 3, props: full, now: 60_000 }, mulberry32(1))).toMatchObject({ lane: 2 });
  });

  it("lets an EXPIRED prop free both its cap slot and its lane", () => {
    const stale = Array.from({ length: SPEC.maxAlive }, (_, i) =>
      prop({ id: i, lane: i, bornAt: 0, lifeMs: 1000 }),
    );
    // Same list, one millisecond either side of every prop's expiry.
    expect(spawn<Kind>({ ...base, props: stale, now: 999 }, mulberry32(1))).toBeNull();
    const p = spawn<Kind>({ ...base, props: stale, lanes: 3, now: 1000 }, mulberry32(1));
    expect(p).not.toBeNull();
    expect(p && p.lane).toBeGreaterThanOrEqual(0);
  });

  it("never stacks two live props on one lane across a long run", () => {
    const rng = mulberry32(31);
    const spec: SpawnSpec = { everyMs: 200, lifeMs: 1000, maxAlive: 5 };
    let props: Prop<Kind>[] = [];
    let lastSpawnAt = -Infinity;
    let nextId = 1;
    for (let now = 0; now <= 30_000; now += 50) {
      props = alive(props, now);
      const lanes = props.map((p) => p.lane);
      expect(new Set(lanes).size).toBe(lanes.length);
      expect(props.length).toBeLessThanOrEqual(spec.maxAlive);
      const p = spawn<Kind>(
        { props, now, lastSpawnAt, spec, lanes: 5, nextId, kindFor: () => "red" },
        rng,
      );
      if (p) {
        props = [...props, p];
        lastSpawnAt = now;
        nextId++;
      }
    }
    expect(nextId).toBeGreaterThan(50); // positive control: it really did spawn
  });

  it("replays identically under the same seed, and differs under another", () => {
    const seq = (seed: number) =>
      run(SPEC, 4, 20_000, 100, mulberry32(seed)).map((p) => [p.id, p.bornAt, p.lane]);
    expect(seq(2024)).toEqual(seq(2024));
    expect(seq(2024)).not.toEqual(seq(7));
  });

  it("hands out strictly increasing ids, so React keys never collide", () => {
    const ids = run(SPEC, 4, 20_000, 100, mulberry32(9)).map((p) => p.id);
    expect(ids.length).toBeGreaterThan(5);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the difficulty ladder must actually be playable", () => {
  // A four-year-old on a phone needs to see it, decide, and reach it. Adults
  // react in ~250ms; this is the floor we hold every preset to.
  const MIN_REACH_MS = 1500;

  it("gives every level enough time to see, decide and reach", () => {
    for (const id of SPAWN_DIFFICULTIES) {
      expect(SPAWN_PRESETS[id].lifeMs).toBeGreaterThanOrEqual(MIN_REACH_MS);
    }
  });

  it("never lets a preset's spawn rate outrun its own cap", () => {
    for (const id of SPAWN_DIFFICULTIES) {
      const spec = SPAWN_PRESETS[id];
      expect(isSustainable(spec)).toBe(true);
      expect(steadyStateAlive(spec)).toBeLessThanOrEqual(spec.maxAlive);
    }
  });

  it("can tell an UNSUSTAINABLE spec from a sustainable one (control)", () => {
    // Without this the assertion above would pass for a predicate hardcoded to
    // true. 4000/500 = 8 props settling into a cap of 3: permanently throttled.
    expect(isSustainable({ everyMs: 500, lifeMs: 4000, maxAlive: 3 })).toBe(false);
    expect(steadyStateAlive({ everyMs: 500, lifeMs: 4000, maxAlive: 3 })).toBe(8);
    expect(isSustainable({ everyMs: 1000, lifeMs: 1000, maxAlive: 1 })).toBe(true);
  });

  it("gets harder in one direction, on both levers", () => {
    for (let i = 1; i < SPAWN_DIFFICULTIES.length; i++) {
      const prev = SPAWN_PRESETS[SPAWN_DIFFICULTIES[i - 1]];
      const cur = SPAWN_PRESETS[SPAWN_DIFFICULTIES[i]];
      expect(cur.everyMs).toBeLessThan(prev.everyMs);
      expect(cur.lifeMs).toBeLessThan(prev.lifeMs);
    }
  });

  it("actually fills the board it promises, at every level", () => {
    for (const id of SPAWN_DIFFICULTIES) {
      const spec = SPAWN_PRESETS[id];
      const born = run(spec, spec.maxAlive, 30_000, 50, mulberry32(4));
      expect(born.length).toBeGreaterThan(10);
      // The busiest moment reaches the steady state the spec implies.
      let peak = 0;
      for (let now = 0; now <= 30_000; now += 50) {
        peak = Math.max(peak, alive(born, now).length);
      }
      expect(peak).toBe(steadyStateAlive(spec));
    }
  });

  it("reports a steady state of 0 for a spec that can never run", () => {
    expect(steadyStateAlive({ everyMs: 0, lifeMs: 1000, maxAlive: 3 })).toBe(0);
    expect(steadyStateAlive({ everyMs: 1000, lifeMs: 0, maxAlive: 3 })).toBe(0);
  });
});
