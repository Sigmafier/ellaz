import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// The name and the piece set are ours. The falling-block MECHANIC is old and
// free; the seven famous four-cell pieces in their famous colours are trade
// dress, so this game ships a mixed three-to-five-cell set from the platform's
// own palette and is called what it is. See CLAUDE.md § Legal.
export const meta: GameMeta = {
  id: "blocks",
  title: { he: "קוביות נופלות", en: "Falling Blocks" },
  emoji: "🧱",
  color: "#6d4bd6",
  ageBand: "all",
  category: "classics",
  orientation: "portrait",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
