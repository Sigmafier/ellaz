// "Big & Small" / גדול וקטן - pure logic for a PRE-NUMERIC size game.
//
// This is deliberately NOT a math game. A three-year-old can see that one
// elephant is bigger than another long before she can count, so every round is
// a judgement about visual magnitude and nothing else.
//
// THE DIFFICULTY LEVER IS THE SCALE RATIO, and it is the whole game. Easy puts
// 2.5x between neighbouring sizes (unmistakable); hard puts 1.25x (a real
// judgement). A round whose two neighbours differ by LESS than the difficulty's
// minimum ratio is an UNFAIR round - the child is being asked to see a
// difference that is not reliably there - and that is exactly the bug this game
// could ship with invisibly, because it still looks like a working game. So the
// ratio lives here as DATA, `sizeLadder` guarantees the floor by construction,
// and `logic.test.ts` asserts it per difficulty.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`, matching every other game in the repo. Imports are the
// DIRECT module paths (`@shared/rng`, `@shared/cast`) rather than the `@shared`
// barrel, because the barrel re-exports React components and a pure logic module
// must not reach them.
import { CAST_THEMES, castOf, type CastItem } from "@shared/cast";
import { pick, randInt, shuffle } from "@shared/rng";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * - `pick`   - three items, tap the biggest (or the smallest).
 * - `order`  - tap every item in order, smallest-to-largest or the reverse.
 * - `bucket` - tap an item then a bin, sorting everything into BIG and SMALL.
 *
 * All three are TAP-COMPLETABLE. Nothing here requires a drag: a five-year-old
 * on a phone, and anyone on assistive input, cannot reliably hold a sustained
 * pointer gesture (see the kids rule in CLAUDE.md).
 */
export type RoundKind = "pick" | "order" | "bucket";

export type Bin = "small" | "big";

export interface LevelConfig {
  kind: RoundKind;
  /** How many items are on screen. */
  count: number;
  /**
   * The MINIMUM ratio between two neighbouring sizes - the difficulty lever.
   * Every pair in a round is at least this far apart, because the sizes form a
   * geometric ladder with this as its step.
   */
  minRatio: number;
  /** The smallest glyph in px, drawn per round from this INCLUSIVE range. */
  base: [number, number];
}

