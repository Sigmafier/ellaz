import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "sudoku",
  title: { he: "סודוקו", en: "Sudoku" },
  emoji: "🔡",
  color: "#0984e3",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "ms",
};
