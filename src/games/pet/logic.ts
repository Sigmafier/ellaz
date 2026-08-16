// Pet - pure rules for a care toy.
//
// THE PET IS NEVER IN TROUBLE. There is no hunger that rises, no sadness that
// sets in, no illness and no death. A child who leaves for a week comes back to
// exactly the pet they left, at exactly the size they grew it to. That is not a
// tuning choice that could go the other way: this is a warm toy, not a
// responsibility simulator, and a creature that suffers for being left alone
// punishes a five-year-old for owning a tablet they do not control.
//
// The cheapest way to GUARANTEE that is for these rules to have no way of
// knowing that time passed. Nothing in this file reads a clock, schedules
// anything, or decays. `logic.test.ts` reads this source and fails the build on
// the name of any wall clock or any scheduler - and it scans the COMMENTS too,
// so this paragraph is careful not to spell one. That is over-strict on
// purpose: a stripper that skipped comments would be a second instrument that
// could be wrong about what it was reading.
//
// AND NOTHING HERE CAN BE STUCK. The state carries only what a TAP can change,
// so there is no field a pending timeout has to clear - which is the memory
// `lock` trap in session-snapshot-convention.md, avoided by construction rather
// than by a `settle()` at save time. Every transient reaction (the bounce, the
// floating heart) lives in the renderer and never reaches the disk.
//
// TAP, NEVER DRAG. Care is a set of buttons and a tap on the creature itself.
// There is no gesture in this file to make required by accident.
//
// ENDLESS, so this file grants NOTHING. It reports what happened - how much
// care the creature has had, whether it just grew, whether it just crossed a
// milestone - and the renderer decides what that is worth via `winMoment`. The
// earn table lives in `src/sdk/economy.ts` and nowhere else.
//
// PURE: no DOM, no React, no Phaser. The `rng` parameter goes LAST and defaults
// to `Math.random`. Imports are the DIRECT module paths rather than the
// `@shared` barrel, which re-exports React components.
import type { ShippedLocale } from "@i18n/locales";
import { pick } from "@shared/rng";

/**
 * A name in every language a human has written one for.
 *
 * `Record<PageLocale, string>` rather than `he: string; en: string`, so the day
 * a language is promoted the compiler demands a name for every creature and
 * every kind of care instead of quietly handing a Spanish player an English
 * aria-label. Same gate as `CastItem` in `@shared/cast`.
 */
export type Named = Record<ShippedLocale, string>;

/* ------------------------------------------------------------- kinds of care */

export type CareKind = "feed" | "wash" | "play" | "cuddle";

export type CareAction = {
  /** The face on the button. A pre-reader navigates by this and nothing else. */
  emoji: string;
  /** What the pet is asking for, as a noun: "a snack", "a bath". */
  name: Named;
};

export const CARE: Record<CareKind, CareAction> = {
  feed: { emoji: "🍎", name: { he: "אוכל", en: "a snack", es: "un bocado" } },
  wash: { emoji: "🫧", name: { he: "אמבטיה", en: "a bath", es: "un baño" } },
  play: { emoji: "🎈", name: { he: "משחק", en: "a game", es: "un juego" } },
  cuddle: { emoji: "💛", name: { he: "חיבוק", en: "a cuddle", es: "un abrazo" } },
};

/** Button order, left to right. Written out so it is a decision, not a hash order. */
export const CARE_KINDS: readonly CareKind[] = ["feed", "wash", "play", "cuddle"];

/* ----------------------------------------------------------------- creatures */

/** The tuft on top - the one silhouette difference between the three. */
export type Crest = "tuft" | "leaf" | "horns";

export interface Pet {
  id: string;
  name: Named;
  /** Body fill. */
  body: string;
  /** The darker tone the eyes, mouth and feet are drawn in. */
  ink: string;
  /** The soft belly patch. */
  belly: string;
  crest: Crest;
}

/**
 * Three original creatures. Invented shapes and invented names - nothing here
 * quotes a character anybody owns (see the legal rule in CLAUDE.md).
 *
 * THE IDS ARE PERSISTED FOREVER, in `care`, in the remembered level and in the
 * record's board name. Never rename one, never reuse one for a different
 * creature - the same rule the shop items and the name pool carry.
 */
export const PETS: readonly Pet[] = [
  { id: "pip", name: { he: "פיפ", en: "Pip", es: "Pip" }, body: "#ffb1c9", ink: "#7a2d4a", belly: "#ffe0ea", crest: "tuft" },
  { id: "mo", name: { he: "מו", en: "Mo", es: "Mo" }, body: "#9fe0b8", ink: "#1f5c3c", belly: "#e2f8ec", crest: "leaf" },
  { id: "tuli", name: { he: "טולי", en: "Tuli", es: "Tuli" }, body: "#b9c4ff", ink: "#333a7a", belly: "#e7ebff", crest: "horns" },
];

