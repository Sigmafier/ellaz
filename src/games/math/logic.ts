// Math quiz - pure logic. Seven levels in two families.
//
// ARITHMETIC (ages ~6+): addition/subtraction within 0..5, 0..10, or 0..20,
// plus multiplication (a×b, a,b in 1..5).
//
// PRE-ARITHMETIC (ages 4-5, no numerals to decode): count a group of pictures,
// match a numeral to the group that has that many, and add/subtract two groups
// you can actually see. These are levels of the SAME game, so they share the
// `answer` + `choices` contract with the arithmetic levels and `isCorrect`
// needs no knowledge of which mode it is judging.
//
// Every operand and answer stays inside the level's range. Deterministic given
// a RNG. No DOM.
// Both imports reach the MODULE, not the `@shared` barrel, and deliberately so:
// the barrel also re-exports React components (Prompt, useGameTimer), and this
// file is the pure logic core - it must stay free of React and the DOM.
import { pick, randInt, shuffle } from "@shared/rng";
import { castOf, type CastTheme } from "@shared/cast";

export type Op = "+" | "-" | "×";

export type MathLevel = "count" | "match" | "visual" | "up5" | "up10" | "up20" | "mult";

/**
 * Which operations an arithmetic (addsub) level may draw. `"mixed"` flips a coin
 * exactly as the game always did; `"add"` / `"sub"` pin every problem to one
 * operator. It only affects the addsub levels - `count`/`match` are addition by
 * construction, `mult` is always ×, and `visual` keeps its own random +/-.
 */
export type OpMode = "add" | "sub" | "mixed";

/** What the player is being asked to do - the renderer's discriminant. */
export type MathMode = "arith" | "count" | "match" | "visual";

/** How to draw the answer buttons: as numerals, or as groups of `n` glyphs. */
export type ChoiceKind = "number" | "group";

export interface LevelConfig {
  kind: "addsub" | "mult" | "count" | "match" | "visual";
  // Inclusive bounds every answer and choice must stay within.
  min: number;
  max: number;
  // For addsub only: the largest a single operand may take. Defaults to `max`
  // (operands and the sum share one ceiling). Set BELOW `max` to cap each
  // operand while letting the sum run higher — `up5` uses opMax 5 with max 10,
  // so both addends reach 5 and 5 + 5 = 10 is a real problem.
  opMax?: number;
}

// Single source of truth for each level's numeric range and operation family.
//
// The pre-arithmetic caps are age limits, not arbitrary: a four-year-old counts
// a group of 10 by pointing at each item, but cannot tell a group of 7 from a
// group of 8 at a glance - so `match`, where the groups ARE the answer buttons
// and must be told apart visually, stops at 6.
export const LEVELS: Record<MathLevel, LevelConfig> = {
  count: { kind: "count", min: 1, max: 10 },
  match: { kind: "match", min: 1, max: 6 },
  visual: { kind: "visual", min: 1, max: 10 },
  up5: { kind: "addsub", min: 0, max: 10, opMax: 5 }, // both addends up to 5 → sum up to 10
  up10: { kind: "addsub", min: 0, max: 10 },
  up20: { kind: "addsub", min: 0, max: 20 },
  mult: { kind: "mult", min: 1, max: 25 }, // a,b in 1..5 → product 1..25
};

const N_CHOICES = 3;

// The things a pre-arithmetic problem counts, drawn from the shared cast.
//
// Only themes of DISCRETE, countable objects are eligible. `nature` is excluded
// on purpose: a child counts four apples happily, but "how many 🌊?" is not a
// question - mass nouns have no plural a five-year-old can point at.
const COUNT_THEMES: readonly CastTheme[] = ["fruit", "toys", "food", "animals"];

/** One glyph to count: a random theme, then a random member of it. */
function pickGlyph(rng: () => number): string {
  return pick(castOf(pick(COUNT_THEMES, rng)), rng).emoji;
}

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
  level: MathLevel;
  choices: number[]; // the correct answer plus distractors, shuffled
  /** Which kind of question this is. */
  mode: MathMode;
  /** How the renderer should draw `choices`. */
  choiceKind: ChoiceKind;
  /**
   * The emoji-group sizes making up the QUESTION, in reading order:
   * `[n]` for counting, `[a, b]` for visual add/subtract, and `[]` when the
   * question is a numeral (matching) or an equation (arithmetic).
   */
  groups: number[];
  /** The emoji to draw, for every mode that draws groups. */
  glyph?: string;
}

