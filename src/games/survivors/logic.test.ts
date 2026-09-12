import { describe, expect, it } from "vitest";
import {
  ARENA, KINDS, RUN_MS, UPGRADE_CAP, UPGRADE_IDS,
  applyUpgrade, boltCount, fireEvery, newRun, offerUpgrades, rngFor, step,
  type Enemy, type EnemyKind, type RunState,
} from "./logic";

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
/** Run n frames of 16 ms, the way a 60 Hz display would. */
function frames(s: RunState, n: number, rng = rngFor(1), input = STILL) {
  for (let i = 0; i < n; i++) step(s, 16, input, rng);
  return s;
}

describe("a new run", () => {
  it("starts in the middle, on three hearts, with nothing on screen", () => {
    const s = newRun("normal");
    expect(s.phase).toBe("playing");
    expect(s.hp).toBe(3);
    expect(s.maxHp).toBe(3);
    expect(s.x).toBe(ARENA.w / 2);
    expect(s.y).toBe(ARENA.h / 2);
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
    const s = newRun("normal");
    // The ship would otherwise shoot one of them off the board on frame one,
    // and this test is about what the survivors cost, not about the gun.
    s.fireIn = 500;
    place(s, "runner", s.x, s.y);
    place(s, "runner", s.x + 2, s.y);
    place(s, "runner", s.x, s.y + 2);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
    expect(s.enemies).toHaveLength(0);
  });

  it("gives mercy afterwards, so the next shape in the queue is free", () => {
    const s = newRun("normal");
    s.fireIn = 500;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
    expect(s.invuln).toBeGreaterThan(0);
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
  });

  it("ends the run when the last heart goes", () => {
    const s = newRun("normal");
    s.hp = 1;
    s.invuln = 0;
    s.fireIn = 500;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("over");
    expect(s.events.some((e) => e.type === "over")).toBe(true);
  });
});

describe("the clock", () => {
  it("wins the run at three minutes", () => {
    const s = newRun("normal");
    s.t = RUN_MS - 10;
    step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("won");
    expect(s.t).toBe(RUN_MS);
    expect(s.events.some((e) => e.type === "won")).toBe(true);
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

describe("the arena holds you", () => {
  it("never lets you walk out of it", () => {
    const s = newRun("normal");
    frames(s, 400, rngFor(2), { dx: -1, dy: -1 });
    expect(s.x).toBeGreaterThanOrEqual(0);
    expect(s.y).toBeGreaterThanOrEqual(0);
    frames(s, 400, rngFor(2), { dx: 1, dy: 1 });
    expect(s.x).toBeLessThanOrEqual(ARENA.w);
    expect(s.y).toBeLessThanOrEqual(ARENA.h);
  });
});