export const PET_IDS: readonly string[] = PETS.map((p) => p.id);

/**
 * The creature an id names, or the first one.
 *
 * The fallback is the whole point. A remembered level id survives a build, so a
 * player whose stored id belonged to a creature that has since been removed
 * reaches here - and `undefined` would render a pet with no colour, no name and
 * no face rather than an error anybody could act on.
 */
export function petById(id: string): Pet {
  return PETS.find((p) => p.id === id) ?? PETS[0];
}

/* ------------------------------------------------------------------- growing */

/**
 * How much care each stage begins at.
 *
 * Widening on purpose: the first growth arrives inside the first minute so a
 * child sees that caring DOES something, and the last one is far enough out to
 * still be somewhere to go. Every gap is wider than `GRANTED_GAIN`, so a single
 * tap can never skip a stage and silently swallow its celebration.
 */
export const STAGE_CARE: readonly number[] = [0, 8, 22, 45, 80];

export const MAX_STAGE = STAGE_CARE.length - 1;

/** Which stage this much care has reached. Nonsense reads as newborn. */
export function stageFor(care: number): number {
  if (!(care > 0)) return 0; // also catches NaN, which fails every comparison
  let stage = 0;
  for (let i = 1; i < STAGE_CARE.length; i++) if (care >= STAGE_CARE[i]) stage = i;
  return stage;
}

export interface Growth {
  stage: number;
  /** Care earned INSIDE the current stage. */
  into: number;
  /** Care the current stage needs in total. Zero once fully grown. */
  need: number;
  /** `into / need`, clamped to 0..1 - and 1, not NaN, when fully grown. */
  ratio: number;
}

/** How far along the pet is, for the bar under it. */
export function growth(care: number): Growth {
  const stage = stageFor(care);
  if (stage >= MAX_STAGE) return { stage, into: 0, need: 0, ratio: 1 };
  const from = STAGE_CARE[stage];
  const need = STAGE_CARE[stage + 1] - from;
  const into = Math.max(0, Math.min(need, (care > 0 ? care : 0) - from));
  return { stage, into, need, ratio: need > 0 ? into / need : 1 };
}

/* -------------------------------------------------------------------- rewards */

/** Every this much care is worth a coin, the first time it is passed. */
export const MILESTONE_EVERY = 10;

/** What a tap is worth when it is the thing the pet asked for, and when it is not. */
export const GRANTED_GAIN = 3;
export const PLAIN_GAIN = 1;

/* ---------------------------------------------------------------------- state */

export interface PetState {
  /**
   * Lifetime care, per creature id. Missing means none - a creature added in a
   * later build must not invalidate a pet somebody has been raising.
   */
  care: Record<string, number>;
  /**
   * What the creature currently on screen is asking for.
   *
   * A WISH, never a NEED. Granting it is worth more; ignoring it costs nothing
   * at all and the pet is delighted by whatever it is given instead.
   */
  wish: CareKind;
}

export function newPet(rng: () => number = Math.random): PetState {
  return { care: {}, wish: pick(CARE_KINDS, rng) };
}

