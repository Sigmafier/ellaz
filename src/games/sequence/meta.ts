import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "sequence",
  title: { he: "מה בא אחר כך?", en: "What Comes Next" },
  emoji: "🔗",
  color: "#6c5ce7",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
};
