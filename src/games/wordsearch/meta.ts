import type { GameMeta } from "@sdk/index";

// DOM-free metadata: `portal/games.ts` imports this statically so the home grid
// renders without pulling React or any game code into the shell bundle.
//
// `scoreUnit: "ms"` is here rather than in the renderer because only the NUMBER
// of a personal best is ever persisted. Nothing reading `ellaz:wordsearch:score:hard`
// back off the disk could otherwise tell 91,235 milliseconds from 91,235 points,
// and the leaderboards need the unit twice over: to rank the board the right way
// round (a faster hunt WINS) and to print the number as a clock rather than as a
// count. `score-unit-declared.test.ts` pins it to the `unit:` `logic.ts` reports.
//
// `learn` rather than `think`: the puzzle is letter recognition and scanning, and
// it sits beside `letters` and `spell` for the same reader.
export const meta: GameMeta = {
  id: "wordsearch",
  title: { he: "חיפוש מילים", en: "Word Search", es: "Sopa de letras" },
  emoji: "🔎",
  color: "#2A9D8F",
  ageBand: "all",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
