// Math quiz — pure logic. Four difficulty levels: addition/subtraction within
// 0..5, 0..10, or 0..20, plus a multiplication mode (a×b, a,b in 1..5). Every
// operand and answer stays inside the level's range. Deterministic given a RNG.
// No DOM.
import { randInt, shuffle } from "@shared/rng";

export type Op = "+" | "-" | "×";

export type MathLevel = "up5" | "up10" | "up20" | "mult";

export interface LevelConfig {
  kind: "addsub" | "mult";
  // Inclusive bounds every operand, answer, and choice must stay within.
  min: number;
  max: number;
}

// Single source of truth for each level's numeric range and operation family.
export const LEVELS: Record<MathLevel, LevelConfig> = {
  up5: { kind: "addsub", min: 0, max: 5 },
  up10: { kind: "addsub", min: 0, max: 10 },
  up20: { kind: "addsub", min: 0, max: 20 },
  mult: { kind: "mult", min: 1, max: 25 }, // a,b in 1..5 → product 1..25
};

const N_CHOICES = 3;

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
  level: MathLevel;
  choices: number[]; // the correct answer plus distractors, shuffled
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
): Problem {
  const cfg = LEVELS[level];
  let a: number, b: number, op: Op, answer: number;

  if (cfg.kind === "mult") {
    op = "×";
    a = randInt(1, 5, rng);
    b = randInt(1, 5, rng);
    answer = a * b;
  } else {
    op = rng() < 0.5 ? "+" : "-";
    if (op === "+") {
      a = randInt(cfg.min, cfg.max, rng);
      b = randInt(cfg.min, cfg.max - a, rng); // a + b <= max
      answer = a + b;
    } else {
      a = randInt(cfg.min, cfg.max, rng);
      b = randInt(cfg.min, a, rng); // a - b >= min
      answer = a - b;
    }
  }

  const choices = shuffle(
    [answer, ...distractors(answer, N_CHOICES - 1, cfg.min, cfg.max, rng)],
    rng,
  );
  return { a, b, op, answer, level, choices };
}

export function isCorrect(problem: Problem, choice: number): boolean {
  return choice === problem.answer;
}
