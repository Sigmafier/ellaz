import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "bees",
  title: { he: "רק דבורים", en: "Bees Only", es: "Solo abejas" },
  emoji: "🐝",
  color: "#f6b93b",
  ageBand: "kids",
  category: "speed",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
