import type { Locale } from "@i18n/index";
// Pop the Balloons ("פוצצו בלונים") — PURE logic. No DOM, no React, no Phaser.
//
// COLOUR IS THE WHOLE MECHANIC. A prompt names one colour, balloons of every
// colour drift up, and the child pops the ones that match. A wrong tap costs
// NOTHING and this file is where that promise is kept structurally: there is no
// score to lose, no lives counter, no "streak" to break. `isRoundComplete` only
// ever counts UP.
//
// Two decisions carry the game, and both are pinned by `logic.test.ts`:
//
// 1. THE TARGET CANNOT GO MISSING. A child told "pop the red ones" who gets a
//    screen with no red balloon has nothing to do, and at four years old that
//    reads as a broken game rather than as patience. A probability alone cannot
//    promise this — a fair coin runs cold — so after `FORCE_TARGET_AFTER`
//    non-target balloons the next one IS the target, deterministically. The
//    bounded gap, not the rate, is the guarantee.
// 2. EVERY COLOUR CARRIES A SHAPE CUE. `cue` is a mark drawn on the balloon
//    body, distinct per colour, so a red-green colour-blind child plays by the
//    mark and never has to see the difference the prompt is asking about.
//
// Motion is NOT modelled here, deliberately: where a balloon is at any instant
// is declared to the Web Animations API and interpolated by the compositor at
// the display's real refresh rate. See the header of `@shared/spawn.pure`.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching every
// other game. Import the pure modules DIRECTLY, never the `@shared` barrel —
// the barrel re-exports React components and this file must stay DOM-free.
import { pick } from "@shared/rng";
import { SPAWN_PRESETS, type SpawnDifficulty, type SpawnSpec } from "@shared/spawn.pure";

/** The shared three-rung ladder, reused verbatim so the spawn presets fit. */
export type Difficulty = SpawnDifficulty;

export type ColorId = "red" | "blue" | "green" | "yellow" | "purple";

/**
 * The shape mark drawn on a balloon's body.
 *
 * This is the colour-blind path through the game, not decoration: about 1 boy
 * in 12 cannot reliably separate these hues, and a game whose entire question
 * is "which colour is this" would otherwise be unplayable for him while looking
 * perfectly fine to everyone testing it.
 */
export type CueId = "star" | "dots" | "stripes" | "heart" | "zigzag";

/**
 * A colour, plus its name in every language somebody has written prose in.
 *
 * The name is a locale RECORD rather than two fields called `he` and `en`,
 * which is the whole difference between a table that refuses to compile when a
 * language is promoted and one that quietly keeps answering in English. Note
 * the Hebrew is a PLURAL adjective — the prompt reads "פוצצו בלונים אדומים" —
 * so a new language supplies whatever form its own sentence needs, not a
 * translation of the English singular.
 */
export type BalloonColor = Record<Locale, string> & {
  id: ColorId;
  /** Body fill. Chosen bright, since the app renders on a near-black surface. */
  hex: string;
  cue: CueId;
};

/**
 * The palette, in ladder order: the first three are the easy round, and each
 * step up adds one more colour to tell apart. Order therefore matters —
 * reordering this array changes what "easy" means.
 *
 * Red / blue / yellow lead on purpose. They are the three that stay separable
 * under the common red-green deficiency, so the easy rung asks nothing of the
 * cue marks; green arrives at medium and purple at hard, which is exactly where
 * the marks start doing real work.
 */
export const BALLOON_COLORS: readonly BalloonColor[] = [
  { id: "red", hex: "#ff5a5f", cue: "star", he: "אדומים", en: "red", es: "rojo" },
  { id: "blue", hex: "#49a9ff", cue: "dots", he: "כחולים", en: "blue", es: "azul" },
  { id: "yellow", hex: "#ffd23f", cue: "stripes", he: "צהובים", en: "yellow", es: "amarillo" },
  { id: "green", hex: "#3fd67a", cue: "heart", he: "ירוקים", en: "green", es: "verde" },
  { id: "purple", hex: "#b06bff", cue: "zigzag", he: "סגולים", en: "purple", es: "morado" },
];

/** How many colours share the screen. More colours = a harder discrimination. */
export const PALETTE_SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };

/** Pops needed to finish a round. */
export const ROUND_GOAL: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

