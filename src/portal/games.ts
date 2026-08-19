import type { GameMeta } from "@sdk/index";

// Each game's metadata lives in its own DOM-free `meta.ts`. They are imported
// statically here so the home grid renders instantly without pulling any game
// code (or React, or Phaser) into the shell bundle.
import { meta as memory } from "../games/memory/meta";
import { meta as coloring } from "../games/coloring/meta";
import { meta as finddiff } from "../games/finddiff/meta";
import { meta as hidden } from "../games/hidden/meta";
import { meta as math } from "../games/math/meta";
import { meta as n2048 } from "../games/n2048/meta";
import { meta as tictactoe } from "../games/tictactoe/meta";
import { meta as minesweeper } from "../games/minesweeper/meta";
import { meta as sudoku } from "../games/sudoku/meta";
import { meta as snake } from "../games/snake/meta";
import { meta as sequence } from "../games/sequence/meta";
import { meta as vanish } from "../games/vanish/meta";
import { meta as shadows } from "../games/shadows/meta";
import { meta as echo } from "../games/echo/meta";
import { meta as evolve } from "../games/evolve/meta";
import { meta as balloons } from "../games/balloons/meta";
import { meta as bubbles } from "../games/bubbles/meta";
import { meta as bees } from "../games/bees/meta";
import { meta as frog } from "../games/frog/meta";
import { meta as reaction } from "../games/reaction/meta";
import { meta as blocks } from "../games/blocks/meta";
import { meta as wordguess } from "../games/wordguess/meta";
import { meta as sort } from "../games/sort/meta";
import { meta as merge } from "../games/merge/meta";
import { meta as pet } from "../games/pet/meta";
import { meta as fit } from "../games/fit/meta";
import { meta as music } from "../games/music/meta";
import { meta as maze } from "../games/maze/meta";
import { meta as letters } from "../games/letters/meta";
import { meta as spell } from "../games/spell/meta";
import { meta as bubbleshooter } from "../games/bubbleshooter/meta";
import { meta as match3 } from "../games/match3/meta";
import { meta as jigsaw } from "../games/jigsaw/meta";

/**
 * The roster, in the order the home grid renders it.
 *
 * WHY THIS IS NOT IN `catalog.ts`
 * `catalog.ts` pairs each game with a `() => import(...)` loader, so importing
 * it drags the whole lazy-game graph along. The build-time page emitter
 * (`src/build/**`) needs the METADATA and must never touch game code - it runs
 * in Node, inside `vite.config.ts`, where a stray `import("../games/snake")`
 * would try to load Phaser at config time.
 *
 * So the roster lives here, importing nothing but 21 DOM-free `meta.ts` files
 * and a type. `catalog.ts` attaches the loaders on top; the emitter reads this
 * directly. One ordering, two consumers, no duplicate list to drift.
 */
