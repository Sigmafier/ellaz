import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// The name and the gems are ours. The swap-three MECHANIC is old and free; the
// famous sweet-shop art, its names and its voice are trade dress, so this game
// ships plain geometric gems from the platform's own palette and is called what
// it is. See CLAUDE.md § Legal.
//
// `think` rather than `classics`: the skill is reading a board before touching
// it, which puts it beside `fit` and `merge` rather than beside snake and
// minesweeper. `kids` because there is no reading, no clock and no way to lose -
// a four-year-old can play it, and the four-colour easy board is dealt for them.
export const meta: GameMeta = {
  id: "match3",
  title: { he: "שלושה בשורה", en: "Match Three", es: "Tres en Línea" },
  emoji: "💎",
  color: "#B43594",
  ageBand: "kids",
  category: "think",
  orientation: "portrait",
  renderer: "dom",
  ownsChrome: true,
  // The record is the ROUND a run reached, which `logic.ts`'s `scoreReport`
  // is the one place to say. Points, so higher wins. Only the VALUE of a record
  // is ever persisted, never the unit, so this line is what tells the
  // leaderboard which end of the list is the good end -
  // `score-unit-declared.test.ts` holds it against what the renderer reports.
  scoreUnit: "points",
};
