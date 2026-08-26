import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// `scoreUnit: "ms"` is a DECLARATION the boards screen depends on, not a label.
// Only the number of a record is persisted, so nothing reading
// `ellaz:arrowtap:score:hard` back off the disk can tell 12,750 milliseconds
// from 12,750 points — and the two rank opposite ways round. It must agree with
// the `unit:` this game reports; `score-unit-declared.test.ts` reads both
// sources and requires it.
export const meta: GameMeta = {
  id: "arrowtap",
  title: { he: "חצים החוצה", en: "Arrows Out", es: "Flechas Fuera" },
  emoji: "➡️",
  color: "#0b6fbf",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "ms",
};
