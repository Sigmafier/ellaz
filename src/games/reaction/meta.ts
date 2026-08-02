import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "reaction",
  title: { he: "אור ירוק", en: "Green Light" },
  emoji: "🟢",
  color: "#2ecc71",
  ageBand: "kids",
  category: "speed",
  orientation: "any",
  renderer: "dom",
};
