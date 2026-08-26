import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React or any game code into the shell bundle.
//
// `scoreUnit` is "points" because this game is ENDLESS - there is no completion
// to time and no move count to minimise, so the only honest record is how far a
// run got. Only the NUMBER is persisted, never the unit, so the boards screen
// reads this to know that MORE is better; `score-unit-declared.test.ts` pins it
// against the `unit:` that `logic.ts` actually reports.
export const meta: GameMeta = {
  id: "fruit",
  title: { he: "מפל פירות", en: "Fruit Drop", es: "Lluvia de Frutas" },
  emoji: "🍉",
  color: "#d63031",
  ageBand: "kids",
  category: "kids",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
