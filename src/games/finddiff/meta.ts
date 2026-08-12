import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "finddiff",
  title: { he: "מצא הבדלים", en: "Find Differences", es: "Busca las diferencias" },
  emoji: "🔍",
  color: "#00cec9",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
