import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// `scoreUnit: "ms"` is a DECLARATION the boards screen depends on, not a label.
// Only the number of a record is persisted, so nothing reading
// `ellaz:untangle:score:hard` back off the disk can tell 42,500 milliseconds
// from 42,500 points, and the two rank opposite ways round. It must agree with
// the `unit:` this game reports; `score-unit-declared.test.ts` reads both
// sources and requires it.
//
// The clock is the record here rather than a move count for a reason written
// out at `scoreFor` in `logic.ts`: putting a dot down is free, so a move count
// would put a price on exploring, which is the one thing this platform does not
// do to a child.
export const meta: GameMeta = {
  id: "untangle",
  title: { he: "סבך", en: "Untangle", es: "Desenreda" },
  emoji: "🕸️",
  // 11% darker than the teal this started at, for the reason in
  // `contrast.test.ts`: the original read 4.38:1 against either ink, under the
  // 4.5 WCAG AA asks for the bold 14px name strip. Nudging the colour is the
  // fix; there is no ink that rescues a 4.38.
  color: "#387f6d",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
