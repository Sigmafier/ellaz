// "Spell the Word" (מרכיבים מילה) - pure logic.
//
// A picture is shown and the child builds its whole name, letter by letter,
// from a tray of tiles. This is the step up from `letters`, which asks only
// which letter a word BEGINS with: here every letter of the word has to be
// found, in order.
//
// THE ONE DESIGN DECISION EVERYTHING ELSE FOLLOWS FROM: a wrong tile is never
// PLACED. Tapping it shakes and rules that tile out for the current slot, and
// the word on screen is therefore correct at every moment a child looks at it.
//
// The alternative - let them fill all the slots and check at the end - is how
// spelling is tested rather than how it is learned, and for a four-year-old it
// ends in a row of letters that is wrong in a way nobody can point at. It also
// removes an entire feature: with nothing wrong ever placed, there is nothing
// to take back, so the game needs no undo, no drag, and no way to get stuck.
//
// PURE: no DOM, no React, no timers. Imports go to the DIRECT shared modules
// (`@shared/rng`), the leaf `@i18n/locales`, and this game's own pure `./words`
// - never the `@shared` barrel and never `@ui`/`@juice`.
import { shuffle } from "@shared/rng";
import type { CastItem } from "@shared/cast";
import type { ShippedLocale } from "@i18n/locales";
import { WORDS } from "./words";

/** Level ids double as reward tiers - the union is identical by design. */
export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  id: LevelId;
  /** The longest word this level will ask for, counted in LETTERS. */
  maxLetters: number;
  /** Extra wrong tiles mixed into the tray. Easy has none - see below. */
  decoys: number;
}

/**
 * Difficulty ramps both axes at once, the same shape `letters` uses.
 *
 * `decoys: 0` on easy is the load-bearing one. With no decoys the tray holds
 * exactly the word's own letters, so the task is pure ORDERING - the child
 * never has to reject a letter, only find which of the three or four they are
 * looking at comes first. That is a genuinely different (and much earlier)
 * skill than recognising that `k` has no place in `cat`, and it is what makes
 * this playable at four rather than at six.
 *
 * `maxLetters` is a CEILING rather than a band, so every level keeps the
 * shorter words of the one below it. A band would empty out per language -
 * Hebrew kid-vocabulary is mostly three to five letters, so a "7+" tier would
 * be four words in Hebrew and thirty in Spanish, and difficulty would silently
 * mean something different in each language.
 */
export const LEVELS: readonly Level[] = [
  { id: "easy", maxLetters: 4, decoys: 0 },
  { id: "medium", maxLetters: 6, decoys: 2 },
  { id: "hard", maxLetters: 99, decoys: 4 },
] as const;

export function levelById(id: LevelId): Level {
  const found = LEVELS.find((l) => l.id === id);
  if (!found) throw new Error(`[ellaz] unknown level ${id}`);
  return found;
}

/**
 * A word shorter than this is not a spelling task.
 *
 * Two tiles in a tray is a coin toss, and the shortest Hebrew words here (`דג`,
 * `ים`, `אש`, `צב`, `נר`) are all two letters. They stay in `words.ts` as the
 * honest singular - `דגים` for one fish would be a plural picked to dodge a
 * threshold - and this floor simply keeps them out of the HEBREW pool. Their
 * English and Spanish forms are longer, so the same pictures still appear for
 * a child spelling in those languages. The filter is per content language,
 * which is what makes that work with no per-word exception list.
 */
export const MIN_LETTERS = 3;

/** How often an endless run pays a milestone coin. Every fifth word. */
export const MILESTONE_EVERY = 5;

export function isMilestoneRound(round: number): boolean {
  return round > 0 && round % MILESTONE_EVERY === 0;
}

/* -------------------------------------------------------------- alphabets */

/**
 * The letters a DECOY may be drawn from, per language.
 *
 * `Record<ShippedLocale, ...>` on purpose: the day a language joins the
 * SHIPPED set this record stops compiling until somebody gives it an alphabet,
 * rather than falling back to English letters for a language with a script of
 * its own. Same gate `letters/logic.ts` and `cast.ts` carry.
 *
 * Hebrew FINAL forms (ך ם ן ף ץ) are absent here and present in
 * `SPELLING_LETTERS` below, and the split is the whole point: a final form is
 * a real letter a word really ends in, so a tile must be able to BE one - but
 * offering one as a distractor asks a four-year-old to rule out a letter shape
 * on a rule (finals only at the end) that is more advanced than the spelling
 * itself.
 */
export const ALPHABETS: Record<ShippedLocale, readonly string[]> = {
  he: "אבגדהוזחטיכלמנסעפצקרשת".split(""),
  en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split(""),
};

/** Hebrew's five final forms, and the base letter each one is a form OF. */
const HEBREW_FINALS: Record<string, string> = {
  ך: "כ",
  ם: "מ",
  ן: "נ",
  ף: "פ",
  ץ: "צ",
};

