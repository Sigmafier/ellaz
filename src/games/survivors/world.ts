// The big map: how large the floor is, where the camera looks, and where a new
// shape may enter. Pure arithmetic over the run - no DOM, no Phaser, no values
// imported from `logic.ts` (types only), so there is no import cycle and every
// function here can be driven in node.
//
// Operator ruling 2026-09-14, picked off mocks drawn over the live game: *"map
// to go to the sides"* - a big map, the camera follows the robot, walls at the
// far edges, and the scenery is decoration you walk over rather than obstacles.

import type { Arena, RunState } from "./logic";

/**
 * How many VIEWS wide and tall the floor is. "About three screens" was the
 * ruling; three exactly keeps the arithmetic legible and puts the start, which
 * is the middle of the world, one full screen from every wall.
 */
export const WORLD_SCALE = 3;

/** The band at the world's edge that is drawn as a wall and that nothing crosses. */
export const WALL = 10;

/** How far outside the view a shape is born, so it walks in rather than appearing. */
const ENTRY_MARGIN = 26;

type Placed = Pick<RunState, "x" | "y" | "arena" | "world">;

/**
 * The floor for a view. The VIEW is still `run.arena` - the canvas is sized from
 * it and every tuning figure about what a player can see was taken against it -
 * so the world is derived from the view rather than chosen separately. A phone's
 * tall view makes a tall world, a PC's wide view a wide one.
 */
export const worldFor = (view: Arena): Arena => ({ w: view.w * WORLD_SCALE, h: view.h * WORLD_SCALE });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The top-left of what the player sees, in world units.
 *
 * DERIVED, never stored: the camera is a function of where the robot stands, so
 * a second record of it could only ever disagree with the first. Clamped to the
 * world, so near a wall the robot walks off-centre instead of the view showing
 * nothing past the edge - that is how a player can see the wall at all.
 */
export function cameraOf(s: Placed): { x: number; y: number } {
  return {
    x: clamp(s.x - s.arena.w / 2, 0, Math.max(0, s.world.w - s.arena.w)),
    y: clamp(s.y - s.arena.h / 2, 0, Math.max(0, s.world.h - s.arena.h)),
  };
}

/** Is a point inside the view, grown by `pad` on every side? */
export function inView(s: Placed, x: number, y: number, pad = 0): boolean {
  const c = cameraOf(s);
  return x >= c.x - pad && x <= c.x + s.arena.w + pad && y >= c.y - pad && y <= c.y + s.arena.h + pad;
}

/**
 * A point just outside the VIEW, on a random edge, and inside the world.
 *
 * Relative to the camera rather than the world, because a shape born at the far
 * wall of a three-screen floor would take a minute to arrive and the crowd the
 * clock was tuned to send would never reach the player. Near a wall one edge of
 * the view has no world behind it; a point there would be clamped back onto the
 * screen and pop into existence in plain sight, so that edge is skipped.
 *
 * `rng` is called twice per attempt, which is what keeps the same seed playing
 * the same run.
 */
export function spawnPoint(rng: () => number, s: Placed): { x: number; y: number } {
  const c = cameraOf(s);
  const v = s.arena;
  let first: { x: number; y: number } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const edge = Math.floor(rng() * 4);
    const t = rng();
    const p =
      edge === 0 ? { x: c.x + t * v.w, y: c.y - ENTRY_MARGIN }
      : edge === 1 ? { x: c.x + t * v.w, y: c.y + v.h + ENTRY_MARGIN }
      : edge === 2 ? { x: c.x - ENTRY_MARGIN, y: c.y + t * v.h }
      : { x: c.x + v.w + ENTRY_MARGIN, y: c.y + t * v.h };
    const q = { x: clamp(p.x, WALL, s.world.w - WALL), y: clamp(p.y, WALL, s.world.h - WALL) };
    first ??= q;
    if (!inView(s, q.x, q.y)) return q;
  }
  return first!;
}

/**
 * Has a shape fallen more than a whole view behind the view, on any side?
 *
 * WHY THIS EXISTS AT ALL. On one room nothing could be left behind. On a big map
 * a player who walks away leaves the crowd trailing, and the enemy cap fills with
 * shapes a screen and a half away that will never reach anyone - so the clock
 * keeps sending a crowd that no longer arrives, and the game quietly gets easier
 * the more you walk. Walking those back in keeps the pressure the clock was tuned to.
 */
export function isLeftBehind(s: Placed, x: number, y: number): boolean {
  return !inView(s, x, y, Math.max(s.arena.w, s.arena.h));
}

/** Hold a point inside the walls, `r` units clear of them. */
export function clampToWorld(s: Pick<RunState, "world">, x: number, y: number, r: number): { x: number; y: number } {
  return {
    x: clamp(x, WALL + r, s.world.w - WALL - r),
    y: clamp(y, WALL + r, s.world.h - WALL - r),
  };
}
