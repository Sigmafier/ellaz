import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "snake",
  title: { he: "נחש", en: "Snake", es: "Snake" },
  emoji: "🐍",
  color: "#55efc4",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "phaser",
  ownsChrome: true,
  scoreUnit: "points",
};
