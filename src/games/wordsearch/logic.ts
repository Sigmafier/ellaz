// Word Search - pure logic. A square of letters hides a list of words; the
// player marks each one by tapping its first letter and then its last, or by
// dragging between the two. No timer pressure, no way to lose, nothing to
// undo - a wrong selection simply is not a word.
//
// PURE: no DOM, no React, no timers. Imports go to the DIRECT shared modules
// (`@shared/rng`), the leaf `@i18n/locales`, and this game's own pure `./words`.
//
// ---------------------------------------------------------------------------
// THE GRID IS BUILT WORDS-FIRST, AND THAT IS THE WHOLE DESIGN.
//
// The obvious generator scatters letters and then looks to see what turned up.
// It is also the one that hands a child a list containing a word that is not
// there, and a child cannot tell an absent word from a well-hidden one. They
// keep looking, they give up, and the thing that lied to them is the game.
//
// So `deal` PLACES every word first, at a real cell in a real direction, and
// only then fills what is left. The list it returns IS the set of words it
// managed to place, so "every listed word is on the board" is a property of the
// construction rather than a claim about it. Nothing is ever added to the list
// afterwards, and if a word will not fit it is simply not on the list.
//
// ---------------------------------------------------------------------------
// THE ACCIDENTAL OCCURRENCE, AND WHICH WAY WE RESOLVED IT.
//
// Filler letters can spell a listed word somewhere the generator never intended.
// It is not rare and it is not a bug - it is what a bag of common letters does.
// Two ways out:
//
//   (a) accept ANY occurrence of a listed word, wherever it turns up;
//   (b) re-fill the grid until no unplanned occurrence exists.
//
// THIS GAME DOES (a), and the reason is the child rather than the code. Under
// (b) the game is still refusing a correct find at the moment of the re-fill's
// failure - and worse, (b) is a loop with no bound: on a 12x12 Hebrew grid
// carrying ten short words, "no accidental occurrence anywhere in 144 squares
// times eight directions" is a condition a weighted filler may take a very long
// time to satisfy, and a deal that hangs is worse than one that is generous.
//
// Under (a) there is nothing to refuse. `judge` reads the letters the player
// actually selected and asks whether they spell a listed word that is still
// missing - it never compares the selection against a stored answer key. A word
// found in the filler is found. `logic.test.ts` plants one deliberately and
// requires it to be accepted, and `scripts/sim/wordsearch-grids.mjs` measures
// how often the situation arises for real.
//
// ---------------------------------------------------------------------------
// HEBREW READS THE OTHER WAY, AND THE BOARD DOES NOT MIRROR.
//
// The grid carries `dir="ltr"` like every spatial grid in this app, so cell
// `row * size + col` is always drawn at the same place whatever the interface
// language (.claude/rules/rtl-spatial-grid-dir-ltr.md). If Hebrew words were
// then planted left to right, every one of them would read BACKWARDS to the
// person looking for it.
//
// So the direction set is defined against the language's own READING SENSE:
// `readingSense` is +1 for the Latin scripts and -1 for Hebrew, and every
// horizontal or diagonal direction is expressed as a multiple of it. "Across"
// therefore means left-to-right in English and right-to-left in Hebrew, which is
// what "across" means to each of those readers, and "reversed" is the awkward
// direction in both. Vertical is top-to-bottom in all three: Hebrew is written
// right to left horizontally and top to bottom down the page.
//
// `logic.test.ts` pins this from both ends, because the failure is silent - a
// Hebrew grid planted the Latin way renders perfectly and is simply unreadable.
import { pick, randInt, shuffle } from "@shared/rng";
import type { ShippedLocale } from "@i18n/locales";
import { ALPHABETS, FILLER_BAG, WORD_POOL } from "./words";

/** A cell index, `row * size + col`. Logic knows no pixels. */
export type Cell = number;

export type LevelId = "easy" | "medium" | "hard";

/* --------------------------------------------------------------- direction */

/**
 * The eight directions a word may run, named for what they mean TO A READER of
 * the language rather than for where they point on the screen.
 *
 * `across` is the natural one, `acrossBack` is the same line read the wrong way,
 * and the diagonals are named for the vertical half plus whether they follow the
 * reading sense. Resolved against `readingSense` at the moment they are used, so
 * one name is one experience in every language.
 */
