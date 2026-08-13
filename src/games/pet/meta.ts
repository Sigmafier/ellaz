import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "pet",
  title: { he: "החיה שלי", en: "My Pet", es: "Mi Mascota" },
  emoji: "🐣",
  color: "#e84393",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // The biggest this creature has ever grown. A number that can only go up and
  // can never be taken away - see `scoreReport` in logic.ts, which is the one
  // place that says so, and `score-unit-declared.test.ts`, which pins the two
  // together.
  scoreUnit: "points",
};
