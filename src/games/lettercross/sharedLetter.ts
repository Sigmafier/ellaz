/**
 * Lettercross - "the same letter is missing from these words". PURE: no DOM,
 * no React, no timers.
 *
 * Two of BONUS's five bonus screens, and it gave both of them exact numbers:
 *
 *   20s  "the identical letter, missing in the TWO words before you"    40 pts
 *   30s  "the identical letter, missing in the THREE words before you"  100 pts
 *
 * Both start on a START button ("להתחלת המשימה הקש על 'התחל'"), and BONUS
 * allowed no appeal inside a bonus. The clocks and the two prizes are the
 * original's; everything below is how they are made true here.
 *
 * TWO LISTS, AND THEY ARE NOT INTERCHANGEABLE. This is the first thing in this
 * game that puts a word ON THE SCREEN rather than judging one a child built, so:
 *
 *   the words SHOWN come from `puzzleWords.ts` - 346 authored, concrete words
 *   the answer is CHECKED against `words.ts` - the whole 28,515-entry dictionary
 *
 * Getting that round the wrong way costs something real in each direction.
 * Showing from the dictionary would eventually put an ugly word in front of a
 * five-year-old (NOTICE.md: the blocklist is not provably complete, and the list
 * is only safe because it never shows anything). Checking uniqueness against the
 * small pool would call a puzzle settled when a perfectly ordinary word the
 * player knows also fits it - the game would be right by its own list and wrong
 * to the person playing.
 *
 * ENGLISH IN EVERY LOCALE, deliberately. The dictionary is ENABLE1 and the board
 * game is an English word game whatever language the app is speaking, so a
 * Hebrew player already lays English words; a bonus screen in Hebrew would be a
 * different game. Only the chrome around it translates.
 */
import { PUZZLE_WORDS } from "./puzzleWords";
import { AZ, blank, solvers } from "./patterns";
import { pick, shuffle } from "@shared/rng";
import { HARD_Q, MEDIUM_Q } from "./bonus";

/**
 * `solvers` moved to `patterns.ts` the moment a THIRD round needed to ask the
 * dictionary the same question. Re-exported here because this round's own test
 * reaches for it, and a test that has to follow a move is a test that stops
 * being run.
 */
export { solvers };

/** How many letters to offer. Eight is a comfortable phone row, two rows of four. */
export const CHOICES = 8;

/** BONUS's own clocks, in milliseconds. */
export const SHARED_MS: Readonly<Record<number, number>> = { 2: 20_000, 3: 30_000 };

export type SharedPuzzle = {
  /** The whole words, kept for the reveal when the clock beats the player. */
  readonly words: readonly string[];
  /** The same words with one "_" each - what is on the screen. */
  readonly patterns: readonly string[];
  readonly answer: string;
  /** The answer plus decoys, shuffled. Every decoy solves at least one line. */
  readonly choices: readonly string[];
};

/** Every (word, blanked pattern) the pool offers, grouped by the letter removed. */
function patternsByLetter(): Map<string, { p: string; w: string }[]> {
  const m = new Map<string, { p: string; w: string }[]>();
  for (const w of PUZZLE_WORDS) {
    for (let i = 0; i < w.length; i++) {
      const c = w[i];
      let bucket = m.get(c);
      if (!bucket) m.set(c, (bucket = []));
      bucket.push({ p: blank(w, i), w });
    }
  }
  return m;
}
/** Built once: it is 1,465 entries off a frozen list and cannot change at runtime. */
const BY_LETTER = patternsByLetter();

/**
 * The letters to offer beside the answer.
 *
 * A DECOY MUST SOLVE AT LEAST ONE LINE, which is what makes this a puzzle rather
 * than a spot-the-vowel. Offering eight letters picked at random would let a
 * player who reads only the first word get it right most of the time - the whole
 * question is which letter fits ALL of them, so the wrong answers have to be
 * ones that fit SOME of them.
 *
 * Topped up with plain letters only when the puzzle is too tight to produce
 * seven near-misses, so the row is always the same size and the count never
 * leaks how hard the puzzle is.
 */
function choicesFor(patterns: readonly string[], answer: string, rng: () => number): string[] {
  const near = new Set<string>();
  for (const p of patterns) for (const c of solvers([p])) if (c !== answer) near.add(c);
  const picked = shuffle([...near], rng).slice(0, CHOICES - 1);
  if (picked.length < CHOICES - 1) {
    for (const c of shuffle(AZ, rng)) {
      if (picked.length >= CHOICES - 1) break;
      if (c !== answer && !picked.includes(c)) picked.push(c);
    }
  }
  return shuffle([...picked, answer], rng);
}