export type DirName =
  | "across"
  | "down"
  | "diagDown"
  | "acrossBack"
  | "up"
  | "diagDownBack"
  | "diagUp"
  | "diagUpBack";

/** `dc` is a multiple of the language's reading sense; `dr` is absolute. */
const DIRS: Record<DirName, { dr: number; dcSense: number }> = {
  across: { dr: 0, dcSense: 1 },
  down: { dr: 1, dcSense: 0 },
  diagDown: { dr: 1, dcSense: 1 },
  acrossBack: { dr: 0, dcSense: -1 },
  up: { dr: -1, dcSense: 0 },
  diagDownBack: { dr: 1, dcSense: -1 },
  diagUp: { dr: -1, dcSense: 1 },
  diagUpBack: { dr: -1, dcSense: -1 },
};

/**
 * Which way this language reads across a line. +1 left to right, -1 right to
 * left.
 *
 * A `Record<ShippedLocale, …>` rather than `lang === "he" ? -1 : 1`, so a fourth
 * shipped language stops the build until somebody answers the question for it.
 * The ternary is right for the three languages that exist and wrong for the
 * reason it is right: Arabic is right-to-left and is not Hebrew.
 */
const SENSE: Record<ShippedLocale, 1 | -1> = { he: -1, en: 1, es: 1 };

export function readingSense(lang: ShippedLocale): 1 | -1 {
  return SENSE[lang];
}

/** The row and column step this direction takes, for a reader of `lang`. */
export function stepOf(dir: DirName, lang: ShippedLocale): { dr: number; dc: number } {
  const d = DIRS[dir];
  // `|| 0` rather than the bare product: `0 * -1` is NEGATIVE zero in
  // JavaScript, which compares equal to 0 with `===` and is a different value to
  // `Object.is`, to a deep-equal assertion, and to anything that stringifies it.
  // A vertical direction in Hebrew would carry `dc: -0` forever.
  return { dr: d.dr, dc: d.dcSense * readingSense(lang) || 0 };
}

/* ------------------------------------------------------------------ levels */

export interface Level {
  /** The grid is always square: `size` x `size`. */
  size: number;
  /** How many words the list holds, and therefore how many are planted. */
  words: number;
  /** Shortest and longest word this tier will ask for, counted in LETTERS. */
  minLetters: number;
  maxLetters: number;
  /** Which directions a word may be planted in. Selection is never restricted. */
  dirs: readonly DirName[];
}

/**
 * Three tiers, and all three axes move together: the grid grows, the list grows,
 * and the set of directions a word may hide in widens.
 *
 * The directions are the axis that matters. Easy plants across and down only, so
 * every word sits on a line the eye already scans; medium adds the forward
 * diagonal, which is the first direction that has to be looked for on purpose;
 * hard opens all eight, so a word can run backwards and uphill and the only way
 * through is to hunt letter by letter.
 *
 * `minLetters` rises on hard rather than `maxLetters` alone. A three-letter word
 * on a 12x12 grid is nearly free - short words turn up in the filler constantly,
 * so the search is over before it starts - and lifting the floor is what keeps
 * the hardest tier hard.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: {
    size: 8,
    words: 6,
    minLetters: 3,
    maxLetters: 6,
    dirs: ["across", "down"],
  },
  medium: {
    size: 10,
    words: 8,
    minLetters: 3,
    maxLetters: 8,
    dirs: ["across", "down", "diagDown"],
  },
  hard: {
    size: 12,
    words: 10,
    minLetters: 4,
    maxLetters: 8,
    dirs: ["across", "down", "diagDown", "acrossBack", "up", "diagDownBack", "diagUp", "diagUpBack"],
  },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

/* ------------------------------------------------------------------- state */

export interface WordSearchState {
  size: number;
  /** Which language's words and letters this grid is made of. */
  lang: ShippedLocale;
  /** Row-major letters, `size * size` of them. Every square is filled. */
  grid: string[];
  /** The list beside the board, in display order. */
  words: string[];
  /**
   * The cells a found word was marked on, index-aligned with `words`. `null`
   * means still missing.
   *
   * The CELLS rather than a boolean, because they are what stays highlighted -
   * and because they are what the player actually selected, which under the
   * accept-any-occurrence rule above need not be where the word was planted.
   */
  found: (Cell[] | null)[];
  /** Where a selection was started, or null. See `tap`. */
  anchor: Cell | null;
}

