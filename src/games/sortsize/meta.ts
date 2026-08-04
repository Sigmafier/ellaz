import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "sortsize",
  title: { he: "גדול וקטן", en: "Big & Small" },
  emoji: "🐘",
  color: "#e17055",
  ageBand: "kids",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
