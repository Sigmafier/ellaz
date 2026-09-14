// Five weapons, pinned by BEHAVIOUR.
//
// WHY THIS FILE EXISTS AT ALL. `scripts/assert-tier.mjs` decides a showcase game
// has weapons with two regexes over its source: one for `weapon:` or `weapons =`
// and one for an uppercase `WEAPONS?` token. Both are satisfied by a file that
// merely CONTAINS the word - a single-weapon game with a constant named WEAPONS
// passes it, and so would a table of identical rows. That gate is armed
// (`TIER_REQUIREMENTS=1`), and arming a grep with nothing behind it is how a
// green check comes to mean nothing.
//
// So the claim the gate cannot make is made here instead: there are five, they
// differ, and the differences are the ones a player can see and hear.
//
// 2026-09-14: the three weapons stopped taking turns. A run picks one and
// collects more into four slots, each slot on its own clock, and two new ones
// arrived - blades that turn around the robot, and a drone that shoots from its
// shoulder. The rotation tests became slot tests.
import { describe, expect, it } from "vitest";
import {
  KINDS, WEAPONS, newRun, rngFor, step,
  type Enemy, type EnemyKind, type RunState, type ShotKind, type WeaponId,
} from "./logic";
import { BLADES, bladePositions, dronePosition } from "./arsenal";

function place(s: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const e: Enemy = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

const STILL = { dx: 0, dy: 0 };

/** Carry exactly these weapons, all ready to fire. */
function carry(s: RunState, ...ids: WeaponId[]) {
  s.slots = ids.map((id) => ({ id, cd: 0 }));
}

/** Fire exactly one shot of the named weapon and hand back what it produced. */
function fireOnce(s: RunState, want: ShotKind) {
  carry(s, want);
  s.bolts.length = 0;
  s.events.length = 0;
  step(s, 16, STILL, rngFor(1));
  return { bolts: s.bolts.slice(), events: s.events.slice() };
}

describe("there are five weapons and they are not each other", () => {
  it("THE CONTROL: no two projectiles share a speed, a sound or a motion", () => {
    // If this ever passes vacuously the whole file is decoration, so it asserts
    // the population first: four rows that throw something, not one repeated.
    const ids = Object.keys(WEAPONS) as ShotKind[];
    expect(ids.sort()).toEqual(["arc", "bolt", "burst", "drone"]);
    expect(new Set(ids.map((k) => WEAPONS[k].speed)).size).toBe(4);
    expect(new Set(ids.map((k) => WEAPONS[k].sfx)).size).toBe(4);
    // Motion is the one that matters most and the one a "many weapons" claim
    // usually fakes: exactly one steers, exactly one goes out as a ring.
    expect(ids.filter((k) => WEAPONS[k].turn > 0)).toEqual(["arc"]);
    expect(ids.filter((k) => WEAPONS[k].count > 1)).toEqual(["burst"]);
  });

  it("every weapon's sound is one of the nine real sfx names", () => {
    // A name outside that table is a silent no-op with nothing in any log, which
    // is the quietest way for "each weapon has its own sound" to be false.
    const REAL = ["tap", "success", "win", "fail", "coin", "star", "flip", "pop", "streak"];
    for (const k of Object.keys(WEAPONS) as ShotKind[]) {
      expect(REAL, `${k}.sfx is not a real sound`).toContain(WEAPONS[k].sfx);
    }
  });
});

describe("each weapon behaves like itself", () => {
  it("the bolt goes straight at the target", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 100, s.y);
    const { bolts } = fireOnce(s, "bolt");
    expect(bolts).toHaveLength(1);
    // Aimed along +x, so there is no sideways component to speak of.
    expect(bolts[0].vx).toBeGreaterThan(0);
    expect(Math.abs(bolts[0].vy)).toBeLessThan(1);
  });

  it("the arc CURVES - its heading changes after it has left the ship", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 120, s.y);
    const { bolts } = fireOnce(s, "arc");
    expect(bolts).toHaveLength(1);
    const before = Math.atan2(bolts[0].vy, bolts[0].vx);

    // Move the target after the shot has left, so only steering can close on it.
    s.enemies.length = 0;
    place(s, "runner", s.x + 120, s.y + 120);
    for (let i = 0; i < 10; i++) step(s, 16, STILL, rngFor(1));

    const live = s.bolts.find((b) => b.kind === "arc");
    expect(live, "the arc expired before it could be measured").toBeTruthy();
    expect(Math.abs(Math.atan2(live!.vy, live!.vx) - before)).toBeGreaterThan(0.05);
  });

  it("the bolt does NOT curve - the control for the test above", () => {
    // Without this, "the arc curves" is satisfied by EVERY shot curving, which
    // would mean the weapons share one motion after all.
    const s = newRun("normal");
    place(s, "runner", s.x + 120, s.y);
    const { bolts } = fireOnce(s, "bolt");
    const before = Math.atan2(bolts[0].vy, bolts[0].vx);

    s.enemies.length = 0;
    place(s, "runner", s.x + 120, s.y + 120);
    for (let i = 0; i < 10; i++) step(s, 16, STILL, rngFor(1));

    const live = s.bolts.find((b) => b.kind === "bolt");
    expect(live).toBeTruthy();
    expect(Math.atan2(live!.vy, live!.vx)).toBeCloseTo(before, 6);
  });

  it("the burst throws a RING, not a fan", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 80, s.y);
    const { bolts } = fireOnce(s, "burst");
    expect(bolts.length).toBe(WEAPONS.burst.count);
    const angles = bolts.map((b) => Math.atan2(b.vy, b.vx));
    // A ring covers the circle; a fan clusters around the aim. Measured as the
    // spread between the widest pair, which a fan cannot reach.
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(Math.PI);
  });

  it("the drone throws from the DRONE, not from the robot", () => {
    const s = newRun("normal");
    s.droneAngle = Math.PI / 2; // straight below the robot
    place(s, "runner", s.x + 100, s.y + 34);
    const { bolts } = fireOnce(s, "drone");
    expect(bolts).toHaveLength(1);
    const d = dronePosition(s);
    // Launched a frame ago from the drone; within one frame of travel of it.
    expect(Math.hypot(bolts[0].x - d.x, bolts[0].y - d.y)).toBeLessThan(WEAPONS.drone.speed * 0.02 + 1);
    // THE CONTROL: the robot is 34 units away, so a shot from the robot would fail the line above.
    expect(Math.hypot(d.x - s.x, d.y - s.y)).toBeGreaterThan(30);
  });

  it("announces which weapon fired, so the scene can sound the right one", () => {
    for (const want of ["bolt", "arc", "burst", "drone"] as ShotKind[]) {
      const s = newRun("normal");
      place(s, "runner", s.x + 80, s.y);
      const { events } = fireOnce(s, want);
      const shot = events.find((e) => e.type === "shot");
      expect(shot, `no shot event for ${want}`).toBeTruthy();
      expect(shot!.type === "shot" && shot!.weapon).toBe(want);
    }
  });

  it("holds every weapon's fire when there is nothing to shoot", () => {
    // Including the burst, which does not aim - a ring thrown at an empty view is noise.
    for (const want of ["bolt", "arc", "burst", "drone"] as ShotKind[]) {
      const s = newRun("normal");
      fireOnce(s, want);
      expect(s.bolts, `${want} fired at nothing`).toHaveLength(0);
      // Held at zero, so it goes off the moment a shape walks in.
      expect(s.slots[0].cd).toBe(0);
    }
  });
});

