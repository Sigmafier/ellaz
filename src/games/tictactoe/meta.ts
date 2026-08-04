import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "tictactoe",
  title: { he: "איקס עיגול", en: "Tic-Tac-Toe" },
  emoji: "⭕",
  color: "#74b9ff",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
