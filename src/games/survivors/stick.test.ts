// The joystick's maths, pinned.
//
// WHY THIS FILE IS WORTH ITS BYTES. The stick replaces the four-arrow pad as the
// ONLY way a phone player steers this game, so every defect here is a game that
// cannot be played at all rather than one that plays badly. The first test below
// covers the failure that would do it: a thumb resting exactly on the stick's
// origin divides by zero, and a NaN in the steering vector puts the robot at
// NaN,NaN - off the board, unrecoverable, on the FIRST frame of every tap.
import { describe, expect, it } from "vitest";
import { STICK_DEADZONE, STICK_RADIUS, knobAt, originFor, stickVector } from "./stick";

const ARENA = { w: 420, h: 560 };

describe("the stick asks for a direction", () => {
  it("a thumb exactly on the origin is a true zero, never NaN", () => {
    const v = stickVector({ ox: 100, oy: 100, px: 100, py: 100 });
    expect(v).toEqual({ dx: 0, dy: 0 });
    expect(Number.isNaN(v.dx)).toBe(false);
    expect(Number.isNaN(v.dy)).toBe(false);
  });

  it("holds still inside the deadzone, and moves just outside it", () => {
    const inside = stickVector({ ox: 100, oy: 100, px: 100 + STICK_DEADZONE - 1, py: 100 });
    expect(inside).toEqual({ dx: 0, dy: 0 });
    // THE CONTROL: without this the test above is satisfied by a stick that
    // never moves at all, which is exactly the bug it is meant to catch.
    const outside = stickVector({ ox: 100, oy: 100, px: 100 + STICK_DEADZONE + 4, py: 100 });
    expect(outside.dx).toBeGreaterThan(0);
  });

  it("points where the thumb points", () => {
    const right = stickVector({ ox: 50, oy: 50, px: 120, py: 50 });
    expect(right.dx).toBeGreaterThan(0);
    expect(Math.abs(right.dy)).toBeLessThan(1e-9);

    const up = stickVector({ ox: 50, oy: 50, px: 50, py: -20 });
    expect(up.dy).toBeLessThan(0);
    expect(Math.abs(up.dx)).toBeLessThan(1e-9);
  });

  it("never asks for more than full tilt, however far the thumb goes", () => {
    const far = stickVector({ ox: 0, oy: 0, px: 4000, py: 4000 });
    expect(Math.hypot(far.dx, far.dy)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("a diagonal is not faster than a straight push", () => {
    // `logic.ts` normalises the vector, so this cannot affect speed today - it
    // is pinned because the moment someone reads magnitude as speed, an
    // unclamped diagonal is 1.41x and the oldest bug in the genre is back.
    const straight = stickVector({ ox: 0, oy: 0, px: STICK_RADIUS, py: 0 });
    const diagonal = stickVector({ ox: 0, oy: 0, px: STICK_RADIUS, py: STICK_RADIUS });
    expect(Math.hypot(diagonal.dx, diagonal.dy)).toBeLessThanOrEqual(
      Math.hypot(straight.dx, straight.dy) + 1e-9,
    );
  });
});

describe("the knob is drawn where the thumb is, until the ring stops it", () => {
  it("follows the thumb inside the ring", () => {
    const k = knobAt({ ox: 100, oy: 100, px: 110, py: 104 });
    expect(k).toEqual({ x: 110, y: 104 });
  });

  it("pins to the ring once the thumb is outside it, keeping the direction", () => {
    const k = knobAt({ ox: 0, oy: 0, px: 900, py: 0 });
    expect(k.x).toBeCloseTo(STICK_RADIUS, 6);
    expect(k.y).toBeCloseTo(0, 6);
    expect(Math.hypot(k.x, k.y)).toBeCloseTo(STICK_RADIUS, 6);
  });

  it("a thumb on the origin does not throw or land at NaN", () => {
    const k = knobAt({ ox: 7, oy: 9, px: 7, py: 9 });
    expect(k).toEqual({ x: 7, y: 9 });
  });
});

describe("the two styles differ only in where the stick is born", () => {
  it("the tap style is born under the thumb", () => {
    expect(originFor("tap", 137, 201, ARENA)).toEqual({ ox: 137, oy: 201 });
  });

  it("the corner style ignores the thumb and sits in one place", () => {
    const a = originFor("corner", 137, 201, ARENA);
    const b = originFor("corner", 12, 500, ARENA);
    expect(a).toEqual(b);
  });

  it("the corner stick's whole ring is inside the arena", () => {
    // A ring half off the board is a control a thumb cannot complete, which is
    // the same defect as having no control at all.
    const { ox, oy } = originFor("corner", 0, 0, ARENA);
    expect(ox - STICK_RADIUS).toBeGreaterThanOrEqual(0);
    expect(oy + STICK_RADIUS).toBeLessThanOrEqual(ARENA.h);
    expect(ox + STICK_RADIUS).toBeLessThanOrEqual(ARENA.w);
  });
});
