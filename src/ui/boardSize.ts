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
  /** Share of the viewport HEIGHT, on a phone. Unchanged from today. */
  vh: number;
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
   * The desktop ceiling, px. Defaults to what the 700px game panel leaves after
   * its own 8px padding either side - `game-panel-clears-widest-board.test.ts`
   * is the gate that holds those two numbers together.
   */
  capPc?: number;
};

/** The panel is capped at 700 on a desktop and spends 8px each side. */
export const PANEL_USABLE = 684;

/**
 * The same arithmetic for a SHOWCASE game's wider panel: 1680 - 8px either side.
 *
 * A second ceiling exists because 700px is a READING width. It is the right cap
 * for a document page with a board on it, and it is the wrong cap for a game
 * whose arena is landscape: measured 2026-09-13 at 1920x1080, a 16:9 board held
 * to 684px draws 684 x 384, while the portrait board it replaces drew 565 x 753
 * - so the landscape ruling inside a 700px panel would have been a 38% cut in
 * visible battlefield sold as an improvement.
 *
 * IT IS A BAND, NEVER A GAME. The wider panel is worn by whatever renders
 * `ArcadeChrome`, which is selected on `meta.tier === "showcase"` - so this is
 * the same population as the HUD and the entrance screen, not a survivors
 * exemption. `game-panel-clears-widest-board.test.ts` checks each game against
 * the ceiling its own band actually gets.
 */
export const PANEL_USABLE_WIDE = 1664;

/**
 * The custom properties a board declares. Spread into the element's `style`,
 * and put `BOARD_CLASS` on its className - both, or the width comes from
 * nowhere.
 */
export function boardVars(s: BoardSize): CSSProperties {
  return {
    "--b-vw": `${s.vw}vw`,
    "--b-vh": `${s.vh}vh`,
    "--b-cap": `${s.cap}px`,
    "--b-chrome": `${s.chrome}px`,
    "--b-ratio": String(s.ratio ?? 1),
    "--b-cap-pc": `${s.capPc ?? PANEL_USABLE}px`,
  } as CSSProperties;
}
