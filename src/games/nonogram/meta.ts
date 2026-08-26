import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home
// grid renders without pulling React or any game code into the shell bundle.
//
// `scoreUnit` is here rather than in the renderer because only the NUMBER of a
// personal best is ever persisted. Nothing reading `ellaz:nonogram:score:hard`
// back off the disk could otherwise tell 41,250 milliseconds from 41,250
// points, and the leaderboards need the unit twice over: to rank the board the
// right way round (a fast solve WINS) and to print "41.3s" rather than "41250".
//
// `ageBand: "all"` rather than "kids", and that is a judgement about reading
// rather than about difficulty. A 5x5 board is well within a six-year-old, but
// every clue on it is a number that has to be read as a RUN LENGTH, and that is
// a second layer of notation on top of counting.
export const meta: GameMeta = {
  id: "nonogram",
  title: { he: "ציור לפי מספרים", en: "Picture Logic", es: "Lógica de dibujo" },
  emoji: "🖼️",
  color: "#4a5568",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
