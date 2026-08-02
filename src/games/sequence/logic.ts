// "What comes next?" — pattern continuation for 4-6 year olds. PURE logic:
// zero DOM, zero React, zero Phaser. Everything is driven by an injectable `rng`
// (LAST parameter, defaulting to `Math.random`) so a seeded generator replays a
// round exactly, which is what the tests lean on.
//
// A round is a row of visible items with the last slot blank, plus 3-4 answer
// choices. The child taps the one that continues the pattern.
//
// THE DISTRACTORS ARE THE GAME. A round with unrelated glyphs in the choice row
// is trivial (the odd one out IS the answer), and a round whose distractor is
// indistinguishable from the answer is unfair. So every wrong choice here is one
// of two things: another element OF THE PATTERN (preferred, always offered first
// when one exists), or a near-sibling from the same visual family — a different
// colour from the same palette, a different shape in the same colour, the same
// character at the other size, a number one step off. `logic.test.ts` pins both
// halves: exactly one choice equals the answer, and no other choice does.
import { pick, randInt, shuffle } from "@shared/rng";
import { SHAPE_IDS, type ShapeId } from "@shared/shapes";
import { CAST_THEMES, drawCast } from "@shared/cast";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * The palette. Deliberately small and deliberately far apart: two colours a
 * five-year-old cannot tell apart at 48px turn a pattern game into a guessing
 * game, so there is no second red and no second blue here.
 */
export const SEQ_COLORS = [
  { id: "red", hex: "#ff6b6b" },
  { id: "blue", hex: "#4dabf7" },
  { id: "yellow", hex: "#ffd43b" },
  { id: "green", hex: "#51cf66" },
  { id: "purple", hex: "#b197fc" },
  { id: "orange", hex: "#ffa94d" },
] as const;

export type ColorId = (typeof SEQ_COLORS)[number]["id"];

/** Hex for a palette id. Throws on an unknown id rather than rendering nothing. */
export function colorHex(id: ColorId): string {
  const found = SEQ_COLORS.find((c) => c.id === id);
  if (!found) throw new Error(`[ellaz] unknown sequence colour: ${String(id)}`);
  return found.hex;
}

/** One element of a pattern row. The renderer switches on `kind`. */
export type SeqItem =
  | { kind: "color"; color: ColorId }
  | { kind: "shape"; shape: ShapeId; color: ColorId }
  | { kind: "glyph"; emoji: string; scale: "big" | "small" }
  | { kind: "number"; value: number };

/** A stable string identity for an item — comparison key and React key in one. */
export function itemKey(item: SeqItem): string {
  switch (item.kind) {
    case "color":
      return `color:${item.color}`;
    case "shape":
      return `shape:${item.shape}:${item.color}`;
    case "glyph":
      return `glyph:${item.emoji}:${item.scale}`;
    case "number":
      return `number:${item.value}`;
    default:
      throw new Error(`[ellaz] unknown sequence item: ${JSON.stringify(item)}`);
  }
}

export function sameItem(a: SeqItem, b: SeqItem): boolean {
  return itemKey(a) === itemKey(b);
}

/**
 * The difficulty ladder. This is the ladder, not a config surface: a family is
 * added here and generated below, never assembled by a caller.
 */
export const FAMILY_IDS = [
  "ABAB",
  "AAB",
  "ABC",
  "AABB",
  "SIZE",
  "ABBA",
  "GROW",
  "NUMBER",
] as const;

export type FamilyId = (typeof FAMILY_IDS)[number];

export const FAMILIES: Record<Difficulty, readonly FamilyId[]> = {
  easy: ["ABAB", "AAB"],
  medium: ["ABC", "AABB", "SIZE"],
  hard: ["ABBA", "GROW", "NUMBER"],
};

type CyclicFamily = "ABAB" | "AAB" | "ABC" | "AABB" | "SIZE" | "ABBA";

/**
 * The repeating families, as index cycles over their atom list. `SIZE` is an
 * ABAB over ONE character's two sizes rather than two characters, which is why
 * it gets its own id even though it shares a cycle with ABAB.
 */
const CYCLES: Record<CyclicFamily, readonly number[]> = {
  ABAB: [0, 1],
  AAB: [0, 0, 1],
  ABC: [0, 1, 2],
  AABB: [0, 0, 1, 1],
  SIZE: [0, 1],
  ABBA: [0, 1, 1, 0],
};

/**
 * Cycle length of a repeating family, or 0 for the two that do not repeat.
 * Exported so a test can verify periodicity WITHOUT re-deriving the generator.
 */
export const PERIOD: Record<FamilyId, number> = {
  ABAB: 2,
  AAB: 3,
  ABC: 3,
  AABB: 4,
  SIZE: 2,
  ABBA: 4,
  GROW: 0,
  NUMBER: 0,
};

function isCyclic(family: FamilyId): family is CyclicFamily {
  return family in CYCLES;
}

// Six visible items plus the blank shows two-and-a-half cycles of the longest
// family, which is what makes the rule legible without a child counting. Numbers
// get one fewer because digits read slower than colours.
const SHOWN = 6;
const SHOWN_NUMBER = 5;

const CHOICE_COUNT: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4 };

/** Atoms are the pattern's own elements; siblings are the near-miss distractors. */
interface AtomSet {
  atoms: SeqItem[];
  siblings: SeqItem[];
}

function colorAtoms(n: number, rng: () => number): AtomSet {
  const take = Math.min(SEQ_COLORS.length, n + 3);
  const drawn = shuffle(SEQ_COLORS, rng).slice(0, take);
  const items = drawn.map((c): SeqItem => ({ kind: "color", color: c.id }));
  return { atoms: items.slice(0, n), siblings: items.slice(n) };
}

