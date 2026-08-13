import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// Not the falling-block game. `blocks` is gravity on a clock; this one never
// moves until a child taps, columns clear as well as rows, and the shapes
// cannot be turned - so the skill is looking ahead rather than reacting. The
// header of `logic.ts` carries the whole comparison.
export const meta: GameMeta = {
  id: "fit",
  title: { he: "צורות מתאימות", en: "Shape Fit", es: "Encaja Formas" },
  emoji: "🔷",
  color: "#2d6cdf",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // Points: cells placed, plus a super-linear bonus for lines cleared together.
  // The unit is declared HERE because only the VALUE of a record is persisted -
  // `score-unit-declared.test.ts` pins this to the `unit:` logic.ts reports, so
  // a wrong one fails the build rather than ordering this board backwards.
  scoreUnit: "points",
};