export const LEVELS: Record<Difficulty, LevelConfig> = {
  // 2.5x - a toddler cannot get this wrong by looking.
  easy: { kind: "pick", count: 3, minRatio: 2.5, base: [20, 24] },
  // 1.6x - still obvious one pair at a time, but four of them must be ordered.
  medium: { kind: "order", count: 4, minRatio: 1.6, base: [30, 34] },
  // 1.25x - the narrowest gap we ship. Any narrower and the round stops being
  // fair on a phone screen.
  hard: { kind: "bucket", count: 6, minRatio: 1.25, base: [38, 42] },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface SizedItem {
  id: string;
  emoji: string;
  /** Hebrew name of the character - the primary string. */
  he: string;
  en: string;
  /** Rendered glyph size in px. */
  size: number;
  /** 0 = smallest in this round. Never leaks through display position. */
  rank: number;
}

export interface Round {
  kind: RoundKind;
  difficulty: Difficulty;
  /** Carried on the round so a renderer or a test can audit the fairness floor. */
  minRatio: number;
  /** Display order - SHUFFLED, so rank is not readable from position. */
  items: SizedItem[];
  /** `pick` only: which extreme is being asked for. */
  target: "biggest" | "smallest" | null;
  /** `order` only: which direction is being asked for. */
  direction: "asc" | "desc" | null;
  /** `pick`: the one winning id. `order`: every id in the order asked. `bucket`: empty. */
  solution: string[];
  /** `bucket`: the bin each id belongs in. Empty for the other kinds. */
  bins: Record<string, Bin>;
}

/**
 * A geometric ladder of whole-pixel sizes.
 *
 * `Math.ceil` is load-bearing, not cosmetic: it guarantees
 * `sizes[i] / sizes[i - 1] >= ratio` even after rounding to whole pixels.
 * Rounding to NEAREST would quietly drop a pair below the floor (at 1.25,
 * `round(55 * 1.25) = 69` and `69 / 55` is fine, but `round(69 * 1.25) = 86`
 * gives 1.246 - an unfair pair produced by a rounding mode).
 */
export function sizeLadder(base: number, ratio: number, count: number): number[] {
  const sizes = [Math.round(base)];
  for (let i = 1; i < count; i++) sizes.push(Math.ceil(sizes[i - 1] * ratio));
  return sizes;
}

/** A fresh, well-formed round for a difficulty. Deterministic given an `rng`. */
export function makeRound(difficulty: Difficulty, rng: () => number = Math.random): Round {
  const cfg = LEVELS[difficulty];

  // ONE character per round, at several sizes. Mixing glyphs would confound the
  // question: a bee and an elephant drawn at the same font-size do not have the
  // same visual mass, so "which is bigger" would stop being a pure size
  // judgement and start being a trivia question about animals.
  const character: CastItem = pick(castOf(pick(CAST_THEMES, rng)), rng);
  const sizes = sizeLadder(randInt(cfg.base[0], cfg.base[1], rng), cfg.minRatio, cfg.count);

  const ordered: SizedItem[] = sizes.map((size, rank) => ({
    id: `i${rank}`,
    emoji: character.emoji,
    he: character.he,
    en: character.en,
    size,
    rank,
  }));

  const target = cfg.kind === "pick" ? (rng() < 0.5 ? "biggest" : "smallest") : null;
  const direction = cfg.kind === "order" ? (rng() < 0.5 ? "asc" : "desc") : null;

  let solution: string[] = [];
  if (cfg.kind === "pick") {
    solution = [target === "biggest" ? ordered[ordered.length - 1].id : ordered[0].id];
  } else if (cfg.kind === "order") {
    const seq = direction === "asc" ? ordered : [...ordered].reverse();
    solution = seq.map((i) => i.id);
  }

  const bins: Record<string, Bin> = {};
  if (cfg.kind === "bucket") {
    // The split is the median, so the decisive pair is the one straddling it -
    // and that pair is exactly `minRatio` apart, same as every other neighbour.
    const half = Math.floor(cfg.count / 2);
    ordered.forEach((item, i) => {
      bins[item.id] = i < half ? "small" : "big";
    });
  }

  return {
    kind: cfg.kind,
    difficulty,
    minRatio: cfg.minRatio,
    items: shuffle(ordered, rng),
    target,
    direction,
    solution,
    bins,
  };
}

export interface RoundState {
  round: Round;
  /** Ids answered CORRECTLY, in the order they were answered. */
  progress: string[];
  /** `bucket`: where each item has been placed so far. */
  placed: Record<string, Bin>;
  /** `bucket`: the item waiting for a bin. */
  selected: string | null;
}

export function initState(round: Round): RoundState {
  return { round, progress: [], placed: {}, selected: null };
}

/** `makeRound` + `initState`, the call a renderer actually wants. */
export function newGame(difficulty: Difficulty, rng: () => number = Math.random): RoundState {
  return initState(makeRound(difficulty, rng));
}

/** How many correct taps finish this round. */
export function requiredTaps(round: Round): number {
  return round.kind === "bucket" ? round.items.length : round.solution.length;
}

export function isComplete(state: RoundState): boolean {
  return state.progress.length >= requiredTaps(state.round);
}

/** The id the player must tap next in an `order` or `pick` round, if any. */
export function nextExpected(state: RoundState): string | null {
  if (state.round.kind === "bucket" || isComplete(state)) return null;
  return state.round.solution[state.progress.length] ?? null;
}

/**
 * `correct`  - banked; `done` says whether that finished the round.
 * `selected` - a bucket item is now waiting for a bin.
 * `wrong`    - gentle miss. State is UNCHANGED: nothing is lost, nothing resets.
 * `ignored`  - a tap that means nothing here (already answered, round over).
 */
export type TapKind = "correct" | "wrong" | "selected" | "ignored";

export interface TapOutcome {
  kind: TapKind;
  state: RoundState;
  done: boolean;
}

export function tapItem(state: RoundState, id: string): TapOutcome {
  const { round } = state;
  const done = isComplete(state);
  if (done || !round.items.some((i) => i.id === id)) return { kind: "ignored", state, done };

  if (round.kind === "bucket") {
    if (state.placed[id]) return { kind: "ignored", state, done: false };
    return { kind: "selected", state: { ...state, selected: id }, done: false };
  }

  if (state.progress.includes(id)) return { kind: "ignored", state, done: false };
  if (id !== round.solution[state.progress.length]) return { kind: "wrong", state, done: false };

  const next: RoundState = { ...state, progress: [...state.progress, id] };
  return { kind: "correct", state: next, done: isComplete(next) };
}

export function tapBin(state: RoundState, bin: Bin): TapOutcome {
  const { round } = state;
  const done = isComplete(state);
  if (done || round.kind !== "bucket" || !state.selected) return { kind: "ignored", state, done };

  const id = state.selected;
  // A wrong bin KEEPS the selection, so the fix is one tap on the other bin
  // rather than a re-selection the child has to figure out.
  if (round.bins[id] !== bin) return { kind: "wrong", state, done: false };

  const next: RoundState = {
    ...state,
    placed: { ...state.placed, [id]: bin },
    progress: [...state.progress, id],
    selected: null,
  };
  return { kind: "correct", state: next, done: isComplete(next) };
}

/** The round's items smallest-first. Handy for renderers and tests. */
export function byRank(round: Round): SizedItem[] {
  return [...round.items].sort((a, b) => a.rank - b.rank);
}