function shapeAtoms(n: number, rng: () => number): AtomSet {
  // One colour for the whole round, so the pattern is unambiguously about SHAPE.
  const color = pick(SEQ_COLORS, rng).id;
  const take = Math.min(SHAPE_IDS.length, n + 3);
  const drawn = shuffle(SHAPE_IDS, rng).slice(0, take);
  const items = drawn.map((shape): SeqItem => ({ kind: "shape", shape, color }));
  return { atoms: items.slice(0, n), siblings: items.slice(n) };
}

function sizeAtoms(rng: () => number): AtomSet {
  const theme = pick(CAST_THEMES, rng);
  const cast = drawCast(theme, 3, rng);
  const at = (emoji: string, scale: "big" | "small"): SeqItem => ({ kind: "glyph", emoji, scale });
  return {
    atoms: [at(cast[0].emoji, "big"), at(cast[0].emoji, "small")],
    siblings: [
      at(cast[1].emoji, "big"),
      at(cast[1].emoji, "small"),
      at(cast[2].emoji, "big"),
      at(cast[2].emoji, "small"),
    ],
  };
}

/** Colours or shapes, decided by the rng so a seeded round is reproducible. */
function pictureAtoms(n: number, rng: () => number): AtomSet {
  return rng() < 0.5 ? colorAtoms(n, rng) : shapeAtoms(n, rng);
}

export interface Round {
  difficulty: Difficulty;
  family: FamilyId;
  /** The visible row. The blank slot comes after these. */
  shown: SeqItem[];
  /** What belongs in the blank. */
  answer: SeqItem;
  /** 3-4 options, exactly one of which equals `answer`. */
  choices: SeqItem[];
  answerIndex: number;
}

/** `shown` plus the answer — the sequence the pattern rule actually describes. */
export function fullSequence(round: Round): SeqItem[] {
  return [...round.shown, round.answer];
}

export function isCorrect(round: Round, choiceIndex: number): boolean {
  return choiceIndex === round.answerIndex;
}

/**
 * The full sequence for a family, plus the distractor pool IN PREFERENCE ORDER
 * (other pattern elements first, near-siblings after).
 */
function generate(family: FamilyId, rng: () => number): { full: SeqItem[]; pool: SeqItem[] } {
  if (family === "NUMBER") {
    // Small steps and a small start: 2 4 6 8 10 12, 1 2 3 4 5 6, 5 10 15 20 25 30.
    const step = pick([1, 2, 5], rng);
    const start = step * randInt(1, 3, rng);
    const full = Array.from(
      { length: SHOWN_NUMBER + 1 },
      (_, i): SeqItem => ({ kind: "number", value: start + i * step }),
    );
    const value = start + SHOWN_NUMBER * step;
    // Preferred first: the number already on the row (a child who stops counting
    // repeats the last one), then the overshoot, then the off-by-ones.
    const candidates = [value - step, value + step, value + 1, value - 1, value + 2 * step];
    const pool = candidates
      .filter((v) => v > 0 && v !== value)
      .map((v): SeqItem => ({ kind: "number", value: v }));
    return { full, pool };
  }

  if (family === "GROW") {
    // A, then runs of B that grow by one: A B A B B A B B B ...
    const { atoms, siblings } = pictureAtoms(2, rng);
    const [a, b] = atoms;
    const full: SeqItem[] = [];
    for (let run = 1; full.length < SHOWN + 1; run++) {
      full.push(a);
      for (let k = 0; k < run && full.length < SHOWN + 1; k++) full.push(b);
    }
    const answer = full[full.length - 1];
    const pool = [...atoms.filter((x) => !sameItem(x, answer)), ...shuffle(siblings, rng)];
    return { full, pool };
  }

  if (!isCyclic(family)) throw new Error(`[ellaz] unknown pattern family: ${String(family)}`);

  const cycle = CYCLES[family];
  const needed = Math.max(...cycle) + 1;
  const { atoms, siblings } = family === "SIZE" ? sizeAtoms(rng) : pictureAtoms(needed, rng);
  const full = Array.from({ length: SHOWN + 1 }, (_, i) => atoms[cycle[i % cycle.length]]);
  const answer = full[full.length - 1];
  const pool = [...atoms.filter((x) => !sameItem(x, answer)), ...shuffle(siblings, rng)];
  return { full, pool };
}

/**
 * Take the first `count - 1` DISTINCT non-answer items from the pool, then
 * shuffle the answer in among them. Consuming the pool in order is deliberate —
 * it is what guarantees a real pattern element is always on offer.
 */
function buildChoices(
  answer: SeqItem,
  pool: SeqItem[],
  count: number,
  rng: () => number,
): { choices: SeqItem[]; answerIndex: number } {
  const seen = new Set([itemKey(answer)]);
  const distractors: SeqItem[] = [];
  for (const candidate of pool) {
    if (distractors.length >= count - 1) break;
    const key = itemKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
  }
  const choices = shuffle([answer, ...distractors], rng);
  return { choices, answerIndex: choices.findIndex((c) => sameItem(c, answer)) };
}

/** A fresh round at `difficulty`. Deterministic for a given `rng`. */
export function newRound(difficulty: Difficulty, rng: () => number = Math.random): Round {
  const family = pick(FAMILIES[difficulty], rng);
  const { full, pool } = generate(family, rng);
  const answer = full[full.length - 1];
  const { choices, answerIndex } = buildChoices(answer, pool, CHOICE_COUNT[difficulty], rng);
  return { difficulty, family, shown: full.slice(0, -1), answer, choices, answerIndex };
}
