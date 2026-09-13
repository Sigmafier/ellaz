import type { CSSProperties } from "react";

/**
 * The one place that decides how big a board is.
 *
 * WHAT WAS WRONG, measured 2026-09-13 by
 * `scripts/repro/repro-board-fills-the-window.mjs` against the live page:
 *
 *     game        window       board   frame   the box   what happened
 *     survivors   1536 x 639     371     786       519   267px BELOW THE FOLD
 *     match3      1536 x 639     345     639       519   frame scaled to 0.79
 *     sudoku      1536 x 639     281     540       519   frame scaled to 0.93
 *     2048        1920 x 1080    420     607       960   63% of the box, empty
 *
 * Both halves of that are the same bug and neither is "the board is too small".
 * A board sizes against the VIEWPORT and the chrome under it does not, so the
 * total is a number nobody computed: at 639 the vh terms overflow the stage box
 * and `fitStage` shrinks - or gives up and lets the page scroll - while at 1080
 * the px cap binds and two thirds of the box is empty. Raising the caps alone
 * would have made the first half worse.
 *
 * WHAT THIS DOES. A desktop board is sized from the height the stage box
 * actually has, minus the chrome that shares it:
 *
 *     board height = 100dvh - the header - the utility row - this game's chrome
 *     board width  = that height x the board's own ratio
 *
 * so a taller window makes the game BIGGER, which is the thing that was false.
 *
 * THE PHONE ARM IS UNTOUCHED, deliberately and checkably: under 900px the
 * declaration is `min(<vw>vw, <vh>vh, <cap>px)`, the same three terms each game
 * passes today, and the gate asserts the 390px board width per game against the
 * number the old code produced (survivors 359, match3 359, sudoku 367, 2048 343).
 *
 * WHY THE WIDTH IS NOT INLINE. An inline `width` beats any stylesheet rule, so a
 * media query could never override it. The game inlines only the numbers, as
 * custom properties; `.ellaz-board` in `global.css` owns both arms of the
 * policy. That is the whole point - 39 hand-rolled expressions across 20 files
 * had no place to put a desktop branch, which is what `global.css:518` has said
 * since the panel cap was written.
 */

export const BOARD_CLASS = "ellaz-board";

export type BoardSize = {
  /** Share of the viewport WIDTH, on a phone. Unchanged from today. */
  vw: number;
  /**
   * Share of the viewport HEIGHT, on a phone. Unchanged from today. Omitted by
   * an arena whose phone width had no height term (bubbles: `min(94vw, 520px)`)
   * - its height is `h` instead.
   */
  vh?: number;
  /** The phone ceiling, px. Unchanged from today. */
  cap: number;
  /**
   * What this game's own rows cost, in px, above and below the board inside
   * `#game-frame` - the chrome bar, a goal strip, a keypad.
   *
   * MEASURED, never estimated, and the gate asserts it: an arm whose declared
   * chrome is more than 8px from what the page renders fails, because a stale
   * number here silently re-creates the overflow this file exists to remove.
   * Read 2026-09-13 on the live page, identical at all four viewports.
   */
  chrome: number;
  /**
   * width / height of the board itself. 1 for a square board; survivors' arena
   * is 420 x 560, so 0.75.
   */
  ratio?: number;
  /**
   * The desktop ceiling, px. Defaults to what the 1680px game panel leaves
   * after its own 8px padding either side - `game-panel-clears-widest-board.test.ts`
   * is the gate that holds those two numbers together.
   */
  capPc?: number;
  /**
   * A board whose phone HEIGHT is its own expression rather than its width
   * times a ratio - an arena like bubbles, `min(94vw, 520px)` by
   * `min(56vh, 440px)`. On a phone the height is exactly that expression, as
   * before. On a PC it is `auto`, so the `aspect-ratio` the board carries
   * (`ratio`) derives it from the width the policy chose.
   *
   * Omitted for every board whose height already follows its width.
   */
  h?: { vh: number; cap: number };
};

/**
 * What the desktop game panel leaves a board: 1680 - 8px either side.
 *
 * ONE CEILING FOR EVERY GAME since 2026-09-14. It used to be 684 - the 700px
 * panel, which was really a reading width for the controls row - with 1664 as
 * a showcase-only exemption for survivors' landscape arena. The operator ruled
 * that every game has a PC version, so the 700px cap moved onto the row
 * (`global.css`) and every board gets the stage.
 *
 * A square board cannot use it and does not need to: the desktop arm sizes
 * from the height the box really has, so at 1920x1080 a ratio-1 board is
 * bounded near 650px by the window. Only a landscape arena reaches this
 * number, and 1680 is the one measured for that case on 2026-09-13 - a ceiling
 * under the 1638 the height term resolves to decided the size instead of the
 * window. `game-panel-clears-widest-board.test.ts` pins it to the CSS.
 */
export const PANEL_USABLE = 1664;

/** The `min-width` every desktop arm in this repo keys on. Quoted, not chosen. */
export const PC_MIN_WIDTH = 900;

/**
 * Is this run a PC run? Read ONCE, at mount, by a game whose arena SHAPE
 * changes on a PC - never as a live media query.
 *
 * Hoisted out of survivors (2026-09-13) when a second game needed it. The
 * shape is a simulation rule - where things spawn, how far a lane runs - not a
 * CSS box, so a window resized mid-run must not reshape a live run. The 900px
 * is `.ellaz-board`'s own breakpoint, so CSS and simulation give one answer.
 */
export function isPcArena(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(`(min-width: ${PC_MIN_WIDTH}px)`).matches
    : false;
}

/**
 * The custom properties a board declares. Spread into the element's `style`,
 * and put `BOARD_CLASS` on its className - both, or the width comes from
 * nowhere.
 */
export function boardVars(s: BoardSize): CSSProperties {
  return {
    "--b-vw": `${s.vw}vw`,
    // A term that can never bind, for a width that never had a height term -
    // so the phone arm stays the two-term expression it always was.
    "--b-vh": s.vh === undefined ? "100000px" : `${s.vh}vh`,
    "--b-cap": `${s.cap}px`,
    "--b-chrome": `${s.chrome}px`,
    "--b-ratio": String(s.ratio ?? 1),
    "--b-cap-pc": `${s.capPc ?? PANEL_USABLE}px`,
    ...(s.h ? { "--b-h": `min(${s.h.vh}vh, ${s.h.cap}px)`, aspectRatio: String(s.ratio ?? 1) } : {}),
  } as CSSProperties;
}