/** One planted word: what it is, where it went, and which way it runs. */
export interface Placement {
  word: string;
  cells: Cell[];
  dir: DirName;
}

/* ------------------------------------------------------------------ the grid */

export function rowOf(cell: Cell, size: number): number {
  return Math.floor(cell / size);
}

export function colOf(cell: Cell, size: number): number {
  return cell % size;
}

function onBoard(cell: unknown, size: number): cell is Cell {
  return Number.isInteger(cell) && (cell as number) >= 0 && (cell as number) < size * size;
}

/** A word's letters, one array entry per character. */
export function letters(word: string): string[] {
  return Array.from(word);
}

/**
 * The cells a word of `len` letters would occupy starting at `start`, or null if
 * it runs off the board.
 *
 * Stepped by row and column rather than by adding a constant to the index, which
 * is the tempting one-liner and wraps: on an 8-wide grid, index 7 plus 1 is
 * index 8, which is the far LEFT of the next row, so a horizontal word would
 * leave the board on one side and reappear on the other.
 */
export function cellsFor(
  size: number,
  start: Cell,
  dir: DirName,
  lang: ShippedLocale,
  len: number,
): Cell[] | null {
  if (!onBoard(start, size) || len < 1) return null;
  const { dr, dc } = stepOf(dir, lang);
  const r0 = rowOf(start, size);
  const c0 = colOf(start, size);
  const out: Cell[] = [];
  for (let i = 0; i < len; i++) {
    const r = r0 + dr * i;
    const c = c0 + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    out.push(r * size + c);
  }
  return out;
}

/**
 * The straight line of cells from `a` to `b` inclusive, or null if the two do
 * not sit on one row, one column, or one 45-degree diagonal.
 *
 * This is the whole selection model: a player names two ends and the game works
 * out what is between them. Absolute, not reading-relative - a finger drags
 * where it drags, and refusing a Hebrew player's leftward drag because the grid
 * calls that "backwards" would be nonsense.
 */
export function lineBetween(size: number, a: Cell, b: Cell): Cell[] | null {
  if (!onBoard(a, size) || !onBoard(b, size)) return null;
  const dr = rowOf(b, size) - rowOf(a, size);
  const dc = colOf(b, size) - colOf(a, size);
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) return [a];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const out: Cell[] = [];
  for (let i = 0; i <= len; i++) {
    out.push((rowOf(a, size) + sr * i) * size + (colOf(a, size) + sc * i));
  }
  return out;
}

/** The letters standing on these cells, in the order given. */
export function textOn(state: WordSearchState, cells: readonly Cell[]): string {
  return cells.map((c) => state.grid[c] ?? "").join("");
}

/* --------------------------------------------------------------- reading it */

/**
 * Every place this word appears in the grid, in any of the eight directions.
 *
 * The RUNTIME answer to "where is it", and the one that matters: `deal` also
 * hands back its own record of where it planted each word, but a word can appear
 * somewhere it was never planted, and after a re-deal or a restored snapshot the
 * planting record is gone while the grid is still right here. `logic.test.ts`
 * requires the two to agree on every planted word, which is how "every listed
 * word is genuinely present" is checked against the shipped grid rather than
 * against the generator's opinion of it.
 *
 * Deduped by cell SET, so a palindrome found once forwards and once backwards is
 * one occurrence rather than two.
 */
export function occurrences(state: WordSearchState, word: string): Cell[][] {
  const size = state.size;
  const want = letters(word);
  const out: Cell[][] = [];
  const seen = new Set<string>();
  const steps = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const;

  for (let r0 = 0; r0 < size; r0++) {
    for (let c0 = 0; c0 < size; c0++) {
      for (const [dr, dc] of steps) {
        const cells: Cell[] = [];
        let ok = true;
        for (let i = 0; i < want.length; i++) {
          const r = r0 + dr * i;
          const c = c0 + dc * i;
          if (r < 0 || r >= size || c < 0 || c >= size) {
            ok = false;
            break;
          }
          const cell = r * size + c;
          if (state.grid[cell] !== want[i]) {
            ok = false;
            break;
          }
          cells.push(cell);
        }
        if (!ok) continue;
        const key = [...cells].sort((x, y) => x - y).join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cells);
      }
    }
  }
  return out;
}

