import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React or any game code into the shell bundle.
//
// `scoreUnit: "ms"` is a DECLARATION the boards screen depends on, not a label.
// Only the number of a record is persisted, so nothing reading
// `ellaz:onestroke:score:hard` back off the disk can tell 41,200 milliseconds
// from 41,200 points, and the two rank opposite ways round. It must agree with
// what the renderer reports; `score-unit-declared.test.ts` reads both sources
// and requires it.
//
// A clock and not a tap count, and that is forced rather than chosen: every
// line that finishes a board is exactly one square long per open square, so a
// tap count is the same number for every winner on a level and ranks nobody.
export const meta: GameMeta = {
  id: "onestroke",
  title: { he: "קו אחד", en: "One Stroke", es: "Un Trazo" },
  emoji: "✏️",
  // 6% darker than the indigo this started at, and the 6% is measured: the
  // original read 4.32:1 against the ink `inkFor` picks, under the 4.5 WCAG AA
  // asks for bold 14px text. `contrast.test.ts` reds on the colour rather than
  // letting the name strip pick a better ink, because at 4.32 BOTH inks fail.
  color: "#4767e6",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
