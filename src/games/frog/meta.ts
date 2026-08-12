import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "frog",
  title: { he: "תפסו את הצפרדע", en: "Catch the Frog", es: "Atrapa la rana" },
  emoji: "🐸",
  color: "#5bc236",
  ageBand: "kids",
  category: "speed",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
