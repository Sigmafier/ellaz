import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React into the shell bundle.
export const meta: GameMeta = {
  id: "lettercross",
  title: { he: "אותיות מצטלבות", en: "Lettercross", es: "Letras cruzadas" },
  emoji: "🅰️",
  // A deep card red, and nothing in the roster sits near it - the closest are
  // #ff5a5f, which is far lighter, and #c2185b, which is pink. 5.9:1 against
  // the light ink, so `inkFor` has a legible choice (see ui/contrast.test.ts).
  color: "#B33A3A",
  // Reading is required, so this is not a "kids" game. It sits with sudoku and
  // minesweeper: a family game an adult and an eight-year-old both want.
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
