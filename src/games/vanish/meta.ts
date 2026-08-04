import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "vanish",
  title: { he: "מה נעלם?", en: "What Disappeared" },
  emoji: "🫥",
  color: "#00b894",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
