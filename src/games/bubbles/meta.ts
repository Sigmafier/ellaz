import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "bubbles",
  title: { he: "תפסו בועות", en: "Catch the Bubbles" },
  emoji: "🫧",
  color: "#4fc3f7",
  ageBand: "kids",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
