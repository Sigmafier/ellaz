import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// Not the snake game, and not a hidden-object game either. `snake` steers a
// moving thing on a clock; this one moves nothing until a child taps, and the
// space itself is the puzzle rather than an empty field. `hidden` and
// `finddiff` are about LOOKING - everything here is visible from the first
// frame and the whole question is which order to collect it in. The header of
// `logic.ts` carries the full comparison.
//
// The mouse, the crumbs and the burrow are ours, and generic: a maze is as old
// as mazes, and nothing here quotes anybody's characters or colours.
export const meta: GameMeta = {
  id: "maze",
  title: { he: "הדרך הביתה", en: "Way Home", es: "El camino a casa" },
  emoji: "🐭",
  // A hedge green nothing else in the roster uses - the bright greens belong to
  // frog, reaction and vanish, and this one is deep enough that the white ink
  // `inkFor` picks clears the 4.5 floor at 4.72 (`ui/contrast.test.ts`).
  color: "#1e8449",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // Points: perfect mazes finished in a row. NOT fewest steps - every maze is
  // dealt fresh, so a step count would measure which maze a player was handed
  // as much as how they played it. The unit is declared HERE because only the
  // VALUE of a record is persisted; `score-unit-declared.test.ts` pins this to
  // the `unit:` logic.ts reports, so a wrong one fails the build rather than
  // ordering this board backwards in silence.
  scoreUnit: "points",
};
