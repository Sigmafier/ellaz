import { describe, expect, it } from "vitest";
import {
  ARENA, KINDS, RUN_MS, UPGRADE_CAP, UPGRADE_IDS,
  applyUpgrade, boltCount, fireEvery, newRun, offerUpgrades, rngFor, step,
  type Enemy, type EnemyKind, type RunState,
} from "./logic";
import { WALL, WORLD_SCALE } from "./world";

// The whole game is in `logic.ts`, so the whole game can be played here with no
// canvas. Every test below drives it the way a frame would: a handful of
// milliseconds and a steering vector, nothing else.

/** Put a shape exactly where the test needs it, bypassing the spawner. */
function place(s: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const e: Enemy = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

const STILL = { dx: 0, dy: 0 };

/**
 * Hold every gun still and put the dash out of reach. The tests that use this are
 * about what a shape COSTS when it reaches you, not about the weapons shooting it
 * first or the dash blinking you clear of it - both of those are pinned in their
 * own files (`weapons.test.ts`, `powers.test.ts`).
 */
function defenceless(s: RunState): RunState {
  for (const k of s.slots) k.cd = 9_000;
  s.dashCd = 9_000;
  return s;
}
/** Run n frames of 16 ms, the way a 60 Hz display would. */
function frames(s: RunState, n: number, rng = rngFor(1), input = STILL) {
  for (let i = 0; i < n; i++) step(s, 16, input, rng);
  return s;
}

describe("a new run", () => {
  it("starts in the middle of the world, on three hearts, with nothing on screen", () => {
    const s = newRun("normal");
    expect(s.phase).toBe("playing");
    expect(s.hp).toBe(3);
    expect(s.maxHp).toBe(3);
    expect(s.world).toEqual({ w: ARENA.w * WORLD_SCALE, h: ARENA.h * WORLD_SCALE });
    expect(s.x).toBe(s.world.w / 2);
    expect(s.y).toBe(s.world.h / 2);
    expect(s.enemies).toHaveLength(0);
    expect(s.popped).toBe(0);
    expect(s.power).toBe(1);
  });
});

describe("the same seed plays the same run", () => {
  it("lands on the same score, hearts and clock after 300 frames", () => {
    const a = newRun("normal");
    const b = newRun("normal");
    frames(a, 300, rngFor(7));
    frames(b, 300, rngFor(7));
    expect({ popped: a.popped, hp: a.hp, t: a.t, enemies: a.enemies.length })
      .toEqual({ popped: b.popped, hp: b.hp, t: b.t, enemies: b.enemies.length });
    // The vacuum control: a run where nothing happened would satisfy the line
    // above and prove nothing at all.
    expect(a.enemies.length).toBeGreaterThan(0);
  });
});

describe("shooting", () => {
  it("fires by itself at the nearest shape and pops it, leaving a gem", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 80, s.y);
    frames(s, 20);
    expect(s.popped).toBe(1);
    expect(s.enemies).toHaveLength(0);
    expect(s.gems.length).toBeGreaterThan(0);
  });

  it("does not fire at nothing", () => {
    const s = newRun("normal");
    step(s, 16, STILL, rngFor(1));
    expect(s.bolts).toHaveLength(0);
  });

  it("cannot hit the same shape twice with one bolt", () => {
    // A brute has five hit points and a bolt does one, so if a piercing bolt
    // were allowed to keep touching it while it passed through, the brute would
    // die in a single shot.
    const s = newRun("normal");
    s.up.pierce = 3;
    const brute = place(s, "brute", s.x + 60, s.y);
    frames(s, 12);
    expect(brute.hp).toBe(KINDS.brute.hp - 1);
  });
});

describe("being hit", () => {
  it("costs exactly one heart even when three shapes arrive together", () => {
    // The ship would otherwise shoot one of them off the board on frame one,
    // and this test is about what the survivors cost, not about the gun.
    const s = defenceless(newRun("normal"));
    place(s, "runner", s.x, s.y);
    place(s, "runner", s.x + 2, s.y);
    place(s, "runner", s.x, s.y + 2);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
    expect(s.enemies).toHaveLength(0);
  });

  it("gives mercy afterwards, so the next shape in the queue is free", () => {
    const s = defenceless(newRun("normal"));
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
    expect(s.invuln).toBeGreaterThan(0);
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
  });

  it("ends the run when the last heart goes", () => {
    const s = defenceless(newRun("normal"));
    s.hp = 1;
    s.invuln = 0;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("over");
    expect(s.events.some((e) => e.type === "over")).toBe(true);
  });
});