// Build `n` wrong answers within [min, max], preferring numbers near the answer
// so the choices feel plausible.
function distractors(
  answer: number,
  n: number,
  min: number,
  max: number,
  rng: () => number,
): number[] {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2].filter(
    (v) => v >= min && v <= max && v !== answer,
  );
  const far = [];
  for (let v = min; v <= max; v++) if (v !== answer && !near.includes(v)) far.push(v);
  const pool = [...shuffle(near, rng), ...shuffle(far, rng)];
  const out: number[] = [];
  for (const v of pool) {
    if (out.length >= n) break;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

export function generateProblem(
  level: MathLevel = "up10",
  rng: () => number = Math.random,
  opMode: OpMode = "mixed",
): Problem {
  const cfg = LEVELS[level];
  let a: number, b: number, op: Op, answer: number;
  let mode: MathMode = "arith";
  let choiceKind: ChoiceKind = "number";
  let groups: number[] = [];
  let glyph: string | undefined;

  // The pre-arithmetic branches come first but only ever run for their own
  // levels, so the arithmetic draw sequence below is untouched - the same seed
  // still yields the same up5/up10/up20/mult problems it always did.
  if (cfg.kind === "count") {
    // "How many apples?" - one group of pictures, answered with a numeral.
    mode = "count";
    glyph = pickGlyph(rng);
    op = "+";
    a = randInt(cfg.min, cfg.max, rng);
    b = 0;
    answer = a;
    groups = [a];
  } else if (cfg.kind === "match") {
    // The mirror image: a numeral is the question, and the groups are the
    // answer buttons. Nothing to draw above the choices.
    mode = "match";
    choiceKind = "group";
    glyph = pickGlyph(rng);
    op = "+";
    a = randInt(cfg.min, cfg.max, rng);
    b = 0;
    answer = a;
    groups = [];
  } else if (cfg.kind === "visual") {
    // Two groups you can see, combined. Both groups stay non-empty (a picture
    // of nothing is not a picture), which also keeps the answer above zero.
    mode = "visual";
    glyph = pickGlyph(rng);
    op = rng() < 0.5 ? "+" : "-";
    if (op === "+") {
      a = randInt(1, cfg.max - 1, rng);
      b = randInt(1, cfg.max - a, rng); // a + b <= max
      answer = a + b;
    } else {
      a = randInt(2, cfg.max, rng);
      b = randInt(1, a - 1, rng); // a - b >= 1
      answer = a - b;
    }
    groups = [a, b];
  } else if (cfg.kind === "mult") {
    op = "×";
    a = randInt(1, 5, rng);
    b = randInt(1, 5, rng);
    answer = a * b;
  } else {
    // Honour the chosen operation. "mixed" flips a coin exactly as before, so a
    // "mixed" draw is byte-identical to the old sequence; a pinned op consumes
    // no rng, keeping the two forced modes independent of the mixed one.
    op = opMode === "add" ? "+" : opMode === "sub" ? "-" : rng() < 0.5 ? "+" : "-";
    // Zero is a real number worth meeting, but a run full of "5+0" and "3-0"
    // drills nothing - so keep it rare. Most problems draw operands from
    // 1..max; only about one in six allows a zero operand.
    const lo = rng() < 1 / 6 ? cfg.min : Math.min(cfg.min + 1, cfg.max);
    const opMax = cfg.opMax ?? cfg.max; // per-operand ceiling
    if (op === "+") {
      // Cap `a` by `opMax` AND so a non-zero `b` still fits under `max` (when lo
      // is 0, `a` may take its ceiling and `b` is then forced to 0).
      const aMax = Math.min(opMax, lo === cfg.min ? cfg.max : cfg.max - 1);
      a = randInt(lo, aMax, rng);
      b = randInt(lo, Math.min(opMax, cfg.max - a), rng); // b <= opMax, a + b <= max
      answer = a + b;
    } else {
      a = randInt(lo, Math.min(opMax, cfg.max), rng);
      b = randInt(lo, a, rng); // a - b >= min, and b <= a <= opMax
      answer = a - b;
    }
  }

  const choices = shuffle(
    [answer, ...distractors(answer, N_CHOICES - 1, cfg.min, cfg.max, rng)],
    rng,
  );
  return { a, b, op, answer, level, choices, mode, choiceKind, groups, glyph };
}

export function isCorrect(problem: Problem, choice: number): boolean {
  return choice === problem.answer;
}
