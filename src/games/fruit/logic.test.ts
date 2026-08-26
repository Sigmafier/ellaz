import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DEATH_LINE,
  DT,
  LEVELS,
  LEVEL_IDS,
  MAX_DEALT_TIER,
  SPAWN_Y,
  TIER_COUNT,
  TOP_MERGE_BONUS,
  TOP_TIER,
  WORLD_H,
  canDrop,
  clampDropX,
  dealTier,
  drop,
  isSettled,
  newWorld,
  radiusOf,
  scoreFor,
  scoreForMerge,
  step,
  type Fruit,
  type LevelId,
  type World,
} from "./logic";

/** A generator that replays the same sequence every run. */
const seeded = (label: string) => mulberry32(seedFrom(label));

/** Run the SHIPPED step, the number of sub-steps a real second would consume. */
function run(world: World, steps: number): World {
  let w = world;
  for (let i = 0; i < steps; i++) w = step(w, DT);
  return w;
}

/** Run until nothing is moving, or give up. Returns the world and what it took. */
function settle(world: World, limit = 2400): { world: World; steps: number } {
  let w = world;
  let i = 0;
  for (; i < limit && !isSettled(w); i++) w = step(w, DT);
  return { world: w, steps: i };
}

/** A board written out by hand, so a rule can be tested without dropping anything. */
function box(fruit: Array<Partial<Fruit> & { tier: number; x: number; y: number }>, width = 74): World {
  return {
    width,
    height: WORLD_H,
    fruit: fruit.map((f, i) => ({ id: i + 1, vx: 0, vy: 0, ...f })),
    nextId: fruit.length + 1,
    score: 0,
    pending: 0,
    queued: 0,
    cooldown: 0,
    calmFor: 0,
    overFor: 0,
    over: false,
    merges: 0,
    lastMerge: null,
  };
}

const speedOf = (f: Fruit) => Math.sqrt(f.vx * f.vx + f.vy * f.vy);

/**
 * A narrow box packed past the top, with nothing in it that can merge.
 *
 * The three biggest tiers, cycling, so no two of a kind ever touch - a stack of
 * ONE tier folds itself into a single fruit and empties the box, which is the
 * opposite of the thing under test. In a 52-wide box none of these three fit
 * side by side, so the walls hold the pile in single file rather than letting
 * it spread out and settle below the line.
 */
function brimful(): World {
  return box(
    Array.from({ length: 4 }, (_, i) => ({
      tier: [9, 8, 7][i % 3],
      x: 26 + (i % 2 ? 3 : -3),
      y: 84 - i * 22,
    })),
    LEVELS.hard.width,
  );
}

describe("the chain of fruit", () => {
  it("gets strictly bigger every rung, so the ladder reads as a ladder", () => {
    const radii = Array.from({ length: TIER_COUNT }, (_, t) => radiusOf(t));
    for (let t = 1; t < radii.length; t++) {
      expect(radii[t], `tier ${t}`).toBeGreaterThan(radii[t - 1]);
    }
  });

  it("only ever DEALS the bottom of the chain, so the big ones must be built", () => {
    expect(MAX_DEALT_TIER).toBeLessThan(TOP_TIER);
    const rng = seeded("deal-range");
    for (let i = 0; i < 500; i++) {
      const t = dealTier(rng);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(MAX_DEALT_TIER);
    }
  });

  // A restored snapshot can name a tier this build no longer has. An undefined
  // radius poisons every distance into NaN, which does not throw - it renders
  // an empty box and a score that never moves.
  it("answers a tier that is not on the ladder instead of returning nothing", () => {
    expect(radiusOf(-4)).toBe(radiusOf(0));
    expect(radiusOf(TIER_COUNT + 9)).toBe(radiusOf(TOP_TIER));
    expect(radiusOf(Number.NaN)).toBe(radiusOf(0));
    expect(radiusOf(2.7)).toBe(radiusOf(2));
  });

  it("fits its biggest fruit inside even the narrowest box", () => {
    expect(radiusOf(TOP_TIER) * 2).toBeLessThan(LEVELS.hard.width);
  });
});

