// The comparability table — PURE, zero I/O, and the single place ranking is decided.
//
// Sibling of economy.ts, and deliberately the same shape: a game reports WHAT
// happened ("the player finished in 12,750 ms") and this module alone decides
// what that is worth relative to anything else. Games never say which way a
// score sorts, for the same reason they never say how many coins they earned.
//
// WHY DIRECTION IS NOT A PARAMETER
// It would be natural to let a game pass `direction: "high" | "low"` alongside
// its value. That hands every game the ability to invert its own leaderboard —
// report `unit: "ms", direction: "high"` and the slowest run ranks first, with
// nothing to catch it but a code review. Direction is a property of what is
// being MEASURED, not of the game doing the measuring, so it is derived from
// the unit here and cannot be overridden. A game that needs a new ranking adds
// a unit to the table below, in the open, once.

export type ScoreDirection = "high" | "low";

/** What the number MEANS. Add a unit here rather than inventing one at a call site. */
export type ScoreUnit =
  /** Score, streak, level reached — more is better. */
  | "points"
  /** Elapsed time in milliseconds — less is better. */
  | "ms"
  /** Moves, taps, guesses spent — less is better. */
  | "moves";

/** The whole ranking policy, in one table. */
export const UNIT_DIRECTION: Record<ScoreUnit, ScoreDirection> = {
  points: "high",
  ms: "low",
  moves: "low",
};

/**
 * Which way a unit sorts.
 *
 * An out-of-union unit falls back to "high" rather than throwing. `SaveStore.get<T>`
 * casts unvalidated JSON, so a hand-edited or truncated save can put any string
 * here, and a thrown error inside a win path would cost a child their moment.
 * Same runtime-check discipline as economy.ts's KNOWN_REASONS.
 */
export function directionFor(unit: ScoreUnit): ScoreDirection {
  return UNIT_DIRECTION[unit] ?? "high";
}

/**
 * Can this value take part in an ordering at all?
 *
 * NaN and the infinities are the score-shaped version of the annihilation trap
 * economy.ts guards against: stored as a best, NaN serialises to null, reads
 * back as 0, and from then on every run either always or never beats it
 * depending on the direction. Rejecting them at the boundary is the only thing
 * that actually holds, because the type says `number` and the storage does not.
 */
export function isRankable(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Is `next` a new personal best against `prev`?
 *
 * - No previous best (or an unrankable one) → any rankable score wins. A corrupt
 *   save must not permanently block every future best.
 * - A TIE is not a best. Beating your record means beating it.
 * - An unrankable candidate never wins, whatever it is compared against.
 *
 * `prev` is typed optional but checked structurally, because a stored `0` is a
 * legitimate best (zero moves, zero ms) and `prev || fallback` would silently
 * treat it as absent.
 */
export function isBetter(next: number, prev: number | undefined, direction: ScoreDirection): boolean {
  if (!isRankable(next)) return false;
  if (prev === undefined || !isRankable(prev)) return true;
  return direction === "low" ? next < prev : next > prev;
}

/** The better of two values. Junk loses to anything rankable. */
export function bestOf(a: number, b: number, direction: ScoreDirection): number {
  if (!isRankable(a)) return b;
  if (!isRankable(b)) return a;
  return direction === "low" ? Math.min(a, b) : Math.max(a, b);
}

/**
 * How a score is shown to a child.
 *
 * Times read as seconds because "12750" means nothing to a five-year-old and
 * "12.8s" does. An unrankable value renders as an em-dash placeholder rather
 * than the word NaN — the display is the last place a corrupt save should
 * surface, and "—" reads as "nothing yet" to a child, which is the truth.
 *
 * Past a minute it flips to m:ss. A reaction tap is a thing you measure in
 * tenths; a sudoku board is not, and "423.4s" is the same number rendered
 * unreadably. The threshold is applied to the ROUNDED tenth, not the raw
 * value, so 59.96s cannot print as "60.0s" — a time that does not exist.
 */
const MINUTE_MS = 60_000;

export function formatScore(value: number, unit: ScoreUnit): string {
  if (!isRankable(value)) return "—";
  if (unit !== "ms") return String(Math.round(value));

  const tenths = `${(value / 1000).toFixed(1)}s`;
  if (value < MINUTE_MS && tenths !== "60.0s") return tenths;

  const totalSeconds = Math.round(value / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