/**
 * The longest run of non-target balloons the stream may produce. The next one
 * after that is the target, whatever the rng wanted. See decision 1 above.
 */
export const FORCE_TARGET_AFTER = 2;

/** How often a balloon is the target BEFORE the forcing adds more. */
export const TARGET_RATE = 0.55;

/** The colours in play at this difficulty. */
export function paletteFor(difficulty: Difficulty): readonly BalloonColor[] {
  return BALLOON_COLORS.slice(0, PALETTE_SIZE[difficulty]);
}

/**
 * Look up a colour by id.
 *
 * TOTAL: an unknown id answers with the first colour rather than `undefined`,
 * because this value feeds an SVG fill and `fill="undefined"` is an invisible,
 * untappable balloon — a much worse failure than a wrong hue.
 */
export function colorOf(id: ColorId): BalloonColor {
  return BALLOON_COLORS.find((c) => c.id === id) ?? BALLOON_COLORS[0];
}

/**
 * How fast balloons arrive and how long they last.
 *
 * The shared preset, sped up a notch for balloon pop specifically: `lifeMs` is
 * the rise duration, so a shorter life means a faster-rising balloon, and
 * `everyMs` shrinks with it so the surface does not thin out. The factor lives
 * here rather than in `SPAWN_PRESETS` so bubbles, bees and frog — which share
 * that preset — keep their own pace.
 */
// 15% faster rise on every level. Not more: the shared floor (a balloon must
// stay reachable for ~2s) is asserted in logic.test.ts, and hard's 2400ms life
// only clears 2000ms at 0.85.
const BALLOON_SPEEDUP = 0.85;
export function specFor(difficulty: Difficulty): SpawnSpec {
  const base = SPAWN_PRESETS[difficulty];
  return {
    ...base,
    lifeMs: Math.round(base.lifeMs * BALLOON_SPEEDUP),
    everyMs: Math.round(base.everyMs * BALLOON_SPEEDUP),
  };
}

export interface Round {
  /** The colour the prompt asks for. */
  target: ColorId;
  /** Pops needed to finish. */
  goal: number;
}

/**
 * A fresh round, never asking for the colour that was just asked for.
 *
 * Two reds in a row read as "nothing happened": the child keeps popping the
 * same balloons and the new level does not feel new. Passing `previous` is what
 * prevents that; passing `null` (a first round) simply picks from the whole
 * palette.
 */
export function newRound(
  difficulty: Difficulty,
  previous: ColorId | null = null,
  rng: () => number = Math.random,
): Round {
  const palette = paletteFor(difficulty);
  const choices = palette.filter((c) => c.id !== previous);
  // A palette of one would leave `choices` empty; fall back rather than crash.
  const from = choices.length > 0 ? choices : palette;
  return { target: pick(from, rng).id, goal: ROUND_GOAL[difficulty] };
}

export interface BalloonDraw {
  color: ColorId;
  /** How many non-target balloons have now been drawn in a row. Feed it back in. */
  sinceTarget: number;
}

/**
 * What the next balloon IS, plus the counter to carry into the call after it.
 *
 * The counter is returned rather than held here because this module is pure —
 * the renderer keeps it in a ref and threads it through, and `logic.test.ts`
 * folds it exactly the same way, so the tested stream is the shipped stream.
 *
 * `sinceTarget` is compared with `!(x < n)` so a NaN counter forces the target
 * instead of gambling: failing towards MORE things to pop is the safe direction
 * in a game whose only real failure mode is an empty screen.
 */
export function nextBalloon(
  palette: readonly BalloonColor[],
  target: ColorId,
  sinceTarget: number,
  rng: () => number = Math.random,
): BalloonDraw {
  const others = palette.filter((c) => c.id !== target);
  if (others.length === 0) return { color: target, sinceTarget: 0 };
  if (!(sinceTarget < FORCE_TARGET_AFTER)) return { color: target, sinceTarget: 0 };
  if (rng() < TARGET_RATE) return { color: target, sinceTarget: 0 };
  return { color: pick(others, rng).id, sinceTarget: sinceTarget + 1 };
}

/**
 * Is the round done?
 *
 * `>=`, not `===`: two taps landing in the same tick must not step over the
 * goal and leave the round running forever.
 */
export function isRoundComplete(popped: number, difficulty: Difficulty): boolean {
  return popped >= ROUND_GOAL[difficulty];
}
