// Merge - pure game logic for the combine-two-into-the-next-one-up mechanic.
//
// TAP, NEVER DRAG. Every merge game a child has seen is a drag game, and drag
// is exactly what a five-year-old on a phone - and anyone on assistive input -
// cannot reliably hold. So the model here is a SELECTION plus a reducer: tap a
// creature to pick it up, tap another to put it there. A renderer is free to
// add drag on top, but it may never be the only way through (see the kids rule
// in CLAUDE.md). That is why there is no `drag(from, to)` in this file.
//
// ENDLESS, so there is no completion and this file grants NOTHING. It reports
// what happened - a merge, the rung it reached, whether that rung is new this
// run - and the renderer decides what to do with it via `winMoment`. The earn
// table lives in `src/sdk/economy.ts` and nowhere else.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`. Imports are the DIRECT module paths rather than the
// `@shared` barrel, which re-exports React components.
import type { ShippedLocale } from "@i18n/locales";
import { randInt } from "@shared/rng";

/**
 * A rung of the ladder: the face a child sees, plus its name in every language
 * a human has written one for.
 *
 * `Record<PageLocale, string>` rather than `he: string; en: string`, so the day
 * a language is promoted the compiler demands a name for every creature instead
 * of quietly handing a Spanish player an English aria-label. Same gate as
 * `CastItem` in `@shared/cast`.
 */
export type Creature = Record<ShippedLocale, string> & {
  /** The glyph the renderer draws. */
  emoji: string;
};

/**
 * THE THEME IS DATA, and the rules never read it. Nothing below this constant
 * knows what a caterpillar is - a tier is an index, a merge is `t -> t + 1`, and
 * the whole ladder can be re-skinned as fruit, vehicles or spaceships by
 * replacing this array. The only property the rules depend on is its LENGTH.
 *
 * It climbs by SIZE, because that is the story a pre-reader reads without being
 * told: two little ones make a bigger one. Faces are picked to stay distinct at
 * 40px on a phone - the same judgement `@shared/cast` documents - so no two
 * rungs are a caterpillar and a worm.
 */