describe("what a merge is worth", () => {
  it("pays more for every rung than the rung below", () => {
    for (let t = 1; t <= TOP_TIER; t++) {
      expect(scoreForMerge(t), `tier ${t}`).toBeGreaterThan(scoreForMerge(t - 1));
    }
  });

  it("pays a bonus for finishing the ladder, because those two fruit leave", () => {
    expect(scoreForMerge(TOP_TIER)).toBe(((TOP_TIER + 1) * (TOP_TIER + 2)) / 2 + TOP_MERGE_BONUS);
  });

  it("clamps a tier off the ladder rather than returning NaN", () => {
    expect(scoreForMerge(-1)).toBe(scoreForMerge(0));
    expect(scoreForMerge(Number.NaN)).toBe(scoreForMerge(0));
    expect(Number.isFinite(scoreForMerge(99))).toBe(true);
  });
});

describe("a fresh box", () => {
  it.each(LEVEL_IDS)("%s is empty, is not over, and has nothing to simulate", (level) => {
    const w = newWorld(level, seeded(`fresh-${level}`));
    expect(w.fruit).toEqual([]);
    expect(w.over).toBe(false);
    expect(w.score).toBe(0);
    expect(w.width).toBe(LEVELS[level as LevelId].width);
    expect(w.height).toBe(WORLD_H);
    expect(canDrop(w)).toBe(true);
  });

  it("gets narrower as it gets harder, because room IS the difficulty", () => {
    expect(LEVELS.easy.width).toBeGreaterThan(LEVELS.medium.width);
    expect(LEVELS.medium.width).toBeGreaterThan(LEVELS.hard.width);
  });

  it("always deals something the player can actually pair up", () => {
    for (const level of LEVEL_IDS) {
      const w = newWorld(level, seeded(`deal-${level}`));
      expect(w.pending).toBeLessThanOrEqual(MAX_DEALT_TIER);
      expect(w.queued).toBeLessThanOrEqual(MAX_DEALT_TIER);
    }
  });
});

describe("dropping", () => {
  it("puts the pending fruit in the box and pulls the next one up the queue", () => {
    const before = newWorld("easy", seeded("drop-queue"));
    const after = drop(before, 30, seeded("drop-queue-next"));
    expect(after.fruit).toHaveLength(1);
    expect(after.fruit[0].tier).toBe(before.pending);
    expect(after.fruit[0].y).toBe(SPAWN_Y);
    expect(after.pending).toBe(before.queued);
  });

  it("cannot spawn a fruit half inside a wall", () => {
    const w = newWorld("hard", seeded("clamp"));
    const r = radiusOf(w.pending);
    expect(drop(w, -500, seeded("a")).fruit[0].x).toBeCloseTo(r, 6);
    expect(drop(w, 5000, seeded("b")).fruit[0].x).toBeCloseTo(w.width - r, 6);
    expect(clampDropX(w, -500)).toBeCloseTo(r, 6);
    expect(clampDropX(w, 5000)).toBeCloseTo(w.width - r, 6);
  });

  // A refusal is not an error. Returning the SAME object is how the renderer
  // knows nothing happened without a throw inside a tap handler.
  it("refuses a nonsense position rather than throwing", () => {
    const w = newWorld("easy", seeded("nan"));
    expect(clampDropX(w, Number.NaN)).toBeCloseTo(w.width / 2, 6);
    // Infinity is not "the far wall", it is nonsense - so it lands in the
    // middle, where a fruit can always legally be spawned.
    expect(clampDropX(w, Number.POSITIVE_INFINITY)).toBeCloseTo(w.width / 2, 6);
  });

  it("refuses a second drop until the cooldown has run out", () => {
    const first = drop(newWorld("easy", seeded("cool")), 30, seeded("cool2"));
    expect(canDrop(first)).toBe(false);
    expect(drop(first, 40, seeded("cool3"))).toBe(first);
    const later = run(first, 30);
    expect(canDrop(later)).toBe(true);
    expect(drop(later, 40, seeded("cool4")).fruit).toHaveLength(2);
  });

  it("refuses everything once the run is over", () => {
    const dead: World = { ...newWorld("easy", seeded("dead")), over: true };
    expect(canDrop(dead)).toBe(false);
    expect(drop(dead, 20, seeded("dead2"))).toBe(dead);
  });
});

