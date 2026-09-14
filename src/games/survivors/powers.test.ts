// The two powers, pinned by behaviour. Operator ruling 2026-09-14: dash fires by
// itself and saves you from a hit; freeze is the one button, charged by gems.
import { describe, expect, it } from "vitest";
import { KINDS, newRun, rngFor, step, type EnemyKind, type RunState } from "./logic";
import { DASH_DIST, DASH_MS, FREEZE_MS, FREEZE_NEED, canFreeze, chargeOf, dashReady, triggerFreeze } from "./powers";
import { WALL } from "./world";

const STILL = { dx: 0, dy: 0 };

function place(s: RunState, kind: EnemyKind, x: number, y: number) {
  const e = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

/** A run whose guns are silent, so a shape placed on the robot really reaches it. */
function quiet(): RunState {
  const s = newRun("normal");
  for (const k of s.slots) k.cd = 9_000;
  return s;
}

describe("the dash fires by itself and saves one hit", () => {
  it("is ready at the start of a run", () => {
    const s = newRun("normal");
    expect(s.dashCd).toBe(0);
    expect(dashReady(s)).toBe(1);
  });

  it("a hit that would cost a heart blinks you away instead", () => {
    const s = quiet();
    const x0 = s.x;
    place(s, "runner", s.x - 5, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(3);
    expect(s.events.some((e) => e.type === "dash")).toBe(true);
    expect(s.events.some((e) => e.type === "hurt")).toBe(false);
    // AWAY from the shape, which came from the left, by the dash's distance.
    expect(s.x - x0).toBeCloseTo(DASH_DIST, 0);
    expect(s.dashCd).toBe(DASH_MS);
    expect(dashReady(s)).toBe(0);
  });

  it("THE CONTROL: with the dash recharging, the same hit costs a heart", () => {
    const s = quiet();
    s.dashCd = 3_000;
    place(s, "runner", s.x - 5, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.hp).toBe(2);
    expect(s.events.some((e) => e.type === "hurt")).toBe(true);
    expect(s.events.some((e) => e.type === "dash")).toBe(false);
  });

  it("recharges on the clock and is ready again after DASH_MS", () => {
    const s = quiet();
    s.dashCd = DASH_MS;
    for (let i = 0; i < Math.ceil(DASH_MS / 16) + 1; i++) {
      for (const k of s.slots) k.cd = 9_000;
      s.enemies.length = 0;
      s.spawnIn = 9_999;
      step(s, 16, STILL, rngFor(1));
    }
    expect(s.dashCd).toBe(0);
  });

  it("never blinks you through a wall", () => {
    const s = quiet();
    s.x = WALL + 14;
    place(s, "runner", s.x + 5, s.y);
    step(s, 16, STILL, rngFor(1));
    expect(s.events.some((e) => e.type === "dash")).toBe(true);
    expect(s.x).toBeGreaterThanOrEqual(WALL);
  });
});

describe("the freeze is charged by gems and stops every shape", () => {
  it("cannot be used before it is full, and a tap on an empty ring does nothing", () => {
    const s = newRun("normal");
    expect(canFreeze(s)).toBe(false);
    expect(triggerFreeze(s)).toBe(false);
    expect(s.frozen).toBe(0);
  });

  it("fills from the same gems as levelling, and stops at full", () => {
    const s = newRun("normal");
    s.gems.push({ id: 900, x: s.x, y: s.y, value: FREEZE_NEED + 12 });
    step(s, 16, STILL, rngFor(1));
    expect(s.charge).toBe(FREEZE_NEED);
    expect(chargeOf(s)).toBe(1);
  });

  it("frozen shapes do not move, do not hurt, and nothing new arrives", () => {
    const s = quiet();
    s.charge = FREEZE_NEED;
    expect(triggerFreeze(s)).toBe(true);
    expect(s.frozen).toBe(FREEZE_MS);
    expect(s.charge).toBe(0);

    const walker = place(s, "runner", s.x + 90, s.y);
    const onYou = place(s, "runner", s.x, s.y);
    const count = s.enemies.length;
    s.spawnIn = 1;
    for (let i = 0; i < 30; i++) {
      for (const k of s.slots) k.cd = 9_000;
      step(s, 16, STILL, rngFor(1));
    }
    expect(walker.x).toBe(s.x + 90);
    expect(s.hp).toBe(3);
    expect(onYou.hp).toBe(KINDS.runner.hp);
    expect(s.enemies.length).toBe(count);
  });

  it("THE CONTROL: the same frames unfrozen, the walker walks and the one on you is spent", () => {
    const s = quiet();
    s.dashCd = 9_000;
    const walker = place(s, "runner", s.x + 90, s.y);
    place(s, "runner", s.x, s.y);
    for (let i = 0; i < 30; i++) {
      for (const k of s.slots) k.cd = 9_000;
      step(s, 16, STILL, rngFor(1));
    }
    expect(walker.x).toBeLessThan(s.x + 90);
    expect(s.hp).toBe(2);
  });

  it("thaws after FREEZE_MS", () => {
    const s = quiet();
    s.charge = FREEZE_NEED;
    triggerFreeze(s);
    for (let i = 0; i < Math.ceil(FREEZE_MS / 16) + 1; i++) step(s, 16, STILL, rngFor(1));
    expect(s.frozen).toBe(0);
  });

  it("cannot be used while choosing an upgrade", () => {
    const s = newRun("normal");
    s.charge = FREEZE_NEED;
    s.choosing = true;
    expect(triggerFreeze(s)).toBe(false);
  });
});
