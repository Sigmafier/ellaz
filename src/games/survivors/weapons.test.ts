// Three weapons, pinned by BEHAVIOUR.
//
// WHY THIS FILE EXISTS AT ALL. `scripts/assert-tier.mjs` decides a showcase game
// has weapons with two regexes over its source: one for `weapon:` or `weapons =`
// and one for an uppercase `WEAPONS?` token. Both are satisfied by a file that
// merely CONTAINS the word - a single-weapon game with a constant named WEAPONS
// passes it, and so would a table of three identical rows. That gate is armed
// (`TIER_REQUIREMENTS=1`) in the same change as this file, and arming a grep
// with nothing behind it is how a green check comes to mean nothing.
//
// So the claim the gate cannot make is made here instead: there are three, they
// differ, and the differences are the ones a player can see and hear.
import { describe, expect, it } from "vitest";
import {
  KINDS, WEAPONS, WEAPON_ORDER, newRun, rngFor, step, weaponAt,
  type Enemy, type EnemyKind, type RunState, type WeaponId,
} from "./logic";

function place(s: RunState, kind: EnemyKind, x: number, y: number): Enemy {
  const e: Enemy = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

const STILL = { dx: 0, dy: 0 };

/** Fire exactly one shot of the named weapon and hand back what it produced. */
function fireOnce(s: RunState, want: WeaponId) {
  // Wind the rotation to the weapon under test rather than assuming its index.
  while (weaponAt(s.shots) !== want) s.shots += 1;
  s.bolts.length = 0;
  s.events.length = 0;
  s.fireIn = 0;
  step(s, 16, STILL, rngFor(1));
  return { bolts: s.bolts.slice(), events: s.events.slice() };
}

describe("there are three weapons and they are not each other", () => {
  it("rotates through all three, so a player sees every one within a few shots", () => {
    expect(WEAPON_ORDER).toHaveLength(3);
    const seen = [0, 1, 2, 3, 4, 5].map((n) => weaponAt(n));
    expect(new Set(seen).size).toBe(3);
    // The rotation repeats rather than running off the end.
    expect(seen.slice(0, 3)).toEqual(seen.slice(3, 6));
  });

  it("a negative index cannot throw or land off the table", () => {
    // `shots` only ever grows, so this can never happen today - which is exactly
    // why the modulo's sign handling would rot unnoticed without a line here.
    expect(WEAPON_ORDER).toContain(weaponAt(-1));
    expect(WEAPON_ORDER).toContain(weaponAt(-7));
  });

  it("THE CONTROL: no two weapons share a speed, a sound or a motion", () => {
    // If this ever passes vacuously the whole file is decoration, so it asserts
    // the population first: three rows, not one repeated.
    const ids = Object.keys(WEAPONS) as WeaponId[];
    expect(ids).toHaveLength(3);
    expect(new Set(ids.map((k) => WEAPONS[k].speed)).size).toBe(3);
    expect(new Set(ids.map((k) => WEAPONS[k].sfx)).size).toBe(3);
    // Motion is the one that matters most and the one a "three weapons" claim
    // usually fakes: exactly one steers, exactly one goes out as a ring.
    expect(ids.filter((k) => WEAPONS[k].turn > 0)).toEqual(["arc"]);
    expect(ids.filter((k) => WEAPONS[k].count > 1)).toEqual(["burst"]);
  });

  it("every weapon's sound is one of the nine real sfx names", () => {
    // A name outside that table is a silent no-op with nothing in any log, which
    // is the quietest way for "each weapon has its own sound" to be false.
    const REAL = ["tap", "success", "win", "fail", "coin", "star", "flip", "pop", "streak"];
    for (const k of Object.keys(WEAPONS) as WeaponId[]) {
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
    // would mean the three weapons share one motion after all.
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

  it("announces which weapon fired, so the scene can sound the right one", () => {
    const s = newRun("normal");
    place(s, "runner", s.x + 80, s.y);
    for (const want of WEAPON_ORDER) {
      const { events } = fireOnce(s, want);
      const shot = events.find((e) => e.type === "shot");
      expect(shot, `no shot event for ${want}`).toBeTruthy();
      expect(shot!.type === "shot" && shot!.weapon).toBe(want);
    }
  });

  it("holds every weapon's fire when there is nothing to shoot", () => {
    // Including the burst, which does not aim - a ring thrown at an empty arena
    // is noise, and it would also burn a rotation slot the player never sees.
    const s = newRun("normal");
    for (const want of WEAPON_ORDER) {
      while (weaponAt(s.shots) !== want) s.shots += 1;
      s.bolts.length = 0;
      s.fireIn = 0;
      step(s, 16, STILL, rngFor(1));
      expect(s.bolts, `${want} fired at nothing`).toHaveLength(0);
    }
  });
});
