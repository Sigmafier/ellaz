import type { GameMeta } from "@sdk/index";

// DOM-free metadata. `portal/games.ts` imports this statically, so the home grid
// renders without pulling React or any game code into the shell bundle.
//
// The FIRST game ever in the `learn` category: that section has been declared in
// CATEGORY_ORDER since the beginning and never rendered, because nothing was in
// it - exactly as `create` waited for `music` and `speed` for `bees`.
export const meta: GameMeta = {
  id: "letters",
  title: { he: "אות פותחת", en: "First Letter", es: "Primera letra" },
  emoji: "🔠",
  color: "#6355E0",
  ageBand: "kids",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
