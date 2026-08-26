import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// `scoreUnit` is here rather than in the renderer because only the NUMBER of a
// personal best is ever persisted. Nothing reading `ellaz:flow:score:hard` back
// off the disk could otherwise tell eleven moves from eleven seconds, and the
// leaderboards need the unit twice over: to rank the board the right way round
// (fewer moves WINS) and to print the number in the shape it belongs to.
export const meta: GameMeta = {
  id: "flow",
  title: { he: "צינורות", en: "Pipe Flow", es: "Tuberías" },
  emoji: "🔌",
  color: "#e17055",
  ageBand: "all",
  category: "think",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "moves",
};
