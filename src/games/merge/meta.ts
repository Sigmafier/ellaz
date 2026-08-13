import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "merge",
  title: { he: "שניים לאחד", en: "Two Make One", es: "Dos en uno" },
  emoji: "🦋",
  color: "#16a085",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // An endless climb, so the honest record is how far a run got - `points`,
  // which `src/sdk/score.ts` ranks high. `logic.ts` is the one place that says
  // so (`scoreReport`), and `score-unit-declared.test.ts` pins the two together.
  scoreUnit: "points",
};
