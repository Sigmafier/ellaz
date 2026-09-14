// The weapon slots, and where the two weapons that are not projectiles stand.
//
// Operator ruling 2026-09-14: pick one of three on the entrance, carry up to
// four, and new weapons arrive as level-up cards. Orbiting blades and a helper
// drone are WEAPONS, so they take a slot - five exist, four fit, and one never
// makes it into a given run.
//
// Types only from `logic.ts`, so there is no import cycle. The scene reads the
// geometry below to draw exactly where the simulation hits.

import type { RunState, WeaponId } from "./logic";

/** How many weapons a run can carry. */
export const SLOTS_MAX = 4;

/** The three a run can START with - the ones on the entrance screen. */
export const STARTERS = ["bolt", "arc", "burst"] as const satisfies readonly WeaponId[];
export type StarterId = (typeof STARTERS)[number];

/** Every weapon a level-up can offer, in the order the art and the words list them. */
export const POOL: readonly WeaponId[] = ["bolt", "arc", "burst", "blades", "drone"];

/**
 * A stored starting weapon, validated rather than trusted. Anything that is not
 * one of the three reads as never chosen - the same discipline the stick style
 * and `session.ts` apply to a value this app did not write this session.
 */
export const asStarter = (v: unknown): StarterId =>
  (STARTERS as readonly unknown[]).includes(v) ? (v as StarterId) : "bolt";

/**
 * The blades. They never fire: they turn around the robot and cut whatever they
 * touch, and each shape can be cut by them at most once per `hitMs`, or a brute
 * standing in the ring would lose all its health in the frames it overlaps.
 */
export const BLADES = { count: 3, radius: 44, spin: 3.2, r: 9, hitMs: 420 } as const;

/** The drone circles slowly at the robot's shoulder and shoots from where IT is. */
export const DRONE = { radius: 34, spin: 1.1 } as const;

export const holds = (s: Pick<RunState, "slots">, id: WeaponId): boolean => s.slots.some((k) => k.id === id);

/**
 * Where each blade is, in world units. `spread` adds a blade rather than fanning
 * a shot, because a ring has no fan - the same reading the burst already gives it.
 */
export function bladePositions(s: Pick<RunState, "x" | "y" | "bladeAngle" | "up">): { x: number; y: number; a: number }[] {
  const n = BLADES.count + s.up.spread;
  const out: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = s.bladeAngle + (i / n) * Math.PI * 2;
    out.push({ x: s.x + Math.cos(a) * BLADES.radius, y: s.y + Math.sin(a) * BLADES.radius, a });
  }
  return out;
}

export function dronePosition(s: Pick<RunState, "x" | "y" | "droneAngle">): { x: number; y: number } {
  return { x: s.x + Math.cos(s.droneAngle) * DRONE.radius, y: s.y + Math.sin(s.droneAngle) * DRONE.radius };
}
