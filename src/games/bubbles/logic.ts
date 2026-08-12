// Catch the Bubbles ("תפסו בועות") — PURE logic. No DOM, no React, no Phaser,
// and NO simulation loop: where a bubble IS on screen is the renderer's
// question, answered by the Web Animations API through `@shared/spawn`. This
// file only decides WHAT a bubble carries and WHETHER the round is done.
//
// Modules are imported by DIRECT path, never through the `@shared` barrel — the
// barrel re-exports `Prompt` and `winMoment`, which pull React and the portal
// in, and the purity gate at `src/games/logic-is-pure.test.ts` fails on it.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE LADDER IS BUILT AROUND LOOK-ALIKE CHARACTERS, NOT AROUND SPEED ALONE.
//
// A four-year-old who is still learning that ב and כ are two letters should not
// be asked to tell them apart in order to play. Speed is the easy lever and the
// wrong one to lean on: a slow round full of look-alikes is still a reading
// test. So each level declares a policy over CONFUSION GROUPS —
//
//   easy    AVOID  — no bubble in the round can be mistaken for the target
//   medium  ALLOW  — look-alikes turn up when the draw produces them
//   hard    PREFER — look-alikes are seeded on purpose; the round IS the
//                    discrimination exercise
//
// `logic.test.ts` pins easy at exactly zero look-alikes across 120 rounds per
// locale, with medium as the positive control that proves the zero is real and
// not a broken comparison returning false for everything.
// ─────────────────────────────────────────────────────────────────────────────
import type { Locale } from "@i18n/index";
import { pick, shuffle } from "@shared/rng";
import { SPAWN_PRESETS, type SpawnDifficulty, type SpawnSpec } from "@shared/spawn.pure";

/** Same three rungs as every other game, and the same three spawn presets. */
export type Difficulty = SpawnDifficulty;

const DIGITS = "0123456789".split("");

/**
 * The 22 base Hebrew letters. The five FINAL (sofit) forms are DELIBERATELY
 * absent: a sofit is the same letter in a different position, not a different
 * letter. Floating a ם past a child who was told to catch the מ would teach a
 * distinction that does not exist, and the honest alternative — accepting both —
 * would make one prompt have two right answers, which is worse. Sofits are
 * taught after the alphabet is known; a first-letters game is not the place.
 */
const HE_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");

/** Final forms, exported so the exclusion above is pinned rather than assumed. */
export const FINAL_FORMS: readonly string[] = ["ך", "ם", "ן", "ף", "ץ"];

/** Uppercase only — A and a must never be the same question. */
const EN_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/**
 * Everything a bubble may carry, for one locale. Digits first, then letters.
 *
 * A RECORD of alphabets rather than a two-way branch, because an alphabet is
 * not a translation: Spanish is not English plus accents (ñ is its own letter,
 * and a child learning it is learning that), and a language promoted without
 * one would silently be handed the English alphabet to read aloud.
 */
const LETTERS: Record<Locale, string[]> = { he: HE_LETTERS, en: EN_LETTERS };

export function contentPool(locale: Locale): string[] {
  return [...DIGITS, ...LETTERS[locale]];
}

/**
 * Characters a child can genuinely mistake for one another, as DISJOINT groups
 * (pinned by the test — a character in two groups would make "which group is
 * this in?" ambiguous). Anything not listed is its own group of one.
 *
 * These are shape confusions, not sound confusions: the game shows a character
 * and asks for it by sight, so ב/כ (same rounded frame) belongs here while
 * ק/כ (same consonant sound, different shapes) does not.
 */
export const CONFUSION_GROUPS: Record<Locale, readonly (readonly string[])[]> = {
  he: [
    ["ב", "כ", "פ"], // one rounded frame, differing only in the corner and the leg
    ["ג", "נ"],
    ["ד", "ר"], // the classic pair
    ["ה", "ח", "ת"], // the classic trio
    ["ו", "ז", "י"], // small single strokes
    ["ט", "מ"],
    ["ע", "צ"],
    ["1", "7"],
    ["2", "5"],
    ["3", "8"],
    ["6", "9"],
  ],
  en: [
    ["B", "P", "R"],
    ["C", "G"],
    ["E", "F"],
    // The letter/digit crossovers are the ones adults stop seeing: I and 1,
    // O and 0, S and 5, Z and 2 are all one shape to a new reader.
    ["I", "J", "L", "T", "1"],
    ["M", "N", "W"],
    ["O", "Q", "D", "0"],
    ["U", "V", "Y"],
    ["S", "5"],
    ["Z", "2"],
    ["K", "X"],
    ["6", "9"],
    ["3", "8"],
  ],
};

function buildIndex(groups: readonly (readonly string[])[]): Map<string, string> {
  const index = new Map<string, string>();
  groups.forEach((group, i) => group.forEach((ch) => index.set(ch, `group-${i}`)));
  return index;
}

const CONFUSION_INDEX: Record<Locale, Map<string, string>> = {
  he: buildIndex(CONFUSION_GROUPS.he),
  en: buildIndex(CONFUSION_GROUPS.en),
};

/** Which confusion group a character sits in. Ungrouped characters get their own. */
export function confusionKey(locale: Locale, ch: string): string {
  return CONFUSION_INDEX[locale].get(ch) ?? `solo-${ch}`;
}