/**
 * Is every word on the list actually in the grid?
 *
 * Cheap enough to run on a restored snapshot - ten words over 144 squares and
 * eight directions is a few thousand character comparisons - and it is the one
 * check that makes a tampered or truncated save unable to present an unfindable
 * list. The renderer's `validate` calls it for exactly that reason.
 */
export function everyWordOccurs(state: WordSearchState): boolean {
  return state.words.every((w) => occurrences(state, w).length > 0);
}

export function foundCount(state: WordSearchState): number {
  return state.found.filter((f) => f !== null).length;
}

export function isSolved(state: WordSearchState): boolean {
  return state.words.length > 0 && state.found.every((f) => f !== null);
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * A word search has a clock and nothing else worth counting: the number of
 * selections a player makes is a measure of how tidy their finger is, and the
 * number of words is fixed by the tier. So the record is TIME, `sdk/score.ts`
 * reads the unit to decide that less is better, and the board scopes it to the
 * difficulty because six words on an 8x8 and ten hidden eight ways on a 12x12
 * are not the same achievement.
 *
 * `meta.ts` declares the same unit, and `score-unit-declared.test.ts` requires
 * the two to agree - only the NUMBER of a personal best is ever persisted, so
 * the leaderboard reads the unit off the meta to know which way round to sort.
 */
export function scoreFor(
  elapsedMs: number,
  level: LevelId,
): { value: number; unit: "ms"; board: LevelId } {
  return { value: Math.max(0, Math.round(elapsedMs)), unit: "ms", board: level };
}

/* -------------------------------------------------------------------- rules */

export type WordSearchOutcome =
  | { kind: "ignored" }
  | { kind: "anchored"; cell: Cell }
  | { kind: "cleared" }
  | { kind: "found"; word: string; index: number; cells: Cell[] }
  | { kind: "missed"; cells: Cell[] };

export interface WordSearchStep {
  state: WordSearchState;
  outcome: WordSearchOutcome;
}

const IGNORED = { kind: "ignored" } as const;

/**
 * Judge a selection.
 *
 * The letters under the selected cells are read in the order they were selected,
 * and BOTH that string and its reverse are compared against the words still
 * missing. Accepting the reverse is not laxity - a player who drags from the end
 * of a word to its start has found the word, and demanding they guess which end
 * the generator called first would be a rule about the generator rather than
 * about the puzzle.
 *
 * Nothing here consults where a word was planted. See the header: an occurrence
 * that the filler produced by accident is an occurrence.
 */
export function judge(state: WordSearchState, cells: readonly Cell[]): number {
  if (cells.length < 2) return -1;
  const forward = textOn(state, cells);
  const backward = letters(forward).reverse().join("");
  for (let i = 0; i < state.words.length; i++) {
    if (state.found[i] !== null) continue;
    if (state.words[i] === forward || state.words[i] === backward) return i;
  }
  return -1;
}

/**
 * Resolve a selection between the anchor and `cell`, whatever put it there.
 *
 * Called by the tap path and by the end of a drag, so the two input models are
 * one rule rather than two that can disagree. The anchor always clears: a
 * selection that missed leaves the board exactly as it was, which is what makes
 * a wrong guess cost nothing.
 */
export function resolve(state: WordSearchState, cell: Cell): WordSearchStep {
  const anchor = state.anchor;
  if (anchor === null || !onBoard(cell, state.size)) return { state, outcome: IGNORED };

  const cells = lineBetween(state.size, anchor, cell);
  // Not a row, a column or a diagonal. Rather than refuse, the far end becomes
  // the new anchor: a child who taps two corners has told us something useful
  // about the second tap and nothing at all about the first.
  if (cells === null) return { state: { ...state, anchor: cell }, outcome: { kind: "anchored", cell } };

  const hit = judge(state, cells);
  if (hit < 0) return { state: { ...state, anchor: null }, outcome: { kind: "missed", cells } };

  const found = state.found.slice();
  found[hit] = cells.slice();
  return {
    state: { ...state, found, anchor: null },
    outcome: { kind: "found", word: state.words[hit], index: hit, cells: cells.slice() },
  };
}

/**
 * A tap on a square - the complete path through this game, and the one that
 * must always work.
 *
 * TAP IS NEVER OPTIONAL HERE. Touch the first letter, touch the last, and the
 * word between them is marked. Drag is layered on top of exactly these calls and
 * is a shortcut, because a five-year-old on a phone and anybody on assistive
 * input cannot reliably hold a sustained gesture across twelve squares. The
 * keyboard reaches this same function from Enter and Space.
 *
 * Tapping the anchor again clears it, which is the undo: there is no button to
 * find, read and understand.
 */
export function tap(state: WordSearchState, cell: Cell): WordSearchStep {
  if (!onBoard(cell, state.size)) return { state, outcome: IGNORED };
  if (state.anchor === null) {
    return { state: { ...state, anchor: cell }, outcome: { kind: "anchored", cell } };
  }
  if (state.anchor === cell) {
    return { state: { ...state, anchor: null }, outcome: { kind: "cleared" } };
  }
  return resolve(state, cell);
}

/** Drop whatever selection was in progress. Used when a level or game restarts. */
export function clearAnchor(state: WordSearchState): WordSearchState {
  return state.anchor === null ? state : { ...state, anchor: null };
}

/* ----------------------------------------------------------------- the deal */

export interface Deal {
  state: WordSearchState;
  /** Where each listed word was planted. See `occurrences` on why it is not state. */
  placements: Placement[];
  /** How many (direction, start) positions were tried in total. For the sim. */
  attempts: number;
  /** How many whole grids were thrown away before this one. For the sim. */
  redeals: number;
}

/**
 * How many positions to try for one word before giving up on it.
 *
 * A bound rather than a loop until it fits: whether a word can be placed depends
 * on what is already on the grid, so a pathological arrangement could in
 * principle never accept it, and a deal that hangs is worse than a list one word
 * short. The word is dropped and the next candidate is tried, so the LIST always
 * matches the grid.
 */
const PLACE_ATTEMPTS = 120;

/**
 * How many whole grids to throw away before shipping the best one seen.
 *
 * A re-deal is what happens when the pool ran out before the list was full -
 * rare, and measured by `scripts/sim/wordsearch-grids.mjs`. The fallback is the
 * fullest grid of the attempts rather than a failure, because a list of nine
 * words that are all really there is a good puzzle and an error message is not.
 */
const DEAL_ATTEMPTS = 6;

/**
 * Would this candidate be a word inside another listed word, or contain one?
 *
 * `BEAR` beside `BEA` would put one word inside the other's marked cells, so
 * finding the long one finds the short one by accident and the list reads as
 * padded. Cheap to refuse at deal time; impossible to explain afterwards.
 */
function clashes(word: string, placed: readonly Placement[]): boolean {
  return placed.some((p) => p.word.includes(word) || word.includes(p.word));
}

/** Try to lay `word` on the grid. Mutates `grid` only on success. */
function place(
  grid: string[],
  size: number,
  word: string,
  dirs: readonly DirName[],
  lang: ShippedLocale,
  rng: () => number,
  count: () => void,
): Placement | null {
  const glyphs = letters(word);
  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
    count();
    const dir = pick(dirs, rng);
    const { dr, dc } = stepOf(dir, lang);
    // Draw the start INSIDE the range the word can actually fit in, rather than
    // anywhere on the board and rejecting. Otherwise a long word on a small grid
    // spends most of its attempts falling off an edge, and "attempts per word"
    // would measure the geometry instead of the crowding it exists to report.
    const span = glyphs.length - 1;
    const rLo = dr > 0 ? 0 : dr < 0 ? span : 0;
    const rHi = dr > 0 ? size - 1 - span : dr < 0 ? size - 1 : size - 1;
    const cLo = dc > 0 ? 0 : dc < 0 ? span : 0;
    const cHi = dc > 0 ? size - 1 - span : dc < 0 ? size - 1 : size - 1;
    if (rLo > rHi || cLo > cHi) continue;

    const start = randInt(rLo, rHi, rng) * size + randInt(cLo, cHi, rng);
    const cells = cellsFor(size, start, dir, lang, glyphs.length);
    if (cells === null) continue;

    // A square may be empty or already hold this word's letter. Crossings are
    // wanted, not tolerated: they are what stops the grid reading as stripes.
    let fits = true;
    for (let i = 0; i < cells.length; i++) {
      const have = grid[cells[i]];
      if (have !== "" && have !== glyphs[i]) {
        fits = false;
        break;
      }
    }
    if (!fits) continue;

    for (let i = 0; i < cells.length; i++) grid[cells[i]] = glyphs[i];
    return { word, cells, dir };
  }
  return null;
}

