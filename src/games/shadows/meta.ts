import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "shadows",
  title: { he: "צל ותמונה", en: "Shadow Match" },
  // NOT 🌑. The home card draws its icon over a dark surface, so an all-black
  // glyph renders as an empty card — caught by eyeballing the grid, invisible in
  // every test. 🌓 keeps the shadow reading and has a lit half to see.
  emoji: "🌓",
  color: "#b2bec3",
  ageBand: "kids",
  category: "think",
  orientation: "any",
  renderer: "dom",
  scoreUnit: "points",
};
