import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal roster imports this statically so the home grid
// renders without pulling React or Phaser into the shell bundle.
//
// `ageBand: "all"` rather than "kids", and that is a judgement rather than a
// formality: a five-year-old can steer it, but the crowd at two minutes is not
// for them. Nothing is gated on the band - it says who the game is FOR, which is
// the field the outside world reads.
export const meta: GameMeta = {
  id: "survivors",
  title: { he: "הישרדות ניאון", en: "Neon Survival", es: "Supervivencia Neón" },
  emoji: "🛸",
  color: "#5B4AE0",
  ageBand: "all",
  category: "speed",
  orientation: "any",
  renderer: "phaser",
  tier: "showcase",
  ownsChrome: true,
  scoreUnit: "points",
};
