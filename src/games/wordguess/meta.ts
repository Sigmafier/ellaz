import type { GameMeta } from "@sdk/index";

// DOM-free metadata: the portal catalog imports this statically so the home grid
// renders without pulling React into the shell bundle.
//
// `ageBand: "all"` and not "kids", deliberately. A kids game must be
// tap-completable with no reading required, and this one is reading — that is
// the entire mechanic. Filing it under "kids" would put it in front of a
// five-year-old who cannot play it.
//
// The name is ours. Every cloned mechanic in this repo ships under an original
// name with its own colours (see § Legal in CLAUDE.md), so this is "Word Guess"
// and its found/misplaced tiles are green and ORCHID rather than the green and
// yellow that are somebody else's trade dress.
export const meta: GameMeta = {
  id: "wordguess",
  title: { he: "נחשו מילה", en: "Word Guess" },
  emoji: "🔤",
  // Deepened from #c44dd6, which measured 4.34 against the 4.5 ink-contrast
  // floor. Not nudged to the first passing value either: #b63ec8 clears at
  // 4.65, but it sits just past the point where `inkFor` swaps which ink it
  // picks, so a later tweak of a few points would drop it back under. This one
  // measures 5.07.
  color: "#af37c1",
  ageBand: "all",
  category: "learn",
  orientation: "any",
  renderer: "dom",
  ownsChrome: true,
  // The record is the LONGEST STREAK of words solved in a row, so higher wins.
  // Not "guesses used": that would rank a four-letter fluke above a six-letter
  // grind, and it would hand every player a permanent record of 1 the first
  // time they solved one on the opening row.
  scoreUnit: "points",
};