describe("the simulation itself", () => {
  it("never touches the world it was handed", () => {
    const before = box([{ tier: 2, x: 20, y: 30 }, { tier: 2, x: 26, y: 30 }]);
    const snapshot = JSON.stringify(before);
    run(before, 40);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("gives the same answer twice for the same world", () => {
    const start = box([{ tier: 1, x: 20, y: 10, vx: 4 }, { tier: 3, x: 40, y: 40, vx: -6 }]);
    expect(run(start, 200)).toEqual(run(start, 200));
  });

  it("drops a fruit to the floor and leaves it there", () => {
    const w = drop(newWorld("easy", seeded("fall")), 30, seeded("fall2"));
    const rested = settle(w).world;
    expect(rested.fruit).toHaveLength(1);
    const f = rested.fruit[0];
    expect(f.y).toBeCloseTo(WORLD_H - radiusOf(f.tier), 1);
    expect(speedOf(f)).toBeLessThan(2);
  });

  it("comes to rest rather than jittering forever", () => {
    const w = drop(newWorld("easy", seeded("rest")), 30, seeded("rest2"));
    const { steps } = settle(w);
    // A whole simulated second is 120 sub-steps; anything that has not stopped
    // inside 2400 is a pile that never stops, which is the thing damping is for.
    expect(steps).toBeLessThan(2400);
  });

  it("keeps every fruit inside the box through a busy run", () => {
    const rng = seeded("busy");
    let w = newWorld("hard", rng);
    for (let i = 0; i < 24; i++) {
      w = drop(w, 6 + (i * 7) % 40, rng);
      w = run(w, 60);
    }
    w = settle(w).world;
    for (const f of w.fruit) {
      const r = radiusOf(f.tier);
      expect(f.x, `fruit ${f.id} left the box`).toBeGreaterThanOrEqual(r - 0.001);
      expect(f.x, `fruit ${f.id} left the box`).toBeLessThanOrEqual(w.width - r + 0.001);
      expect(f.y, `fruit ${f.id} fell through the floor`).toBeLessThanOrEqual(WORLD_H - r + 0.001);
      expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true);
    }
  });

  // Two circles at the same point have no separating direction. Dividing by
  // that distance is how a whole board turns into NaN and renders empty.
  it("survives two fruit sitting on exactly the same spot", () => {
    const w = run(box([{ tier: 4, x: 30, y: 50 }, { tier: 6, x: 30, y: 50 }]), 120);
    for (const f of w.fruit) expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true);
  });
});

describe("merging", () => {
  it("folds two of the same kind into one of the next kind up", () => {
    const w = step(box([{ tier: 2, x: 30, y: 60 }, { tier: 2, x: 36, y: 60 }]), DT);
    expect(w.fruit).toHaveLength(1);
    expect(w.fruit[0].tier).toBe(3);
    expect(w.fruit[0].x).toBeCloseTo(33, 1);
    expect(w.score).toBe(scoreForMerge(2));
    expect(w.merges).toBe(1);
    expect(w.lastMerge).toMatchObject({ tier: 2, popped: false });
  });

  it("gives the new fruit its own id, so nothing is confused with the pair", () => {
    const before = box([{ tier: 0, x: 30, y: 60 }, { tier: 0, x: 33, y: 60 }]);
    const after = step(before, DT);
    expect(after.fruit[0].id).toBeGreaterThanOrEqual(before.nextId);
    expect(after.nextId).toBeGreaterThan(before.nextId);
  });

  it("leaves two DIFFERENT fruit alone, however hard they are pressed together", () => {
    const w = run(box([{ tier: 2, x: 30, y: 60 }, { tier: 3, x: 33, y: 60 }]), 60);
    expect(w.fruit).toHaveLength(2);
    expect(w.score).toBe(0);
  });

  it("pops both when the top of the ladder merges, and leaves nothing behind", () => {
    const w = step(box([{ tier: TOP_TIER, x: 25, y: 60 }, { tier: TOP_TIER, x: 30, y: 60 }]), DT);
    expect(w.fruit).toHaveLength(0);
    expect(w.score).toBe(scoreForMerge(TOP_TIER));
    expect(w.lastMerge?.popped).toBe(true);
  });

  it("carries the pair's momentum into what they became", () => {
    const w = step(box([{ tier: 1, x: 30, y: 40, vx: 10 }, { tier: 1, x: 37, y: 40, vx: 10 }]), DT);
    expect(w.fruit).toHaveLength(1);
    expect(w.fruit[0].vx).toBeGreaterThan(5);
  });

  // The chain reaction is the whole game: a merge makes a fruit that meets the
  // one already sitting there, one beat at a time rather than all at once.
  it("sets off a chain when the fruit it makes meets its own twin", () => {
    const w = run(
      box([
        { tier: 0, x: 30, y: 96 },
        { tier: 0, x: 36, y: 96 },
        { tier: 1, x: 41, y: 95 },
      ]),
      240,
    );
    expect(w.fruit.some((f) => f.tier === 2)).toBe(true);
    expect(w.score).toBe(scoreForMerge(0) + scoreForMerge(1));
    expect(w.merges).toBe(2);
  });

  it("merges what a player would actually build: two dropped on one another", () => {
    const rng = seeded("stack");
    let w = newWorld("easy", rng);
    // Force the pair rather than trusting the deal - the point under test is
    // the contact, not the shuffle.
    w = { ...w, pending: 1, queued: 1 };
    w = drop(w, 30, rng);
    w = settle(w).world;
    w = { ...w, pending: 1 };
    w = drop(w, 30, rng);
    w = settle(w).world;
    expect(w.fruit).toHaveLength(1);
    expect(w.fruit[0].tier).toBe(2);
  });
});