/**
 * Build a board.
 *
 * Words first, filler second, and the list is whatever got planted - see the
 * header. Deterministic given `rng`, so the tests and the simulation drive the
 * same boards a child opens.
 */
export function deal(
  levelId: LevelId,
  lang: ShippedLocale,
  rng: () => number = Math.random,
): Deal {
  const level = LEVELS[levelId];
  const size = level.size;
  const pool = WORD_POOL[lang].filter((w) => {
    const n = letters(w).length;
    return n >= level.minLetters && n <= Math.min(level.maxLetters, size);
  });

  let attempts = 0;
  let redeals = 0;
  let best: { grid: string[]; placements: Placement[] } | null = null;

  for (let round = 0; round < DEAL_ATTEMPTS; round++) {
    const grid: string[] = new Array(size * size).fill("");
    const placements: Placement[] = [];
    // Longest first. A long word has the fewest positions available, so placing
    // it into an empty grid and letting the short ones fill in around it is both
    // likelier to succeed and denser in crossings than the other order.
    const order = shuffle(pool, rng).sort((a, b) => letters(b).length - letters(a).length);

    for (const word of order) {
      if (placements.length === level.words) break;
      if (clashes(word, placements)) continue;
      const p = place(grid, size, word, level.dirs, lang, rng, () => attempts++);
      if (p) placements.push(p);
    }

    if (!best || placements.length > best.placements.length) best = { grid, placements };
    if (placements.length === level.words) break;
    redeals++;
  }

  const { grid, placements } = best!;
  const bag = FILLER_BAG[lang];
  for (let i = 0; i < grid.length; i++) if (grid[i] === "") grid[i] = pick(bag, rng);

  // Shuffled again for DISPLAY, so the list beside the board is not in length
  // order - a list sorted longest-first tells the player which word to hunt for
  // first, which is a hint nobody asked to give.
  const words = shuffle(
    placements.map((p) => p.word),
    rng,
  );

  return {
    state: {
      size,
      lang,
      grid,
      words,
      found: words.map(() => null),
      anchor: null,
    },
    placements,
    attempts,
    redeals,
  };
}

/** A fresh board at this level, for the renderer. */
export function newGame(level: LevelId, lang: ShippedLocale, rng?: () => number): WordSearchState {
  return deal(level, lang, rng).state;
}

/* ------------------------------------------------------- the content language */

/**
 * The operator's rule, the same one `letters` and `spell` carry: a Hebrew
 * interface can practise all three scripts, every other interface gets the two
 * Latin ones.
 *
 * Deliberately a copy rather than an import from another game. Games talk to the
 * SDK and never to each other, and this is one map of three entries - coupling
 * three games' difficulty design together to save it would be the more expensive
 * mistake. Data-driven either way, so it reds by name when the shipped set grows.
 *
 * IT IS ALSO THE OTHER HALF OF THE HEBREW DIRECTION ANSWER. Planting Hebrew
 * right-to-left makes a Hebrew grid readable; the toggle makes it a CHOICE, so a
 * Hebrew-speaking child can hunt English words without changing the language of
 * every button on the screen, and an English-speaking one is never handed a grid
 * of letters they cannot read.
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

/** Every letter this language's grid may draw. Used by the snapshot check. */
export function alphabetOf(lang: ShippedLocale): ReadonlySet<string> {
  return ALPHABETS[lang];
}