/**
 * Every letter that may legally appear in a word of this language - the decoy
 * alphabet plus anything that is only ever written, never offered.
 *
 * `logic.test.ts` holds every word in `words.ts` against this set, which is
 * what stops an accented Spanish word (`león`, `plátano`) or an apostrophe
 * (cast's `ג'ירפה`) reaching a child as a tile the tray has no key for.
 */
export const SPELLING_LETTERS: Record<ShippedLocale, ReadonlySet<string>> = {
  he: new Set([...ALPHABETS.he, ...Object.keys(HEBREW_FINALS)]),
  en: new Set(ALPHABETS.en),
  es: new Set(ALPHABETS.es),
};

/**
 * The letter under a letter: a Hebrew final resolves to its base form, and
 * everything else is itself.
 *
 * Used only to keep DECOYS honest. Spelling `לחם` from a tray holding both `ם`
 * and `מ` is a real distinction and a real lesson, and it is the wrong lesson
 * to bury inside an unrelated one - the child is here to find out that bread
 * is lamed-chet-mem, not to discover that two of the tiles are the same letter
 * wearing different clothes. So the base form of any final in the word is
 * excluded from the decoy pool, and the pair only ever meets somebody
 * deliberately, later.
 */
export function baseLetter(letter: string): string {
  return HEBREW_FINALS[letter] ?? letter;
}

