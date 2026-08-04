import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "minesweeper",
  title: { he: "שולה מוקשים", en: "Minesweeper" },
  emoji: "💣",
  color: "#636e72",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "ms",
};
