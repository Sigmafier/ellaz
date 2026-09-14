// The two powers: a dash that fires by itself, and a freeze on the one button.
//
// Operator ruling 2026-09-14, picked off mocks drawn over the live game. Freeze
// is the super: it charges as gems are collected and one tap stops every shape
// for two seconds. Dash is automatic: when a shape would cost a heart and the
// dash is ready, the robot blinks away from it instead, and the dash recharges.
//
// Types only from `logic.ts`, so there is no import cycle.

import type { RunState } from "./logic";
import { clampToWorld } from "./world";

/** How long the dash takes to come back after it has saved you. */
export const DASH_MS = 8000;
/** How far the blink carries you, in world units - clear of a runner's reach. */
export const DASH_DIST = 70;
/** Gem value that fills the freeze. A runner is worth 1, an orb 2, a brute 4. */
export const FREEZE_NEED = 30;
/** How long everything stays frozen. "Two seconds" was the ruling. */
export const FREEZE_MS = 2000;

const unit = (v: number) => Math.max(0, Math.min(1, v));

/** 1 when the dash is ready, rising from 0 while it recharges. For the HUD chip. */
export const dashReady = (s: Pick<RunState, "dashCd">): number => unit(1 - s.dashCd / DASH_MS);

/** How full the freeze is, 0..1. For the ring around the button. */
export const chargeOf = (s: Pick<RunState, "charge">): number => unit(s.charge / FREEZE_NEED);

export function canFreeze(s: Pick<RunState, "phase" | "choosing" | "frozen" | "charge">): boolean {
  return s.phase === "playing" && !s.choosing && s.frozen <= 0 && s.charge >= FREEZE_NEED;
}

/**
 * The button. Returns whether it did anything, so the scene plays the moment
 * only when it really happened - a tap on an empty ring is not a freeze.
 */
export function triggerFreeze(s: RunState): boolean {
  if (!canFreeze(s)) return false;
  s.frozen = FREEZE_MS;
  s.charge = 0;
  return true;
}

/** Count both clocks down. Called once per simulated frame. */
export function tickPowers(s: Pick<RunState, "dashCd" | "frozen">, dt: number) {
  if (s.dashCd > 0) s.dashCd = Math.max(0, s.dashCd - dt);
  if (s.frozen > 0) s.frozen = Math.max(0, s.frozen - dt);
}

/**
 * Blink away from the point a hit came from. `r` is the robot's radius, so the
 * landing spot is clear of the walls. Straight away from the shape, because a
 * dash that could land you on the far side of it would carry you into the crowd
 * that shape was leading.
 */
export function dashAway(s: RunState, fromX: number, fromY: number, r: number): { x: number; y: number } {
  let dx = s.x - fromX;
  let dy = s.y - fromY;
  let len = Math.hypot(dx, dy);
  if (len < 0.001) {
    dx = 1;
    dy = 0;
    len = 1;
  }
  const from = { x: s.x, y: s.y };
  const to = clampToWorld(s, s.x + (dx / len) * DASH_DIST, s.y + (dy / len) * DASH_DIST, r);
  s.x = to.x;
  s.y = to.y;
  s.dashCd = DASH_MS;
  return from;
}
