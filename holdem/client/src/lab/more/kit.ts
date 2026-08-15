// Builders for the arms added on 2026-08-15.
//
// WHY A SECOND WAVE EXISTS AT ALL
//
// The first rebuild fixed a real defect - every chip was a bright strike with
// no energy below 2400 Hz, all click and no table - and the operator's verdict
// on the result was still "not fine enough, and not enough of it". Both halves
// of that are fair, and they have the same cause.
//
// Ninety-eight arms sounds like variety and was not. Every single one of them
// was `struck()`: an impulse into a set of exponentially decaying partials.
// Change the partials and you change the material; change the frequency and you
// change the size; change the gain and you change how hard it was hit. What you
// cannot change that way is the EVENT - and a strip of nine options that are
// all one impact differs by parameter, not by kind. The ear hears the family
// resemblance long before it hears the settings.
//
// So the three primitives this file is built on are new, and they are all about
// the event rather than the object:
//
//   bounce()    contact, micro-bounce, rest - with the gaps shrinking
//   chirp()     the pitch falling across the impact, which every real one does
//   friction()  something sliding, as a moving band of noise rather than a tick
//
// Everything below is those three over the materials in `modes.ts`. Nothing
// here re-tunes an existing arm: every arm that already shipped is byte-frozen
// by `armLock.test.ts`, because a settled pick is matched back to its arm by
// VALUE and editing a spec silently unlabels somebody's choice.

import { type LayerSpec, mix, type Partials, scatter, semitonesToRatio, struck, type VoiceSpec } from "../../audio/voice";
import { CLAY, PAPER, PLASTIC, STACK, TABLE } from "../modes";

// ---------------------------------------------------------------------------
// The three composers. They live HERE and not in `audio/voice.ts`.
// ---------------------------------------------------------------------------
//
// Same rule as `modes.ts`: a thing nothing SHIPS must not be paid for by
// somebody who only wants to play poker. All three are used by lab candidates
// and by nothing else, and a composer in `voice.ts` is one the lab imports
// across a chunk boundary - which pins it to the shell. Measured on the
// artifact: 278 B gz on every first visit for three functions no player's
// device will ever call.
//
// Promoting a picked arm to a shipped voice is what brings one back, and that
// is the right moment to pay for it.

/**
 * One object landing and SETTLING - contact, micro-bounce, rest.
 *
 * The composers in `voice.ts` place hits on a timeline that is either exact
 * (`run`) or random (`scatter`). Neither is what a dropped object does: the gaps between a bounce and the next one SHRINK, geometrically, and
 * the gain falls with them. That ratio between successive gaps is most of what
 * the ear uses to tell a hard surface from a soft one, and nothing in this
 * palette could express it before - which is a large part of why every impact
 * here sounded like one event rather than like something arriving.
 *
 * `tighten` under 1 accelerates (a chip dropped on wood); at 1 it is a straight
 * repeat; above 1 it slows down, which real objects do not do and a shuffling
 * hand does.
 *
 * BUDGET: the override gate refuses a spec over 64 layers, so `hits` times the
 * base's layer count has to stay under that. It is a real ceiling and not a
 * formality - a nine-hit bounce on an eight-layer chip is 72 and comes back
 * refused, which is a silent fallback to the built-in rather than an error.
 * Bounce a LIGHT voice and put the body under it with `mix`.
 */
export function bounce(
  base: VoiceSpec,
  hits: number,
  gap: number,
  o: { decay?: number; tighten?: number; pitchDrop?: number } = {},
): VoiceSpec {
  const decay = o.decay ?? 0.55;
  const tighten = o.tighten ?? 0.62;
  const drop = o.pitchDrop ?? 0;
  // Deterministic, with no randomness at all. A bounce is REGULAR - it is the
  // physics that makes it uneven, not chance - and `scatter` is already here
  // for the messy case. (It briefly took a seeded wobble; no arm ever asked
  // for one, and dropping it is what let this move out of the shell.)
  const layers: LayerSpec[] = [];
  let t = 0;
  let g = 1;
  let step = gap;
  for (let i = 0; i < hits; i++) {
    // Each bounce is a slightly SHORTER contact as well as a quieter one - the
    // object is carrying less energy, so it deforms less and rings less.
    const r = semitonesToRatio(drop * i);
    for (const l of base.layers) {
      layers.push({
        ...l,
        ratio: l.wave === "noise" ? l.ratio : (l.ratio ?? 1) * r,
        gain: l.gain * g,
        ms: l.ms ? l.ms * Math.max(0.35, Math.pow(0.82, i)) : l.ms,
        delay: (l.delay ?? 0) + t,
      });
    }
    t += step;
    step *= tighten;
    g *= decay;
  }
  return { ...base, ms: Math.max(base.ms, t * 1000), layers };
}