/** How much care one creature has had. Anything unusable reads as none. */
export function careOf(state: PetState, pet: string): number {
  const n = state.care[pet];
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/** A wish that is not the one just granted, so the bubble visibly changes. */
function nextWish(current: CareKind, rng: () => number): CareKind {
  return pick(
    CARE_KINDS.filter((k) => k !== current),
    rng,
  );
}

/** A fresh wish, for when a different creature comes on screen. */
export function reWish(state: PetState, rng: () => number = Math.random): PetState {
  return { ...state, wish: nextWish(state.wish, rng) };
}

/**
 * Raise this one from the beginning again. The other creatures keep everything.
 *
 * `GameChrome` always draws a restart button, so this is what it has to mean
 * here. It deliberately does NOT touch the personal best or the lifetime growth
 * latch the renderer holds: starting over is a new pet to raise, never an
 * erasure of what the player already did.
 */
export function startOver(state: PetState, pet: string, rng: () => number = Math.random): PetState {
  const care = { ...state.care };
  delete care[pet];
  return { care, wish: nextWish(state.wish, rng) };
}

export interface CareOutcome {
  kind: CareKind;
  /** This was the thing the pet asked for. */
  granted: boolean;
  gain: number;
  /** Care AFTER the tap. */
  care: number;
  /** Stage AFTER the tap. */
  stage: number;
  /** The pet grew on this tap. */
  grew: boolean;
  /**
   * A milestone was crossed on this tap and the pet did not also grow.
   *
   * Suppressed on a growth deliberately: two `winMoment` calls on one tap is
   * two celebrations stacked on top of each other, and the smaller one is the
   * one nobody would miss.
   *
   * Both flags are DERIVED from the care value, which is what makes them
   * latched with nothing to store. A snapshot restored mid-run reports exactly
   * what the live run reported, so leaving and coming back cannot re-collect a
   * growth - the double-pay shape session-snapshot-convention.md documents.
   */
  milestone: boolean;
}

/**
 * The whole game, as one reducer: offer the pet something and it enjoys it.
 *
 * NOTHING IS EVER REFUSED. There is no branch here that returns "ignored", no
 * wrong tap and no penalty - the worst a tap can do is be worth less than
 * another one would have been.
 */
export function careFor(
  state: PetState,
  pet: string,
  kind: CareKind,
  rng: () => number = Math.random,
): { state: PetState; outcome: CareOutcome } {
  const before = careOf(state, pet);
  const granted = kind === state.wish;
  const gain = granted ? GRANTED_GAIN : PLAIN_GAIN;
  const care = before + gain;

  const grew = stageFor(care) > stageFor(before);
  const crossed = Math.floor(care / MILESTONE_EVERY) > Math.floor(before / MILESTONE_EVERY);

  return {
    state: {
      care: { ...state.care, [pet]: care },
      wish: granted ? nextWish(state.wish, rng) : state.wish,
    },
    outcome: {
      kind,
      granted,
      gain,
      care,
      stage: stageFor(care),
      grew,
      milestone: crossed && !grew,
    },
  };
}

/* --------------------------------------------------------------- the record */

/**
 * What this pet's record MEASURES, in the shape `ctx.score` wants.
 *
 * The biggest this creature has ever grown - a number that can only ever go up
 * and can never be taken away, which is the only kind of number this game is
 * willing to keep. It is not a measure of how WELL a child cared for anything:
 * there is no way to do that badly here, and nothing records how long it took.
 *
 * It reports a VALUE and a UNIT and never a direction - `src/sdk/score.ts`
 * decides that points rank high, so a game cannot order its own board
 * backwards. `board` is the creature, because these are three separate pets
 * rather than three difficulties of one.
 */
export function scoreReport(
  state: PetState,
  pet: string,
): { value: number; unit: "points"; board: string } {
  return { value: careOf(state, pet), unit: "points", board: pet };
}

/* ------------------------------------------------- what comes back off a disk */

/**
 * More creatures than this app could plausibly ship. Purely defensive: only our
 * own code writes these keys, and a hand-edited blob claiming two thousand pets
 * would otherwise ride inside the session's 64 KB budget for no reason.
 */
export const MAX_CARE_KEYS = 24;

/**
 * Is this something this build can raise?
 *
 * Deliberately permissive about WHICH creatures appear and strict about the
 * shape of what they hold. A snapshot missing a creature this build has is
 * fine - `careOf` answers zero - because a build that adds a fourth pet must
 * not wipe the three a child already grew.
 */
export function isPetState(value: unknown): value is PetState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const s = value as Partial<PetState>;
  if (typeof s.wish !== "string" || !(CARE_KINDS as readonly string[]).includes(s.wish)) {
    return false;
  }
  const care = s.care;
  if (typeof care !== "object" || care === null || Array.isArray(care)) return false;
  const keys = Object.keys(care as Record<string, unknown>);
  if (keys.length > MAX_CARE_KEYS) return false;
  return keys.every((k) => {
    const n = (care as Record<string, unknown>)[k];
    return typeof n === "number" && Number.isFinite(n) && n >= 0;
  });
}

/**
 * The lifetime growth latch, cleaned.
 *
 * The highest stage each creature has EVER reached, which is what stops a
 * growth being paid twice by starting over and raising the same pet again. It
 * lives outside the session snapshot on purpose: the snapshot is cleared by a
 * version bump, by age, and by a restart, and a latch that can be cleared is
 * not a latch.
 *
 * Clamped rather than merely filtered, because a hand-edited `900` would
 * otherwise silence every future growth reward for that creature - a refusal
 * with no visible cause at all.
 */
export function sanitizeGrown(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 1) continue;
    out[id] = Math.min(MAX_STAGE, Math.floor(raw));
  }
  return out;
}
