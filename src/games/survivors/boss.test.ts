// The golem, pinned by BEHAVIOUR.
//
// WHY THIS FILE EXISTS. The tier gate cannot see a boss at all - it greps for
// sprites, five clip ids, `@juice` calls and two weapons, and a run that ends
// with a 420-health wall walking in satisfies exactly none of those checks any
// differently from one that does not. So nothing outside this file can tell the
// difference between "the run ends by beating the golem" and "the run ends".
//
// Three of the assertions below are for things that were genuinely broken, or
// would have been, while this was written:
//
//   - the contact loop kills any shape that reaches the player, so the boss
//     killed itself by touching you and the run was WON by being hit;
//   - `kindsAt` must never hand the golem to the wave clock, or a 40-second-old
//     run gets a 420-health shape and the player never learns why they died;
//   - the swarm has to stop, or the duel happens inside a crowd arriving every
//     230 ms, which is `spawnEvery` at its floor by three minutes.
import { describe, expect, it } from "vitest";
import {
  ARENA, ARENA_WIDE, KINDS, RUN_MS, applyUpgrade, bossOf, kindsAt, newRun, rngFor, step,
  type Arena, type Enemy, type EnemyKind, type RunState, type UpgradeId,
} from "./logic";

const STILL = { dx: 0, dy: 0 };

function frames(s: RunState, n: number, rng = rngFor(1)) {
  for (let i = 0; i < n; i++) step(s, 16, STILL, rng);
  return s;
}

function place(s: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const e: Enemy = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

/**
 * A run standing at three minutes with the golem already on the board.
 *
 * `arena` DEFAULTS to the portrait floor, the same way `newRun` does and for the
 * same reason: every assertion in this file that does not care about shape keeps
 * reading exactly what it read before, so a red here means a real regression
 * rather than a signature churn.
 */
function atTheGolem(
  up: Partial<Record<UpgradeId, number>> = {},
  arena: Arena = ARENA,
): RunState {
  const s = newRun("normal", arena);
  for (const [id, n] of Object.entries(up)) {
    for (let i = 0; i < (n ?? 0); i++) applyUpgrade(s, id as UpgradeId);
  }
  s.t = RUN_MS - 10;
  step(s, 16, STILL, rngFor(1));
  return s;
}

/**
 * How long the gun needs to bring the golem down, with the player standing
 * still so the weapon is on target every frame it is in range.
 *
 * This is the FLOOR of the fight, not the fight: a real player dodges, walks out
 * of range and loses shots doing it. The hearts are taken out of the way on
 * purpose - this measures the gun, and whether three hearts survive the fight is
 * a different question from how long the fight is.
 */
function msToKill(s: RunState): number {
  s.maxHp = 9999;
  s.hp = 9999;
  let ms = 0;
  while (s.phase === "playing" && ms < 300_000) {
    step(s, 16, STILL, rngFor(1));
    ms += 16;
  }
  return ms;
}

describe("the golem arrives at three minutes", () => {
  it("is not there before, and walks in exactly once", () => {
    const s = newRun("normal");
    s.t = RUN_MS - 2000;
    frames(s, 20);
    expect(bossOf(s)).toBeNull();
    expect(s.boss).toBeNull();

    let arrivals = 0;
    for (let i = 0; i < 300; i++) {
      step(s, 16, STILL, rngFor(1));
      arrivals += s.events.filter((e) => e.type === "boss").length;
    }
    expect(arrivals).toBe(1);
    expect(s.enemies.filter((e) => e.kind === "golem")).toHaveLength(1);
    expect(bossOf(s)).not.toBeNull();
  });

  it("stops the clock instead of ending the run", () => {
    const s = atTheGolem();
    expect(s.phase).toBe("playing");
    expect(s.t).toBe(RUN_MS);
    frames(s, 120);
    expect(s.t).toBe(RUN_MS);
    expect(s.phase).toBe("playing");
  });

  it("THE CONTROL: the wave clock can never send one", () => {
    const s = newRun("normal");
    s.t = RUN_MS;
    const kinds = kindsAt(s);
    expect(kinds).not.toContain("golem");
    // Not vacuous: at three minutes every ordinary kind IS unlocked, so this
    // would catch a `kindsAt` that had stopped returning anything at all.
    expect(kinds).toEqual(expect.arrayContaining(["runner", "orb", "brute"]));
  });

  it("stops the swarm, and the same frames before three minutes do spawn", () => {
    const duel = atTheGolem();
    frames(duel, 400);
    expect(duel.enemies.filter((e) => e.kind !== "golem")).toHaveLength(0);

    // The control, and it is what makes the line above mean something: the same
    // 400 frames a minute earlier fill the arena.
    const before = newRun("normal");
    before.t = RUN_MS - 60_000;
    frames(before, 400);
    expect(before.enemies.length).toBeGreaterThan(0);
  });
});

describe("the golem does not die by touching you", () => {
  it("costs a heart and keeps its health", () => {
    const s = atTheGolem();
    const g = bossOf(s)!;
    // Hold the gun: this test is about the collision, not about the weapon.
    s.fireIn = 9000;
    s.x = g.x;
    s.y = g.y;
    step(s, 16, STILL, rngFor(1));

    expect(bossOf(s)).not.toBeNull();
    expect(bossOf(s)!.hp).toBe(KINDS.golem.hp);
    expect(s.phase).toBe("playing");
    expect(s.hp).toBe(2);
    expect(s.events.some((e) => e.type === "hurt")).toBe(true);
    expect(s.events.some((e) => e.type === "pop")).toBe(false);
  });

  it("THE CONTROL: an ordinary shape in the same place does die", () => {
    // Without this, "the golem survives contact" is satisfied by a build where
    // NOTHING dies on contact - which would be a different, larger bug.
    const s = newRun("normal");
    s.fireIn = 9000;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.enemies).toHaveLength(0);
    expect(s.events.some((e) => e.type === "pop")).toBe(true);
    expect(s.hp).toBe(2);
  });
});