/**
 * Bend the whole voice's pitch across its life. Negative falls.
 *
 * A real impact is not a fixed pitch. The contact patch spreads as the object
 * deforms, the effective stiffness changes, and the partials slide - almost
 * always DOWNWARD, by a semitone or three over the first few tens of
 * milliseconds. A synthesiser holding one exact frequency for the whole decay
 * is the single most recognisable "this is a computer" tell left in a palette
 * that already has body and damping, and it is why an otherwise-correct chip
 * still reads as a beep with a thump under it.
 *
 * Noise layers are left alone - `glide` on noise means nothing, and the filter
 * sweep is that layer's equivalent (see `friction`).
 */
export function chirp(spec: VoiceSpec, semitones: number): VoiceSpec {
  return {
    ...spec,
    layers: spec.layers.map((l) =>
      l.wave === "noise" ? l : { ...l, glide: (l.glide ?? 0) + semitones },
    ),
  };
}

/**
 * Something SLIDING rather than being hit - a card across felt, a stack pushed
 * forward, a shuffle.
 *
 * Friction is broadband noise whose spectrum MOVES: the contact speeds up and
 * slows down, so the energy sweeps. `mallet` is the same family with the sweep
 * held still, which is right for a strike and wrong for a slide.
 *
 * TO BE PRECISE ABOUT WHAT IS NEW HERE, because the artifact contradicts the
 * obvious version of the claim: the two card arms already swept. `card-old`
 * runs 700 -> 3000 Hz and has since before any of this. What it does not have
 * is a real ATTACK - a slide takes 10-30 ms to reach full contact and a strike
 * takes under one - and what the palette did not have is a sweep it can reuse.
 * A sweep written by hand inside one card's layer array cannot go under a chip,
 * and no chip on this table has ever scraped across the felt.
 *
 * `from` and `to` are the band centre in Hz at the start and end. Card on cloth
 * runs roughly 2-6 kHz; chips pushed across a table sweep lower and wider.
 */
export function friction(
  gain: number,
  ms: number,
  from: number,
  to: number,
  o: { q?: number; attack?: number; delay?: number } = {},
): LayerSpec {
  const s = ms / 1000;
  return {
    wave: "noise",
    gain,
    ms,
    delay: o.delay,
    // A slide has a real attack. A strike does not. That difference is audible
    // at 15 ms and is the other half of why these two read as different actions.
    env: { a: o.attack ?? Math.min(0.03, s * 0.28), d: s * 0.55, s: 0.25, r: s * 0.4 },
    filter: { type: "bandpass", cutoff: from, cutoffEnd: to, q: o.q ?? 1.4 },
  };
}

/**
 * One chip landing - a bright strike over a low body.
 *
 * A hand-copy of the shipped helper, same as the one in `candidates.ts` and for
 * the same reason: a builder imported from the app is a builder that moves when
 * the app moves, and then an arm nobody edited plays a different sound.
 */
export function chip(mode: Partials, hz: number, bodyHz: number, body: number, click: number): VoiceSpec {
  return mix(
    struck(hz, 52, mode, { gain: click, damp: 1.3, mallet: 0.45, malletHz: 4400, space: 0.1, tail: 0.45, jitter: 1.2 }),
    struck(bodyHz, 140, "thud", { gain: body, damp: 1.05, space: 0.08, tail: 0.4 }),
  );
}

/** Two partials. Enough to have a material, cheap enough to repeat. */
const CLIP: Partials = [
  [1, 1],
  [2.32, 0.4],
];

/**
 * A single light click - one chip's worth of transient and NO body.
 *
 * The unit a cascade is made of. Three layers, which is what lets it be
 * bounced or scattered a dozen times and still clear the gate's 64-layer cap.
 */
export function tick(gain = 0.13, hz = 2800, mode: Partials = CLIP): VoiceSpec {
  return struck(hz, 44, mode, { gain, damp: 1.35, mallet: 0.4, malletHz: 4400, space: 0.1, tail: 0.4, jitter: 1.2 });
}

/** The low half of an impact, on its own, to go under a train of ticks. */
export function body(hz: number, ms: number, gain: number, mode: Partials | "thud" = "thud"): VoiceSpec {
  return struck(hz, ms, mode, { gain, damp: 1.0, space: 0.1, tail: 0.55 });
}

