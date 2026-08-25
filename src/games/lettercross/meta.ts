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
  // STILL BEING BUILT, and the badge says so on the card and on the page.
  //
  // The board and the five bonus screens play; what is not settled is the
  // placement rule (a first word that may go anywhere, and every word after it
  // connecting), the padlocks, and the music. A player who finds a rule moving
  // under them next week should have been told, and the badge is the telling.
  //
  // Taking it off is one line HERE and a deletion in `beta-is-declared.test.ts`,
  // which reds when no game declares beta at all. That is deliberate rather
  // than an oversight: the assertions in that file are all of the form "a beta
  // game carries the badge", and with no beta game every one of them passes
  // over nothing. A gate that cannot fail is worse than no gate, so it says so
  // out loud instead - and the right answer on the day the last flag comes off
  // is to delete the file, not to weaken it.
  beta: true,
};
