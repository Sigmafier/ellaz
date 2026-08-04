import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "hidden",
  title: { he: "מצא אותי", en: "Find Me" },
  emoji: "👀",
  color: "#a29bfe",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
