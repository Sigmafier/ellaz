import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// `kids` and `kids`: there is nothing to read, nothing to lose and no clock,
// and the six-piece cut is finishable by a three-year-old. It sits in the kids
// section rather than in `think` because the skill is looking at a picture
// rather than planning ahead.
export const meta: GameMeta = {
  id: "jigsaw",
  title: { he: "פאזל", en: "Jigsaw", es: "Rompecabezas" },
  emoji: "🧩",
  color: "#17798F",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // Placements, and FEWER is better - `src/sdk/score.ts` ranks `moves` low. A
  // perfect solve is exactly one placement per piece. Only the VALUE of a
  // record is ever persisted, never the unit, so this line is what tells the
  // leaderboard which end of the list is the good end, and
  // `score-unit-declared.test.ts` holds it against what `logic.ts` reports.
  scoreUnit: "moves",
};
