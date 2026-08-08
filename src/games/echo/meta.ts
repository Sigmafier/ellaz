import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "echo",
  title: { he: "חזרו אחריי", en: "Follow Me" },
  emoji: "💡",
  color: "#fdcb6e",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
