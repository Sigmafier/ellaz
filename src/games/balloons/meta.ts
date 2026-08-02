import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "balloons",
  title: { he: "פוצצו בלונים", en: "Pop the Balloons" },
  emoji: "🎈",
  color: "#ff5a5f",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
};