/**
 * NO LINE MAY GIVE THE ANSWER AWAY, and this is the thing the round is actually
 * about.
 *
 * A pattern only one letter can complete - `_amel`, `co_oa` - is not a clue, it
 * is the answer written out. Paired with anything at all it makes a puzzle that
 * is technically unique and takes no thinking: read one word, done, and the
 * other line was decoration. So every line must have at least two answers of its
 * own, and it is only TOGETHER that they settle on one.
 *
 * That is also what fills the row of letters underneath with real near misses
 * rather than padding - a line with several answers of its own supplies them.
 *
 * Measured on this pool: of the 48,632 unique two-word combinations, 11,969 have
 * no giveaway line and 2,653 of those also offer seven distinct near misses.
 * Both are far more than a random search needs.
 */
const OPEN_ENOUGH = 2;

/**
 * A puzzle of `count` words missing the same letter, with EXACTLY ONE answer.
 *
 * Three passes, loosening as it goes, then an exhaustive walk. The loosening is
 * the honest part: the best shape is not always available for every letter, and
 * a generator that insisted on it could search for ever while a child looks at a
 * blank screen. The walk is bounded by the index and always terminates.
 *
 * `undefined` is unreachable with the shipped pool - `shared-letter.test.ts`
 * pins that over 300 seeds - but it stays in the type, because a caller that
 * cannot express "there was no puzzle" is a caller that will one day throw
 * inside a bonus round.
 */
export function makeShared(count: number, rng: () => number = Math.random): SharedPuzzle | undefined {
  const letters = shuffle([...BY_LETTER.keys()], rng);

  const build = (
    ch: string,
    picks: { p: string; w: string }[],
    want: "wide" | "open" | "any",
  ): SharedPuzzle | undefined => {
    // Two blanks of the SAME word is one word twice on the screen, so the
    // player is reading fewer lines than the round says it is asking.
    if (new Set(picks.map((x) => x.w)).size !== count) return undefined;
    const patterns = picks.map((x) => x.p);
    const only = solvers(patterns);
    if (only.length !== 1 || only[0] !== ch) return undefined;

    if (want !== "any") {
      const per = patterns.map((p) => solvers([p]));
      if (per.some((xs) => xs.length < OPEN_ENOUGH)) return undefined;
      if (want === "wide") {
        const near = new Set(per.flat());
        near.delete(ch);
        if (near.size < CHOICES - 1) return undefined;
      }
    }
    return {
      words: picks.map((x) => x.w),
      patterns,
      answer: ch,
      choices: choicesFor(patterns, ch, rng),
    };
  };

  const PASSES: { want: "wide" | "open" | "any"; tries: number }[] = [
    { want: "wide", tries: 400 },
    { want: "open", tries: 200 },
    { want: "any", tries: 200 },
  ];
  for (const pass of PASSES) {
    for (let attempt = 0; attempt < pass.tries; attempt++) {
      const ch = pick(letters, rng);
      const bucket = BY_LETTER.get(ch)!;
      if (bucket.length < count) continue;
      const picks = shuffle(bucket, rng).slice(0, count);
      const made = build(ch, picks, pass.want);
      if (made) return made;
    }
  }

  for (const ch of letters) {
    const bucket = BY_LETTER.get(ch)!;
    for (let a = 0; a < bucket.length; a++) {
      for (let b = a + 1; b < bucket.length; b++) {
        if (count === 2) {
          const made = build(ch, [bucket[a], bucket[b]], "any");
          if (made) return made;
          continue;
        }
        for (let c = b + 1; c < bucket.length; c++) {
          const made = build(ch, [bucket[a], bucket[b], bucket[c]], "any");
          if (made) return made;
        }
      }
    }
  }
  return undefined;
}

/**
 * HOW WELL DID THAT GO - and here it is simply WHICH puzzle you solved.
 *
 * BONUS paid a FLAT bonus for each: 40 for the two-word screen, 100 for the
 * three. Not more for being quick, not less for taking the whole clock. So the
 * quality this reports is the round's own weight when it is solved and the floor
 * when it is not, and the two weights are `bonus.ts`'s own thresholds rather
 * than numbers of their own - a change to what "hard" means moves this with it,
 * instead of leaving a round quietly priced against a threshold that has gone.
 *
 * Not solved pays the floor rather than nothing, for the reason written in
 * `bonus.ts`: this platform does not punish, and a player who reached the box
 * with a real word has already earned something.
 */
export function sharedQuality(count: number, solved: boolean): number {
  if (!solved) return 0;
  return count >= 3 ? HARD_Q : MEDIUM_Q;
}
