// Operator-tunable defaults for the visual effects, picked in the lab.
//
// The sibling of `@sdk/voiceOverride`, and it validates for the same reason: a
// stored blob that arrived from outside this build decides what a screen DOES
// next. It is a gentler failure than the voice store - the worst a bad number
// here can do is draw the wrong amount of confetti, not put a loud sound next
// to a child's ear - so it clamps into range rather than dropping, and only
// falls back when a value is not a usable number at all.
//
// `@juice` imports NOTHING - not React, not `@sdk`, not `@ui`. That is the
// whole reason any renderer can call it, so this file stays self-contained
// rather than reaching for the voice store's validator.
//
// WHAT IS AND IS NOT REACHABLE FROM HERE, stated rather than discovered:
//
//   celebrate() - fully tunable. `winMoment` calls it with no count, so the
//   default here IS what every win in the app draws.
//
//   shake() - fully tunable. All 18 call sites take the defaults.
//
//   burst() - PARTIALLY. Twenty call sites pass their own hand-authored count
//   (5 to 16, chosen per game), and an explicit argument beats a default, as it
//   must. So `spread` retunes everywhere and `count` only reaches the sites
//   that never named one. Tuning burst counts globally would mean deleting
//   twenty deliberate per-game decisions, which is a different change and a
//   worse one.

export interface JuiceTuning {
  /** Confetti pieces on a win. */
  confetti: number;
  /** Shake distance in px. */
  shakePx: number;
  /** Shake duration in ms. */
  shakeMs: number;
  /** Burst spread in px. */
  burstSpread: number;
}

/**
 * Picked in the lab on 2026-08-13, from strips of five.
 *
 * Confetti more than doubled (60 -> 140) and burst spread more than doubled
 * (90 -> 190); both shake values were re-chosen and came back UNCHANGED, which
 * is worth recording rather than reading as "those two were skipped". The
 * app's answer to "no" was the one thing in here already right.
 *
 * 140 is comfortably under the 240 ceiling below, which exists because that is
 * roughly where a mid-range phone starts dropping frames.
 */
export const JUICE_SHIPPED: JuiceTuning = {
  confetti: 140,
  shakePx: 6,
  shakeMs: 240,
  burstSpread: 190,
};

export const JUICE_TUNING_KEY = "ellaz:juice:v1";

/**
 * Bounds, and each ceiling is a real limit rather than a round number.
 *
 * 240 confetti pieces is roughly where a mid-range phone starts dropping
 * frames animating them, so the ceiling is a performance floor in disguise.
 * Shake is capped at 16 px because past that it stops reading as "no" and
 * starts reading as the app crashing.
 */
const RANGE: Record<keyof JuiceTuning, readonly [number, number]> = {
  confetti: [0, 240],
  shakePx: [0, 16],
  shakeMs: [60, 900],
  burstSpread: [20, 260],
};

const clamp = (n: number, [lo, hi]: readonly [number, number]) =>
  Math.min(hi, Math.max(lo, Math.round(n)));

/** In-memory, so the hot path never touches localStorage. */
let current: JuiceTuning = { ...JUICE_SHIPPED };

/**
 * Coerce anything into a usable tuning. Unlike the voice store this SALVAGES
 * rather than drops - a wrong number draws wrong-looking confetti, which the
 * next render fixes, so refusing the whole object over one bad field would
 * throw away four good ones for no safety gained.
 */
export function sanitizeTuning(raw: unknown): JuiceTuning {
  const out = { ...JUICE_SHIPPED };
  if (!raw || typeof raw !== "object") return out;
  for (const k of Object.keys(JUICE_SHIPPED) as (keyof JuiceTuning)[]) {
    const v = (raw as Record<string, unknown>)[k];
    // `Number.isFinite` and not `typeof === "number"`: NaN and Infinity are
    // both numbers and both would clamp to something arbitrary.
    if (typeof v === "number" && Number.isFinite(v))
      out[k] = clamp(v, RANGE[k]);
  }
  return out;
}

export function loadTuning(): JuiceTuning {
  try {
    const raw = localStorage.getItem(JUICE_TUNING_KEY);
    current = raw ? sanitizeTuning(JSON.parse(raw)) : { ...JUICE_SHIPPED };
  } catch {
    current = { ...JUICE_SHIPPED };
  }
  return current;
}

/** What the effects actually read. Never touches storage. */
export function tuning(): JuiceTuning {
  return current;
}

export function saveTuning(patch: Partial<JuiceTuning>): JuiceTuning {
  current = sanitizeTuning({ ...current, ...patch });
  try {
    localStorage.setItem(JUICE_TUNING_KEY, JSON.stringify(current));
  } catch {
    /* a device that refuses the write still gets the effect this session */
  }
  return current;
}

export function clearTuning(): void {
  current = { ...JUICE_SHIPPED };
  try {
    localStorage.removeItem(JUICE_TUNING_KEY);
  } catch {
    /* ignore */
  }
}