export const GAMES: ReadonlyArray<GameMeta> = [
  memory,
  evolve,
  coloring,
  finddiff,
  hidden,
  math,
  n2048,
  tictactoe,
  minesweeper,
  sudoku,
  snake,
  blocks,

  // The first game here that a player has to be able to READ, so its `ageBand`
  // is "all" - a five-year-old cannot play it - and it sits outside the kids
  // block above.
  wordguess,

  // Wave 1 - the pre-reading kids catalog, under `think`.
  sequence,
  vanish,
  shadows,
  echo,

  // Wave 2 - the tap-the-moving-target cluster, all three on the shared
  // spawner (`@shared/spawn`). `bees` is the first game in the `speed`
  // section, which until then was declared in CATEGORY_ORDER but empty.
  balloons,
  bubbles,
  bees,
  frog,
  // `reaction` is the one Wave 2 game that does NOT use the shared spawner, on
  // purpose: there is a single light, it never moves and never expires, and the
  // quantity that matters is a timestamp - none of which the spawner models.
  reaction,

  // Wave 3 - the two mechanics the 2026 market data actually rewards, both
  // under `think`, both tap-only and both readable without a word of text.
  // `sort` is a finite puzzle that ends; `merge` is an endless climb, so their
  // reward shapes differ (`level_complete` vs `milestone` + a latched
  // `personal_best`) even though they arrived together.
  sort,
  merge,

  // Wave 4 - the two the 2026 market data rewards that Wave 3 did not cover:
  // something to come back TO rather than finish, and a calm placement puzzle
  // to sit beside the falling-block one. Both tap-only.
  //
  // `pet` is the first game here with no failure state at all - it cannot get
  // sick, hungry or sad however long it is left, which is why its record only
  // counts how big it has grown and can never go down. `fit` shares only
  // "polyomino on a grid" with `blocks`: nothing falls, nothing is timed, and
  // columns clear as well as rows, which is the comparison written into the
  // head of its own `logic.ts` so nobody re-derives it.
  //
  // Appended, so both land in the LAZY half of the card art by construction -
  // see `SHELL_ART_COUNT` in `src/ui/gameArt.ts`. That is the whole reason a new
  // game no longer costs the first visit its picture.
  pet,
  fit,

  // Wave 5. `music` is the FIRST game ever in the `create` category - that
  // section has been declared in CATEGORY_ORDER since the beginning and has
  // never rendered, because nothing was in it. `maze` is the first game about
  // planning a route: a tap names a DESTINATION and the mouse walks it, so the
  // difficulty is choosing an order rather than hitting a small square.
  //
  // Appended like every wave before it, so both land in the lazy half of the
  // card art and neither costs the first visit its picture.
  music,
  maze,

  // Wave 6. `letters` is the FIRST game ever in the `learn` category - declared
  // in CATEGORY_ORDER from the start and never rendered, exactly as `create`
  // waited for `music` and `speed` for `bees`. A picture is shown and the child
  // taps the letter its word begins with; an in-game toggle switches the letters
  // between languages, so a Hebrew reader can practise the English alphabet
  // without changing the interface. Appended, so its card art stays lazy.
  letters,

  // Wave 7. `spell` is the second game in `learn` and the step up from
  // `letters`: the same picture-first design and the same content-language
  // toggle, but the child builds the WHOLE word from a tray of tiles rather
  // than choosing its first letter. A wrong tile is never placed, so the word
  // on screen is correct at every moment, and a hint button fills the first
  // letter still unknown - the way out of being stuck, which a four-year-old
  // needs more than they need a score. Appended, so its card art stays lazy.
  spell,

  // Wave 8. `bubbleshooter` is the arcade shape this catalogue had no answer to:
  // the only game here where a shot TRAVELS, bounces off a wall and lands
  // somewhere the player predicted. It is the second game in `classics` to be
  // drawn on a canvas and the FIRST to do it with no engine at all - a full
  // board is 115 circles, three orders of magnitude under where sprite batching
  // starts to pay, and `logic.ts` solves each shot in one call rather than
  // stepping a simulation, so there is no fixed timestep to match a display to.
  // Appended, so its card art stays lazy.
  bubbleshooter,

  // Wave 9. `match3` is the swap-three shape - the most recognised casual
  // mechanic there is, and the one this catalogue had no answer to: `merge`
  // combines two into one and `bubbleshooter` fires at a ceiling, but nothing
  // here let a child trade two neighbours and watch a column fall. It is a
  // kids game rather than a classic because there is no clock and no way to
  // lose: the board is guaranteed to always hold a legal move, so the only
  // thing a round asks for is looking. Appended, so its card art stays lazy.
  match3,

  // Wave 9. `jigsaw` cuts this catalogue's OWN key art into pieces, which is
  // why it needed no new drawing: every scene is already built from one shared
  // vocabulary and already in the shell, so the game costs a picture list and
  // nothing else. Tap a piece, tap where it goes - a wrong space accepts the
  // piece, because trying one somewhere and seeing that it does not belong IS
  // the puzzle. Appended, so its card art stays lazy.
  jigsaw,
];

export function metaFor(id: string): GameMeta | undefined {
  return GAMES.find((m) => m.id === id);
}
