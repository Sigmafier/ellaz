import type { GameMeta } from "@sdk/index";

// DOM-free metadata. `portal/games.ts` imports this statically, so the home grid
// renders without pulling React, a canvas, or any game code into the shell.
//
// `classics` rather than `kids`: this is the arcade shape everyone already
// knows, it is played by adults as much as by children, and it sits beside
// snake, blocks and minesweeper rather than beside the letter games.
//
// `scoreUnit: "points"` because the record is the SCORE of a run and higher
// wins. Only the value of a record is ever persisted, never its unit, so this
// line is what tells the leaderboard which end of the list is the good end -
// and `score-unit-declared.test.ts` holds it against what the renderer reports.
export const meta: GameMeta = {
  id: "bubbleshooter",
  title: { he: "ירי בועות", en: "Bubble Shooter", es: "Tiro de burbujas" },
  emoji: "🎯",
  color: "#2BA8F0",
  ageBand: "all",
  category: "classics",
  orientation: "portrait",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