/**
 * A chip DROPPED rather than placed: it lands, bounces twice, and settles.
 *
 * The whole point of the second wave in one function. `hits` counts the
 * bounces, `gap` is the first one, and the gaps shrink from there - which is
 * the cue the ear actually uses to tell a hard surface from a soft one.
 */
export function dropped(
  hits: number,
  gap: number,
  o: { hz?: number; mode?: Partials; gain?: number; bodyHz?: number; bodyGain?: number; tighten?: number } = {},
): VoiceSpec {
  return mix(
    bounce(tick(o.gain ?? 0.14, o.hz ?? 2800, o.mode ?? CLIP), hits, gap, {
      decay: 0.52,
      tighten: o.tighten ?? 0.6,
      // Falls a little as it loses energy. Two semitones over three bounces is
      // nothing on paper and is most of what makes it read as one object.
      pitchDrop: -0.7,
    }),
    struck(o.bodyHz ?? 225, 150, "thud", { gain: o.bodyGain ?? 0.2, damp: 1.05, space: 0.09, tail: 0.45 }),
  );
}

/**
 * A stack of chips, riffled - the sound a dealer makes waiting for the action.
 *
 * The transients come from individual chips; the TONE comes from the column,
 * which is what `STACK` is for. Built as a scatter over one long stack body
 * rather than as N complete chips, for the reason in `chipCascade`: a dozen
 * chips do not make a dozen table thumps.
 */
export function riffle(hits: number, gap: number, seed: string, o: { hz?: number; gain?: number } = {}): VoiceSpec {
  return mix(
    scatter(tick(o.gain ?? 0.1, 3100, PLASTIC), hits, gap, { seed, spread: 0.5, gainVar: 0.5, pitchVar: 2.2 }),
    struck(o.hz ?? 300, 280, STACK, { gain: 0.11, damp: 1.1, space: 0.14, tail: 0.7 }),
  );
}

/**
 * A card moving across cloth: the friction, a small tap where it lands, and a
 * little of the table.
 *
 * The old card sounds were a bandpassed noise BURST, which is a strike with the
 * sweep held still - so they arrived as "ts" rather than as a movement. This
 * one sweeps, which is the difference between a card being dealt and a hi-hat.
 */
export function card(
  o: { ms?: number; from?: number; to?: number; slide?: number; tap?: number; thump?: number; q?: number } = {},
): VoiceSpec {
  const ms = o.ms ?? 105;
  const layers: LayerSpec[] = [friction(o.slide ?? 0.075, ms, o.from ?? 2600, o.to ?? 5200, { q: o.q ?? 1.3 })];
  if (o.tap) layers.push(friction(o.tap, 16, 4200, 2600, { q: 2.2, attack: 0.0008, delay: ms / 1000 * 0.72 }));
  const base: VoiceSpec = { freq: 320, ms, jitter: 1.6, space: 0.09, tail: 0.4, warmth: 9500, layers };
  return o.thump ? mix(base, struck(320, 90, PAPER, { gain: o.thump, damp: 1.2, space: 0.08, tail: 0.35 })) : base;
}

/**
 * Put a finished voice in a different room.
 *
 * It exists because of a constraint in `mix` that bites exactly when you want
 * a big low sound: the FIRST spec supplies the room, and it also supplies the
 * frequency every other spec's partials are expressed relative to - and the
 * gate refuses a ratio over 64. So a 96 Hz heartbeat with chips over it has to
 * be written chips-first to stay legal, and written chips-first it inherits a
 * chip's little room instead of the hall the low note needed.
 *
 * Order the mix for the ratio, then set the room here. Two concerns, two lines,
 * rather than one line that cannot satisfy both.
 */
export function inRoom(spec: VoiceSpec, space: number, tail: number): VoiceSpec {
  return { ...spec, space, tail };
}

/** A hand on the table - a knuckle, and the table answering underneath it. */
export function knock(hz: number, bodyHz: number, gain: number, mode: Partials): VoiceSpec {
  return mix(
    struck(hz, 60, mode, { gain, damp: 1.15, mallet: 0.4, malletHz: 2600, space: 0.12, tail: 0.5, jitter: 1.4 }),
    struck(bodyHz, 175, TABLE, { gain: gain * 1.5, damp: 1.0, space: 0.1, tail: 0.5 }),
  );
}

export { CLAY, mix, PAPER, PLASTIC, scatter, STACK, struck, TABLE };
export type { Partials, VoiceSpec };
