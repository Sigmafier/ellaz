import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "math",
  title: { he: "חשבון", en: "Math", es: "Cuentas" },
  emoji: "➕",
  color: "#00b894",
  ageBand: "kids",
  // `learn`, not `kids`: this is arithmetic practice, and it belongs beside
  // letters, bubbles and wordguess under the 🔤 chip. `ageBand` stays "kids", so
  // the kid rules (tap-completable, big targets, no fail punishment) still bind
  // and the age band still reads 3-10 on the emitted page - the category decides
  // which section of the home grid a child finds it in, nothing else.
  category: "learn",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
