import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "sort",
  title: { he: "מיון צבעים", en: "Color Sort", es: "Ordenar Colores" },
  emoji: "🧪",
  color: "#8e44ad",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "moves",
};