/**
 * Could a child mistake `b` for `a`? A character is never confusable with
 * ITSELF — the target is excluded from its own distractor list by identity, and
 * a self-match here would drop the target's whole group for the wrong reason.
 */
export function areConfusable(locale: Locale, a: string, b: string): boolean {
  return a !== b && confusionKey(locale, a) === confusionKey(locale, b);
}

/** How look-alikes are treated at a given level. See the header. */
export type ConfusablePolicy = "avoid" | "allow" | "prefer";

export interface DifficultyConfig {
  /** Distinct characters in a round, the target included. */
  poolSize: number;
  /** Targets to catch before the round is won. */
  needed: number;
  confusables: ConfusablePolicy;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { poolSize: 4, needed: 4, confusables: "avoid" },
  medium: { poolSize: 5, needed: 5, confusables: "allow" },
  hard: { poolSize: 6, needed: 6, confusables: "prefer" },
};

/**
 * Non-overlapping columns bubbles rise in. Four, not more: at 64px minimum per
 * bubble a fifth column does not fit across a small phone, and two bubbles
 * sharing a spot means the one underneath is untappable.
 */
export const LANES = 4;

/**
 * The spawn spec for a level — the shared preset, capped to the lanes we have.
 *
 * `pickLane` answers null once every lane is taken, so a `maxAlive` above LANES
 * is a promise the board can never keep. The cap is pinned NOT to throttle the
 * spawner (`isSustainable`) in `logic.test.ts`.
 */
export function specFor(difficulty: Difficulty): SpawnSpec {
  const preset = SPAWN_PRESETS[difficulty];
  return { ...preset, maxAlive: Math.min(preset.maxAlive, LANES) };
}

export interface Round {
  /** The character the prompt asks for. */
  target: string;
  /** Everything that may spawn this round, target included. */
  pool: string[];
  caught: number;
  needed: number;
}

function drawDistractors(
  locale: Locale,
  target: string,
  others: readonly string[],
  wanted: number,
  policy: ConfusablePolicy,
  rng: () => number,
): string[] {
  const lookAlikes = others.filter((c) => areConfusable(locale, target, c));
  const clear = others.filter((c) => !areConfusable(locale, target, c));

  if (policy === "avoid") return shuffle(clear, rng).slice(0, wanted);
  if (policy === "allow") return shuffle(others, rng).slice(0, wanted);

  // "prefer": every available look-alike first, then fill out with the rest.
  // A target with no look-alikes at all (א, ל, ש, A, H, 4, 7) degrades to a
  // normal round rather than to a short one.
  const seeded = shuffle(lookAlikes, rng).slice(0, wanted);
  return [...seeded, ...shuffle(clear, rng).slice(0, wanted - seeded.length)];
}

/**
 * A fresh round. `avoid` is the previous target, so the game never asks for the
 * same character twice running — a child would otherwise "win" a round without
 * looking at the prompt.
 */
export function newRound(
  difficulty: Difficulty,
  locale: Locale,
  avoid: string | null = null,
  rng: () => number = Math.random,
): Round {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const all = contentPool(locale);
  const target = pick(
    all.filter((c) => c !== avoid),
    rng,
  );
  const distractors = drawDistractors(
    locale,
    target,
    all.filter((c) => c !== target),
    Math.max(0, cfg.poolSize - 1),
    cfg.confusables,
    rng,
  );
  return {
    target,
    pool: shuffle([target, ...distractors], rng),
    caught: 0,
    needed: cfg.needed,
  };
}

/** Roughly how often a fresh bubble carries the target. */
export const TARGET_CHANCE = 0.45;

/**
 * The most bubbles in a row that may carry something OTHER than the target.
 *
 * Chance alone is not enough. With four bubbles on screen at once, an unlucky
 * run leaves a child staring at water with nothing to catch, which reads as a
 * broken game long before it reads as bad luck.
 */
export const MAX_DRY_SPELL = 2;

/**
 * What the next bubble carries, plus the updated dry-spell counter the caller
 * must hand back on the following draw.
 *
 * Written `!(sinceTarget < MAX_DRY_SPELL)` so a NaN counter forces a TARGET —
 * a broken counter should fail toward something to catch, never toward an empty
 * screen.
 */
export function drawKind(
  round: Round,
  sinceTarget: number,
  rng: () => number = Math.random,
): { kind: string; sinceTarget: number } {
  const others = round.pool.filter((c) => c !== round.target);
  const forced = !(sinceTarget < MAX_DRY_SPELL) || others.length === 0;
  const kind = forced || rng() < TARGET_CHANCE ? round.target : pick(others, rng);
  return { kind, sinceTarget: kind === round.target ? 0 : sinceTarget + 1 };
}

/**
 * One more target caught. NON-MUTATING, and capped at `needed`: two taps landing
 * in the same tick must not push the count past the finish line and skip the win.
 */
export function catchTarget(round: Round): Round {
  return { ...round, caught: Math.min(round.needed, round.caught + 1) };
}

/** Has this round been won? A pure question — nothing is recorded, nothing is lost. */
export function isRoundComplete(round: Round): boolean {
  return round.caught >= round.needed;
}
