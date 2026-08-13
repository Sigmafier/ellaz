import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React/Phaser into the shell bundle.
//
// The first game in the `create` section, which has been declared in
// `CATEGORY_ORDER` and empty since the catalogue was written.
//
// Not `echo`, the repeat-after-me game, even though both make notes. There the
// app plays and the child copies, and a wrong tap ends the run; here the child
// plays and nothing can be wrong. The header of `logic.ts` carries the full
// comparison.
//
// The tune, the scale and the three voices are ours. A grid of notes is as old
// as notation and nothing here quotes anybody's instrument, artwork or name.
export const meta: GameMeta = {
  id: "music",
  title: { he: "תיבת נגינה", en: "Music Box", es: "Caja de música" },
  emoji: "🎵",
  // A deep rose nothing else in the roster uses - the pinks here are all light
  // (memory, pet, wordguess) and this is two steps down from them, clearing the
  // 4.5 ink floor at 5.87 with the white ink `inkFor` picks
  // (`ui/contrast.test.ts`).
  color: "#c2185b",
  ageBand: "kids",
  category: "create",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // Points: how many notes are in the biggest tune this player has built. It
  // measures the SIZE of what they made and never whether the music is any
  // good - that judgement is why `coloring` has no record at all. The unit is
  // declared HERE because only the VALUE of a record is persisted;
  // `score-unit-declared.test.ts` pins this to the `unit:` logic.ts reports.
  scoreUnit: "points",
};
