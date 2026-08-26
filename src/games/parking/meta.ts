import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// `scoreUnit` is "moves" and it is pinned to what the renderer actually reports
// by `score-unit-declared.test.ts`. Only the NUMBER of a personal best is ever
// persisted, so the leaderboards read this to decide that fewer wins; a wrong
// one here would order this game's whole board backwards in silence.
export const meta: GameMeta = {
  id: "parking",
  title: { he: "לצאת מהחניון", en: "Escape the Jam", es: "Salir del Atasco" },
  emoji: "🚗",
  color: "#f39c12",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "moves",
};