describe("running out of room", () => {
  // Both halves of the end condition matter, and this is the half that is easy
  // to get wrong: the fruit a player has just let go of is ABOVE the line by
  // construction, because that is where they aim from.
  it("does not end the run on a fruit that is merely on its way down", () => {
    const rng = seeded("passing");
    let w = drop(newWorld("easy", rng), 30, rng);
    expect(w.fruit[0].y - radiusOf(w.fruit[0].tier)).toBeLessThan(DEATH_LINE);
    w = settle(w).world;
    expect(w.over).toBe(false);
  });

  it("ends the run when something comes to rest above the line", () => {
    const w = run(brimful(), 600);
    expect(w.fruit.some((f) => f.y - radiusOf(f.tier) < DEATH_LINE)).toBe(true);
    expect(w.over).toBe(true);
  });

  // The sleep threshold is deliberately longer than the end-of-run one. Get the
  // order backwards and a pile resting above the line freezes there forever,
  // because the renderer stops stepping a settled world.
  it("never falls asleep before it has had the chance to end", () => {
    let w = brimful();
    for (let i = 0; i < 600; i++) {
      w = step(w, DT);
      if (isSettled(w)) break;
    }
    expect(w.over).toBe(true);
  });

  it("stops simulating once the pile is still, which is why there is no pause", () => {
    const rng = seeded("asleep");
    const dropped = drop(newWorld("easy", rng), 30, rng);
    expect(isSettled(dropped)).toBe(false);
    expect(isSettled(settle(dropped).world)).toBe(true);
  });
});

describe("the record", () => {
  it("reports points, and scopes them to the box that was played", () => {
    const w = { ...newWorld("hard", seeded("score")), score: 412 };
    expect(scoreFor(w, "hard")).toEqual({ value: 412, unit: "points", board: "hard" });
  });
});

describe("determinism", () => {
  it("replays an identical run from the same seed", () => {
    const play = (label: string) => {
      const rng = seeded(label);
      let w = newWorld("medium", rng);
      for (let i = 0; i < 14; i++) {
        w = drop(w, 8 + (i * 11) % 40, rng);
        w = run(w, 90);
      }
      return settle(w).world;
    };
    const a = play("replay");
    const b = play("replay");
    expect(a.score).toBe(b.score);
    expect(a.merges).toBe(b.merges);
    expect(a.fruit).toEqual(b.fruit);
  });

  it("plays a DIFFERENT run from a different seed", () => {
    // The control on the test above: two identical worlds prove nothing about
    // the rng if every seed produces the same deal.
    const deal = (label: string) => {
      const rng = seeded(label);
      return Array.from({ length: 20 }, () => dealTier(rng));
    };
    expect(deal("one")).not.toEqual(deal("two"));
  });
});