describe("the clock", () => {
  it("STOPS at three minutes without winning - that is when the golem arrives", () => {
    // This test asserted `phase === "won"` here until 2026-09-12, and it was
    // correct: reaching three minutes WAS the win. Task 7 moved the finish onto
    // the golem, so the assertion is inverted deliberately rather than deleted.
    // The clock reaching its end is still a real event worth pinning; it simply
    // means something else now, and what it means is pinned in `boss.test.ts`.
    const s = newRun("normal");
    s.t = RUN_MS - 10;
    step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("playing");
    expect(s.t).toBe(RUN_MS);
    expect(s.events.some((e) => e.type === "won")).toBe(false);
  });

  it("clamps a frame that took ten seconds", () => {
    // A backgrounded tab comes back with an enormous delta. Without the clamp
    // it would teleport ten seconds of shapes into the player's face.
    const s = newRun("normal");
    step(s, 10_000, STILL, rngFor(1));
    expect(s.t).toBeLessThanOrEqual(50);
  });

  it("stops entirely while an upgrade is being chosen", () => {
    const s = newRun("normal");
    s.choosing = true;
    const before = s.t;
    frames(s, 30);
    expect(s.t).toBe(before);
  });
});

describe("levelling up", () => {
  it("asks for a choice once enough gems are collected", () => {
    const s = newRun("normal");
    s.gems.push({ id: 999, x: s.x, y: s.y, value: s.need });
    step(s, 16, STILL, rngFor(1));
    expect(s.power).toBe(2);
    expect(s.choosing).toBe(true);
    expect(s.events.some((e) => e.type === "levelup")).toBe(true);
  });

  it("offers three different upgrades and never a maxed one", () => {
    const s = newRun("normal");
    s.up.rapid = UPGRADE_CAP.rapid;
    const offer = offerUpgrades(s, rngFor(3));
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    expect(offer).not.toContain("rapid");
  });

  it("offers nothing at all once everything is maxed, rather than stalling", () => {
    const s = newRun("normal");
    for (const id of UPGRADE_IDS) s.up[id] = UPGRADE_CAP[id];
    expect(offerUpgrades(s, rngFor(3))).toHaveLength(0);
  });

  it("applies the choice and lets the run carry on", () => {
    const s = newRun("normal");
    s.choosing = true;
    const before = fireEvery(s);
    applyUpgrade(s, "rapid");
    expect(s.up.rapid).toBe(1);
    expect(fireEvery(s)).toBeLessThan(before);
    expect(s.choosing).toBe(false);
  });

  it("gives a heart back as well as raising the ceiling", () => {
    const s = newRun("normal");
    s.hp = 1;
    applyUpgrade(s, "heart");
    expect(s.maxHp).toBe(4);
    expect(s.hp).toBe(2);
  });

  it("adds a bolt per spread, and refuses to go past the cap", () => {
    const s = newRun("normal");
    expect(boltCount(s)).toBe(1);
    for (let i = 0; i < UPGRADE_CAP.spread + 3; i++) applyUpgrade(s, "spread");
    expect(s.up.spread).toBe(UPGRADE_CAP.spread);
    expect(boltCount(s)).toBe(1 + UPGRADE_CAP.spread);
  });
});

describe("the world's walls hold you", () => {
  it("never lets you walk out of it", () => {
    // Immortal, or a run that ends part way stops the robot short of the wall
    // and the assertion reads a death rather than a wall.
    const s = newRun("normal");
    s.hp = 9_999;
    // A level-up stops the simulation until a card is taken, and nobody takes one
    // here - so the choice is dismissed every frame or the robot stalls mid-floor.
    const walk = (n: number, dx: number, dy: number) => {
      for (let i = 0; i < n; i++) {
        s.choosing = false;
        step(s, 16, { dx, dy }, rngFor(2));
      }
    };
    walk(1200, -1, -1);
    expect(s.x).toBeGreaterThanOrEqual(WALL);
    expect(s.y).toBeGreaterThanOrEqual(WALL);
    // Actually AT the wall, so the two lines above are not satisfied by a robot
    // that never got near it.
    expect(s.x).toBeLessThan(WALL + 20);
    walk(2400, 1, 1);
    expect(s.x).toBeLessThanOrEqual(s.world.w - WALL);
    expect(s.y).toBeLessThanOrEqual(s.world.h - WALL);
    expect(s.x).toBeGreaterThan(s.world.w - WALL - 20);
  });
});