describe("carried weapons fire on their own clocks", () => {
  it("two slots both fire on the same frame - a second weapon does not slow the first", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 120, s.y);
    carry(s, "bolt", "arc");
    step(s, 16, STILL, rngFor(1));
    const shots = s.events.filter((e) => e.type === "shot").map((e) => e.type === "shot" && e.weapon);
    expect(shots.sort()).toEqual(["arc", "bolt"]);
  });

  it("each slot then waits its own cadence, and the burst waits longest", () => {
    const s = newRun("normal");
    place(s, "brute", s.x + 120, s.y);
    carry(s, "bolt", "burst");
    step(s, 16, STILL, rngFor(1));
    const [bolt, burst] = s.slots;
    expect(bolt.cd).toBeGreaterThan(0);
    expect(burst.cd).toBeGreaterThan(bolt.cd);
  });
});

describe("the blades cut what they touch", () => {
  it("a shape in the ring is cut, and not again until the blades' own cooldown", () => {
    const s = newRun("normal");
    carry(s, "blades");
    const p = bladePositions(s)[0];
    const brute = place(s, "brute", p.x, p.y);
    brute.hp = 100;
    step(s, 16, STILL, rngFor(1));
    expect(brute.hp).toBe(100 - 1);
    for (let i = 0; i < 5; i++) {
      // Hold the brute on a blade so only the cooldown can stop a second cut.
      const q = bladePositions(s)[0];
      brute.x = q.x;
      brute.y = q.y;
      step(s, 16, STILL, rngFor(1));
    }
    expect(brute.hp).toBe(100 - 1);
    expect(brute.bladeCd).toBeGreaterThan(0);
    expect(brute.bladeCd).toBeLessThanOrEqual(BLADES.hitMs);
  });

  it("the blades turn, so the ring sweeps rather than standing still", () => {
    const s = newRun("normal");
    carry(s, "blades");
    const a0 = s.bladeAngle;
    for (let i = 0; i < 10; i++) step(s, 16, STILL, rngFor(1));
    expect(s.bladeAngle).toBeGreaterThan(a0);
  });

  it("THE CONTROL: without blades carried, the same shape in the same place is untouched", () => {
    const s = newRun("normal");
    carry(s);
    const p = bladePositions(s)[0];
    const brute = place(s, "brute", p.x, p.y);
    brute.hp = 100;
    step(s, 16, STILL, rngFor(1));
    expect(brute.hp).toBe(100);
  });

  it("spread adds a blade to the ring", () => {
    const s = newRun("normal");
    expect(bladePositions(s)).toHaveLength(BLADES.count);
    s.up.spread = 2;
    expect(bladePositions(s)).toHaveLength(BLADES.count + 2);
  });
});
