import type { GameMeta } from "@sdk/index";

// DOM-free metadata. `portal/games.ts` imports this statically, so the home grid
// renders without pulling React or any game code into the shell bundle.
//
// The SECOND game in `learn`, and deliberately the harder half of a pair:
// `letters` asks which letter a word begins with, this asks for all of them.
// The two share a category, a picture-first design and a content-language
// toggle, and nothing else - see `logic.ts` on why the code is not shared.
//
// `scoreUnit: "points"` because the record is WORDS SPELLED in a run, and
// higher wins. Only the value of a record is persisted, never its unit, so this
// line is what tells the leaderboard which end of the list is the good end -
// and `score-unit-declared.test.ts` holds it against what the renderer reports.
export const meta: GameMeta = {
  id: "spell",
  title: { he: "מרכיבים מילה", en: "Spell It", es: "Forma la palabra" },
  emoji: "✏️",
  color: "#0E9F94",
  ageBand: "kids",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  scoreUnit: "points",
};
