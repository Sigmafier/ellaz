import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
export const meta: GameMeta = {
  id: "sudoku",
  title: { he: "סודוקו", en: "Sudoku", es: "Sudoku" },
  emoji: "🔡",
  // Nudged from #0984e3 on 2026-08-04, the same blue two steps darker. It was
  // the one accent in the roster that no ink can sit on: 4.38:1 against the
  // dark ink and 3.87:1 against the light, both under the 4.5:1 floor, so the
  // name strip failed contrast whichever way `inkFor` chose. At #0b6bb5 the
  // light ink reaches 5.55:1. Nothing persists a game's colour, so changing it
  // costs no player anything - see ui/ink.ts and ui/contrast.test.ts.
  color: "#0b6bb5",
  ageBand: "all",
  category: "classics",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