describe("beating it is what wins the run", () => {
  it("wins when the golem falls, and not before", () => {
    const s = atTheGolem({ rapid: 3, power: 2, spread: 1 });
    s.maxHp = 9999;
    s.hp = 9999;
    const g = bossOf(s)!;
    g.x = s.x + 70;
    g.y = s.y;

    // Most of its health gone, but not all: still no win.
    g.hp = 12;
    frames(s, 2);
    expect(s.phase).toBe("playing");
    expect(s.events.some((e) => e.type === "won")).toBe(false);

    for (let i = 0; i < 400 && s.phase === "playing"; i++) step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("won");
    expect(s.events.some((e) => e.type === "won")).toBe(true);
    expect(bossOf(s)).toBeNull();
  });

  it("a tie goes to the win - the golem fell, so the run is won", () => {
    // Both endings can land on one frame: a leftover shape reaching you as the
    // golem goes down. The ruling is in `logic.ts` and this is what pins it, in
    // the one arrangement that can produce the tie deterministically.
    const s = atTheGolem();
    s.enemies = s.enemies.filter((e) => e.id !== s.boss);
    s.hp = 1;
    s.invuln = 0;
    s.fireIn = 9000;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));

    expect(s.hp).toBe(0);
    expect(s.phase).toBe("won");
    expect(s.events.some((e) => e.type === "over")).toBe(false);
  });

  it("running out of hearts with the golem still up is still a loss", () => {
    // The control for the tie above: the generous ruling must not have turned
    // every boss-phase death into a win.
    const s = atTheGolem();
    s.hp = 1;
    s.invuln = 0;
    s.fireIn = 9000;
    place(s, "runner", s.x, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.phase).toBe("over");
    expect(s.events.some((e) => e.type === "over")).toBe(true);
  });
});

describe("the fight is a fight, measured rather than felt", () => {
  it("takes between six and forty seconds with a representative loadout", () => {
    const loaded = msToKill(atTheGolem({ rapid: 3, power: 2, spread: 1 }));
    const bare = msToKill(atTheGolem());
    // Printed so the constant in `logic.ts` can be retuned from a reading rather
    // than from a guess, and so a weapon change shows up here as a number.
    console.log(`golem time-to-kill: loadout ${loaded} ms, no upgrades ${bare} ms`);

    // The WINDOW is pinned, not the number: retuning a weapon should move the
    // fight length, not red an unrelated file. Six seconds is "not a speed
    // bump"; forty is "not a chore".
    expect(loaded).toBeGreaterThan(6_000);
    expect(loaded).toBeLessThan(40_000);
    // Upgrades have to matter, or the measurement is not measuring the gun.
    expect(bare).toBeGreaterThan(loaded);
  });

  it("walks in from outside the arena, so it is seen coming", () => {
    const s = atTheGolem();
    const g = bossOf(s)!;
    expect(g.y).toBeLessThan(0);
    expect(g.x).toBeGreaterThan(0);
    expect(g.x).toBeLessThan(ARENA.w);

    // The same on the landscape floor, which is a different arrival: it enters
    // at that arena's own middle, not at a number baked in when there was only
    // one shape.
    const w = atTheGolem({}, ARENA_WIDE);
    const gw = bossOf(w)!;
    expect(gw.y).toBeLessThan(0);
    expect(gw.x).toBeGreaterThan(0);
    expect(gw.x).toBeLessThan(ARENA_WIDE.w);
  });

  it("is still a fight on the LANDSCAPE arena, and shorter for a reason", () => {
    // WHY THIS EXISTS. The fight above is measured on the portrait floor only.
    // Once a PC plays on a 648x364 arena, a portrait-only figure is a number
    // wearing no label - and it went stale silently the day the landscape ruling
    // landed, with this file still green. So both shapes are measured here.
    const wide = msToKill(atTheGolem({ rapid: 3, power: 2, spread: 1 }, ARENA_WIDE));
    const portrait = msToKill(atTheGolem({ rapid: 3, power: 2, spread: 1 }));
    console.log(`golem time-to-kill: landscape ${wide} ms, portrait ${portrait} ms`);

    // The same WINDOW the portrait arm is held to. A landscape fight that fell
    // out of it would be a different game, not a different layout.
    expect(wide).toBeGreaterThan(6_000);
    expect(wide).toBeLessThan(40_000);

    // Shorter is EXPECTED and is geometry, not tuning: the golem enters at the
    // top edge, `TARGET_RANGE` is 240, and this arena is only 364 tall, so it is
    // inside the gun's reach almost as soon as it appears. What is pinned is
    // that it is shorter by a LITTLE - a landscape fight at half the length
    // would mean the boss had stopped being the finish the run is built toward.
    expect(wide).toBeLessThan(portrait);
    expect(wide).toBeGreaterThan(portrait * 0.7);
  });
});