export const LADDER: readonly Creature[] = [
  { emoji: "🐛", he: "זחל", en: "caterpillar", es: "oruga" },
  { emoji: "🐝", he: "דבורה", en: "bee", es: "abeja" },
  { emoji: "🦋", he: "פרפר", en: "butterfly", es: "mariposa" },
  { emoji: "🐸", he: "צפרדע", en: "frog", es: "rana" },
  { emoji: "🐢", he: "צב", en: "turtle", es: "tortuga" },
  { emoji: "🐙", he: "תמנון", en: "octopus", es: "pulpo" },
  { emoji: "🐧", he: "פינגווין", en: "penguin", es: "pingüino" },
  { emoji: "🦊", he: "שועל", en: "fox", es: "zorro" },
  { emoji: "🦓", he: "זברה", en: "zebra", es: "cebra" },
  { emoji: "🦁", he: "אריה", en: "lion", es: "león" },
  { emoji: "🦒", he: "ג'ירפה", en: "giraffe", es: "jirafa" },
  { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" },
  { emoji: "🐋", he: "לווייתן", en: "whale", es: "ballena" },
  { emoji: "🐉", he: "דרקון", en: "dragon", es: "dragón" },
];

export type Difficulty = "easy" | "medium" | "hard";

export interface LevelConfig {
  rows: number;
  cols: number;
  /** How many creatures the board opens with. */
  seed: number;
  /**
   * THE DIFFICULTY LEVER. How many fresh creatures fall back onto the board
   * after a merge, and therefore how fast the board fills.
   *
   * At 0 the board only ever fills by the child's OWN taps on empty squares, so
   * a run can be untidy for a very long time and still be rescued. At 2 every
   * merge costs a square, which is what makes the board eventually run out.
   */
  spawnPerMerge: number;
  /**
   * The highest rung a fresh creature may arrive at. Spawns are drawn from
   * `0..spawnTop`, so easy is always the same tiny creature - trivially
   * pairable - while the harder levels mix two, which climbs faster and pairs
   * less often.
   */
  spawnTop: number;
}

export const LEVELS: Record<Difficulty, LevelConfig> = {
  easy: { rows: 5, cols: 5, seed: 4, spawnPerMerge: 0, spawnTop: 0 },
  medium: { rows: 4, cols: 4, seed: 5, spawnPerMerge: 1, spawnTop: 1 },
  hard: { rows: 4, cols: 4, seed: 6, spawnPerMerge: 2, spawnTop: 1 },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** An empty square is `null`. Anything else is an index into `LADDER`. */
export type Cell = number | null;

export interface MergeState {
  rows: number;
  cols: number;
  /** Row-major, `rows * cols` long. */
  cells: Cell[];
  /** The square the player is holding, or null. Index into `cells`. */
  selected: number | null;
  score: number;
  /**
   * The highest rung this RUN has reached. It never decreases, even after the
   * creature that set it is merged away, because it is the run's story rather
   * than a fact about the board.
   */
  topTier: number;
  merges: number;
  spawnPerMerge: number;
  spawnTop: number;
}

export type TapOutcome =
  | { kind: "ignored" }
  /** A fresh creature arrived on an empty square the player tapped. */
  | { kind: "dropped"; at: number; tier: number }
  /** The player is now holding `at` - either a first pick or a switch. */
  | { kind: "selected"; at: number }
  /** The player put down what they were holding, changing nothing. */
  | { kind: "cleared"; at: number }
  | { kind: "moved"; from: number; to: number }
  | {
      kind: "merged";
      from: number;
      to: number;
      /** The rung that was CREATED, so `LADDER[tier]` is the new face. */
      tier: number;
      gained: number;
      /** This run has never reached `tier` before. */
      newTop: boolean;
      /**
       * A milestone rung, reached for the FIRST time this run.
       *
       * It is gated on `newTop` deliberately. Ungated, a child who makes a
       * second creature at a milestone rung is PAID AGAIN, once per repeat,
       * forever - the same double-grant shape the session rule documents for
       * resume. The renderer fires `grant({ reason: "milestone" })` with
       * `confetti: false` here and latches nothing itself.
       */
      milestone: boolean;
      /** Squares the level's pressure filled after the merge. */
      spawned: number[];
    };

/** Every `MILESTONE_EVERY`-th rung is worth a coin the first time it is reached. */
export const MILESTONE_EVERY = 3;

export function isMilestoneTier(tier: number): boolean {
  return tier > 0 && tier % MILESTONE_EVERY === 0;
}

/** What reaching `tier` is worth. Doubling, so the climb is the point. */
export function tierPoints(tier: number): number {
  return 2 ** (tier + 1);
}

export function cellCount(state: MergeState): number {
  return state.rows * state.cols;
}

export function freeCells(state: MergeState): number[] {
  const out: number[] = [];
  for (let i = 0; i < state.cells.length; i++) if (state.cells[i] === null) out.push(i);
  return out;
}

/** Can any two creatures on the board still be combined? */
export function hasMerge(state: MergeState): boolean {
  const seen = new Set<number>();
  for (const c of state.cells) {
    // The top rung is a ceiling, not a pair - see `mergeInto`.
    if (c === null || c === LADDER.length - 1) continue;
    if (seen.has(c)) return true;
    seen.add(c);
  }
  return false;
}

/**
 * Nothing left to do: no square to drop into and no pair to combine.
 *
 * The free-square half is what makes this honest. A child can always feed the
 * board by tapping an empty square, so a run is only ever over when the board
 * is genuinely full - never merely awkward. The renderer ends the run here
 * rather than leaving a child tapping at a screen that answers nothing.
 *
 * THE LADDER IS DELIBERATELY LONGER THAN THE BOARD, which makes this rare on
 * purpose. 14 rungs against 16 squares means every full board holds a pair by
 * pigeonhole, so the ONLY way to run out is to fill it with creatures already
 * at the ceiling - a child effectively cannot lose. This stays a real check
 * rather than a comment because the renderer needs one honest answer to "is
 * there anything left to tap", and shortening the ladder would arm it.
 */
export function isDead(state: MergeState): boolean {
  return freeCells(state).length === 0 && !hasMerge(state);
}

/**
 * What this run's record MEASURES, in the shape `ctx.score` wants.
 *
 * It reports a VALUE and a UNIT and never a direction - `src/sdk/score.ts`
 * decides that points rank high, so a game cannot order its own board
 * backwards. `board` scopes the record to a difficulty, because a 5x5 with no
 * pressure and a 4x4 dropping two per merge are not the same achievement.
 */
export function scoreReport(
  state: MergeState,
  board: Difficulty,
): { value: number; unit: "points"; board: string } {
  return { value: state.score, unit: "points", board };
}

/** Place one fresh creature on a random free square. Returns where, or -1. */
function spawnOne(cells: Cell[], spawnTop: number, rng: () => number): number {
  const free: number[] = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === null) free.push(i);
  if (free.length === 0) return -1;
  const at = free[randInt(0, free.length - 1, rng)];
  cells[at] = randInt(0, spawnTop, rng);
  return at;
}

export function newGame(level: Difficulty, rng: () => number = Math.random): MergeState {
  const cfg = LEVELS[level];
  const cells: Cell[] = Array(cfg.rows * cfg.cols).fill(null);
  for (let i = 0; i < cfg.seed; i++) spawnOne(cells, cfg.spawnTop, rng);

  return {
    rows: cfg.rows,
    cols: cfg.cols,
    cells,
    selected: null,
    score: 0,
    topTier: cells.reduce<number>((top, c) => (c === null ? top : Math.max(top, c)), 0),
    merges: 0,
    spawnPerMerge: cfg.spawnPerMerge,
    spawnTop: cfg.spawnTop,
  };
}

function mergeInto(
  state: MergeState,
  from: number,
  to: number,
  rng: () => number,
): { state: MergeState; outcome: TapOutcome } {
  const tier = (state.cells[to] as number) + 1;
  const cells = [...state.cells];
  cells[from] = null;
  cells[to] = tier;

  const spawned: number[] = [];
  for (let i = 0; i < state.spawnPerMerge; i++) {
    const at = spawnOne(cells, state.spawnTop, rng);
    // -1 means the board filled mid-spawn. Stop rather than overwrite a
    // creature the child has been building towards.
    if (at === -1) break;
    spawned.push(at);
  }

  const newTop = tier > state.topTier;
  return {
    state: {
      ...state,
      cells,
      selected: null,
      score: state.score + tierPoints(tier),
      topTier: newTop ? tier : state.topTier,
      merges: state.merges + 1,
    },
    outcome: {
      kind: "merged",
      from,
      to,
      tier,
      gained: tierPoints(tier),
      newTop,
      milestone: newTop && isMilestoneTier(tier),
      spawned,
    },
  };
}

/**
 * The whole game, as one reducer: tap a square and something happens.
 *
 * Nothing here ever REFUSES a tap on a creature. Tapping a mismatched one
 * switches the selection instead of rejecting the tap, because a button that
 * answers nothing reads as broken to a child and there is no error to report -
 * they simply changed their mind.
 */
export function tapCell(
  state: MergeState,
  index: number,
  rng: () => number = Math.random,
): { state: MergeState; outcome: TapOutcome } {
  const ignored = { state, outcome: { kind: "ignored" } as const };
  if (index < 0 || index >= state.cells.length) return ignored;
  if (isDead(state)) return ignored;

  const target = state.cells[index];
  const held = state.selected;

  if (held === null) {
    if (target === null) {
      const cells = [...state.cells];
      cells[index] = randInt(0, state.spawnTop, rng);
      return {
        state: { ...state, cells },
        outcome: { kind: "dropped", at: index, tier: cells[index] as number },
      };
    }
    return { state: { ...state, selected: index }, outcome: { kind: "selected", at: index } };
  }

  if (index === held) {
    return { state: { ...state, selected: null }, outcome: { kind: "cleared", at: index } };
  }

  if (target === null) {
    const cells = [...state.cells];
    cells[index] = cells[held];
    cells[held] = null;
    return {
      state: { ...state, cells, selected: null },
      outcome: { kind: "moved", from: held, to: index },
    };
  }

  // The ceiling is refused rather than capped: adding one to the top rung would
  // index off the end of LADDER, and the renderer would draw `undefined` on a
  // board that otherwise looks perfectly normal.
  if (target === state.cells[held] && target < LADDER.length - 1) {
    return mergeInto(state, held, index, rng);
  }

  return { state: { ...state, selected: index }, outcome: { kind: "selected", at: index } };
}
