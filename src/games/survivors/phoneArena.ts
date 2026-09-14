import { ARENA, type Arena } from "./logic";

// OUTSIDE `logic.ts` on purpose: the simulation may name `ARENA` exactly twice
// (its declaration and `newRun`'s default), so that every read of the floor
// goes through `s.arena` - `arena-is-a-run-property.test.ts` counts. Picking a
// SHAPE for a run is the renderer's question, asked once at mount, before the
// run exists; it is not a rule the sim applies.

/** The narrowest phone arena, width over height. Taller than this is a corridor. */
const PHONE_MIN_RATIO = 0.4;

/**
 * The PHONE arena: the portrait floor, reshaped to the box it is drawn in.
 *
 * Operator ruling 2026-09-14: *"the game should have a full height experience
 * right now it doesnt take the full mobile height"*. Picked off a real render
 * at 390x844 (hall `20260914-021853`): 359x478 on screen -> 359x775.
 *
 * SAME AREA as `ARENA`, for the reason `ARENA_WIDE` gives: enemies arrive at a
 * rate the clock sets, so more floor is a thinner crowd and a quietly easier
 * game. Only the SHAPE follows the phone.
 *
 * Never WIDER than `ARENA` - a short box keeps today's arena object exactly -
 * and never narrower than `PHONE_MIN_RATIO`. A box that cannot be measured gets
 * `ARENA`, so a zero or NaN from a layout that has not happened yet can never
 * reach the simulation.
 */
export function phoneArena(boxW: number, boxH: number): Arena {
  if (!(boxW > 0 && boxH > 0)) return ARENA;
  const ratio = boxW / boxH;
  if (ratio >= ARENA.w / ARENA.h) return ARENA;
  const r = Math.max(ratio, PHONE_MIN_RATIO);
  const w = Math.round(Math.sqrt(ARENA.w * ARENA.h * r));
  return { w, h: Math.round((ARENA.w * ARENA.h) / w) };
}

/** The PHONE bar's own breakpoint - under it a game page has one 52px bar. */
const PHONE_QUERY = "(max-width: 719px)";

/**
 * The box the arena will be drawn in on THIS page, or null when the phone arena
 * does not apply.
 *
 * Read once at mount, from the same numbers the stylesheet sizes against, so
 * the floor and the drawn box agree: the board's width is `min(92vw, 58vh,
 * 420px)` (the three numbers `SurvivorsGame` hands `boardVars`), and its height
 * is what the stage box leaves once the bars (`--hh`, `--uh`, `--oh`), the
 * panel's `8px 0` padding and fitStage's 16px gutter are paid for.
 *
 * ONLY on an emitted game page (`body[data-page="game"]`) under the phone
 * breakpoint. The standalone bundle, the embed and a PC keep the arena they
 * had, because none of them has the one phone bar this height assumes.
 */
export function phoneBox(win: Window = window): { w: number; h: number } | null {
  const doc = win.document;
  if (doc.body?.dataset.page !== "game") return null;
  if (typeof win.matchMedia !== "function" || !win.matchMedia(PHONE_QUERY).matches) return null;
  const css = win.getComputedStyle(doc.body);
  const px = (name: string) => Number.parseFloat(css.getPropertyValue(name)) || 0;
  const w = Math.min(win.innerWidth * 0.92, win.innerHeight * 0.58, 420);
  // The last 2px is rounding: the arena's whole units and the board's
  // fractional width land the board up to a pixel taller than this box, and a
  // pixel over is enough for fitStage to shrink the whole game (measured
  // 0.9991 at 390x844 without it).
  const h = win.innerHeight - px("--hh") - px("--uh") - px("--oh") - 16 - 16 - 2;
  return { w, h };
}
