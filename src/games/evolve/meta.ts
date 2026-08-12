import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "evolve",
  title: { he: "התפתחות", en: "Evolution", es: "Evolución" },
  emoji: "🦖",
  color: "#00cec9",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