/** A word's letters, in order, as tiles will carry them. */
export function lettersOf(word: string, lang: ShippedLocale): string[] {
  const raw = [...word.trim()];
  return lang === "he" ? raw : raw.map((c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ pools */

/**
 * Every picture a level can ask for, in one content language.
 *
 * Filtered by the length of the word IN THAT LANGUAGE, so a picture can be an
 * easy word in Hebrew and a hard one in Spanish. `כדור` is four letters and
 * `pelota` is six, and pretending otherwise would make "easy" mean two
 * different things depending on which language a child chose.
 */
export function poolFor(level: Level, lang: ShippedLocale): readonly CastItem[] {
  return WORDS.filter((item) => {
    const n = lettersOf(item[lang], lang).length;
    return n >= MIN_LETTERS && n <= level.maxLetters;
  });
}

/**
 * A freshly shuffled copy of `pool`, dealt through in order by the renderer so
 * no picture repeats until every one has been shown. When `avoidEmoji` is given
 * (the last picture of the previous pass), the first two cards swap if the seam
 * would repeat it. Non-mutating.
 */
export function refillBag(
  pool: readonly CastItem[],
  rng: () => number = Math.random,
  avoidEmoji?: string,
): CastItem[] {
  const bag = shuffle(pool, rng);
  if (bag.length > 1 && avoidEmoji !== undefined && bag[0].emoji === avoidEmoji) {
    [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  return bag;
}

/* ---------------------------------------------------------------- puzzles */

/**
 * One tile in the tray.
 *
 * It carries an `id` because a letter is not unique: `banana` needs three `A`
 * tiles and `perro` two `R`s. Identifying a tap by its LETTER would make the
 * three A tiles one button that can be pressed three times, which is exactly
 * the bug where a child taps the same tile twice and the word fills in anyway.
 */
export interface Tile {
  id: number;
  letter: string;
}

export interface Puzzle {
  item: CastItem;
  /** The word as written, for the speaker and for a grown-up reading over a shoulder. */
  word: string;
  /** Its letters in order - the answer, one per slot. */
  letters: string[];
  /** The word's letters plus the level's decoys, shuffled. */
  tray: Tile[];
}

/** A filled slot: which tile went in, and whether the HINT put it there. */
export interface FilledSlot {
  tileId: number;
  hinted: boolean;
}

export interface SpellState {
  puzzle: Puzzle;
  /** One entry per letter of the word; `null` until it is filled. */
  slots: (FilledSlot | null)[];
  /**
   * Tiles tapped at the CURRENT slot that did not belong there.
   *
   * Cleared on every placement rather than accumulated over the word, and that
   * is not a detail: `banana` rules `N` out at slot 1 and needs it at slot 2.
   * A ruled-out list that survived a placement would dim a tile the child is
   * about to need, and dim it permanently.
   */
  ruledOut: number[];
  /** Hints spent on this word. */
  hints: number;
}

/**
 * Build one puzzle: the word's own letters, plus `level.decoys` wrong ones.
 *
 * Decoys are drawn from letters the word does not use at all (compared by
 * `baseLetter`, see above), so every decoy is genuinely wrong wherever it is
 * tapped. A decoy that duplicated a letter the word needs would be placeable
 * and correct, which makes the tray bigger without making the puzzle harder -
 * the worst of both.
 */
export function buildPuzzle(
  lang: ShippedLocale,
  item: CastItem,
  level: Level,
  rng: () => number = Math.random,
): Puzzle {
  const word = item[lang];
  const letters = lettersOf(word, lang);

  const used = new Set(letters.map(baseLetter));
  const decoyPool = ALPHABETS[lang].filter((l) => !used.has(baseLetter(l)));
  const decoys = shuffle(decoyPool, rng).slice(0, Math.max(0, level.decoys));

  const tray = shuffle([...letters, ...decoys], rng).map((letter, id) => ({ id, letter }));
  return { item, word, letters, tray };
}

export function startPuzzle(puzzle: Puzzle): SpellState {
  return {
    puzzle,
    slots: puzzle.letters.map(() => null),
    ruledOut: [],
    hints: 0,
  };
}

/** The index of the slot being filled next, or `-1` when the word is done. */
export function nextSlot(state: SpellState): number {
  return state.slots.findIndex((s) => s === null);
}

export function isComplete(state: SpellState): boolean {
  return nextSlot(state) === -1;
}

/** Tile ids already sitting in a slot. The renderer draws these as spent. */
export function usedTileIds(state: SpellState): Set<number> {
  const out = new Set<number>();
  for (const slot of state.slots) if (slot) out.add(slot.tileId);
  return out;
}

export type PlaceOutcome = "placed" | "wrong" | "ignored";

export interface PlaceResult {
  state: SpellState;
  outcome: PlaceOutcome;
  /** The slot it landed in, when it landed. */
  slot?: number;
  /** True when that placement finished the word. */
  complete: boolean;
}

/**
 * Tap a tray tile.
 *
 * `ignored` covers every tap that must do nothing at all - a spent tile, a tile
 * already ruled out at this slot, a tap after the word is finished, an id from
 * a stale render. It is deliberately not an error: the renderer treats it as a
 * tap that never happened, so a double-tap during the win animation cannot
 * grant a second time.
 */
export function place(state: SpellState, tileId: number): PlaceResult {
  const slot = nextSlot(state);
  if (slot === -1) return { state, outcome: "ignored", complete: true };

  const tile = state.puzzle.tray.find((t) => t.id === tileId);
  if (!tile || usedTileIds(state).has(tileId) || state.ruledOut.includes(tileId)) {
    return { state, outcome: "ignored", complete: false };
  }

  if (tile.letter !== state.puzzle.letters[slot]) {
    return {
      state: { ...state, ruledOut: [...state.ruledOut, tileId] },
      outcome: "wrong",
      complete: false,
    };
  }

  const slots = [...state.slots];
  slots[slot] = { tileId, hinted: false };
  const next = { ...state, slots, ruledOut: [] };
  return { state: next, outcome: "placed", slot, complete: isComplete(next) };
}

export interface HintResult {
  state: SpellState;
  /** The tile the hint spent, so the renderer can fly it into place. */
  tileId?: number;
  slot?: number;
  complete: boolean;
}

/**
 * Fill the first unknown letter.
 *
 * The whole button, in one sentence: it does exactly what a grown-up leaning
 * over does, which is say the next letter out loud. It never reveals the word,
 * never skips ahead to a letter the child has not reached, and cannot be
 * refused - a hint that is rationed is a hint a stuck four-year-old cannot
 * reach, and being stuck with no way forward is the one outcome this platform
 * does not ship.
 *
 * It costs nothing but the hint counter. `hints` is reported to the page and
 * to nobody else: the score counts words spelled, and a word finished with
 * help still counts. That is a deliberate choice rather than an oversight -
 * see `Spell.tsx`, which shows the count so a grown-up can see how much help a
 * run needed without the game itself passing judgement on it.
 */
export function hint(state: SpellState): HintResult {
  const slot = nextSlot(state);
  if (slot === -1) return { state, complete: true };

  const wanted = state.puzzle.letters[slot];
  const spent = usedTileIds(state);
  const tile = state.puzzle.tray.find((t) => t.letter === wanted && !spent.has(t.id));

  // Unreachable by construction: the tray always holds every letter of the
  // word. Answering with an unchanged state rather than throwing means a
  // future tray that breaks that promise costs a child a dead button, never a
  // crashed game.
  if (!tile) return { state, complete: false };

  const slots = [...state.slots];
  slots[slot] = { tileId: tile.id, hinted: true };
  const next = { ...state, slots, ruledOut: [], hints: state.hints + 1 };
  return { state: next, tileId: tile.id, slot, complete: isComplete(next) };
}

/* ------------------------------------------------- which languages to offer */

/**
 * The operator's rule, the same one `letters` carries: a Hebrew interface can
 * practise all three scripts, every other interface gets the two Latin ones.
 *
 * Deliberately a copy rather than an import from `../letters/logic`. Games talk
 * to the SDK and never to each other, and this is one map of three entries -
 * coupling two games' difficulty design together to save it would be the more
 * expensive mistake. Data-driven either way, so it reds by name when the
 * shipped set grows.
 */
const EXTRA_CONTENT: Record<ShippedLocale, readonly ShippedLocale[]> = {
  he: ["en", "es"],
  en: ["es"],
  es: ["en"],
};

/** The content languages to offer, the player's own first (the default). */
export function contentLangOptions(current: ShippedLocale): readonly ShippedLocale[] {
  return [current, ...EXTRA_CONTENT[current]];
}
