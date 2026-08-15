// The recorded bank: which real files stand in for which table event.
//
// WHY RECORDINGS AT ALL, after three rounds of synthesis
//
// Researched 2026-08-15: commercial poker, solitaire and card games do not
// synthesise chips and cards. They play RECORDED foley and use code only to
// choose, layer and vary it - and there is no published procedural chip or
// riffle model anywhere, which is itself the finding. Every sound in this
// palette was one struck-object model, which is one of the three layers a
// real designer records, built from the wrong primitive.
//
//   chip on felt   transient + chip body + settle/scrape tail
//   riffle         chip-on-chip transients + stack compress/release + drag
//   deal           edge drag on felt + hand-release + slide tail
//   flip           finger-release snap + edge slap + follow-through
//
// The other reason is smaller and harder: nobody in this loop can hear. A
// recording of a chip is right by construction, which takes the assistant's
// judgement off the path entirely. That is the strongest argument for it and
// it is not a technical one.
//
// SOURCE AND LICENCE
//
// Kenney's "Casino Audio" (1.1), CC0 / public domain, via opengameart.org.
// "You may use these assets in personal and commercial projects. Credit
// (Kenney or www.kenney.nl) would be nice but is not mandatory." The full
// licence ships beside the audio at `public/sfx/v1/LICENSE.txt` and the credit
// is given in the studio and the README, because "not mandatory" is not a
// reason to omit it.
//
// Dice are excluded - hold'em has none, and they were a third of the pack.
//
// THIS FILE IS IN THE SHELL, and deliberately holds no prose: a player who
// never opens the studio still has to be able to PLAY a picked sample, so the
// mapping has to be here, while the names and blurbs live in
// `lab/sampleStrips.ts` inside the lab chunk.

import type { SfxName } from "./pokerVoices";
import { SAMPLE_GAIN } from "./sampleGain.gen";

/**
 * v1 is in the PATH.
 *
 * Files under `public/` are copied verbatim and are NOT content-hashed, so a
 * changed pack under the same name would be served out of a stale cache
 * forever - the same class of defect as the deploy ledger, one layer down. A
 * new pack is a new directory.
 */
export const SFX_BASE = "sfx/v1/";

export function sampleUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${SFX_BASE}${file}.opus`;
}

export interface SampleArm {
  sfx: SfxName;
  /** The variants. More than one is the whole point - see below. */
  files: readonly string[];
}

/**
 * VARIANTS ARE NOT DECORATION.
 *
 * `cardSlide` fires five or more times a hand and `chipClack` fires on every
 * call and every blind. One recording played identically at those rates is
 * the definition of repetition fatigue, and it is the thing middleware exists
 * to solve in real games: pick a different take, and detune it a little. Six
 * takes of a card slide is the single best use of bytes in this bank.
 */
export const SAMPLE_ARMS: Record<string, SampleArm> = {
  "rec-chip-lay": { sfx: "chipClack", files: ["chip-lay-1", "chip-lay-2", "chip-lay-3"] },
  "rec-chip-stack": { sfx: "chipClack", files: ["chips-collide-1", "chips-collide-2"] },

  "rec-raise-stack": { sfx: "chipRaise", files: ["chips-collide-3", "chips-collide-4", "chips-stack-1", "chips-stack-2"] },
  "rec-raise-handful": { sfx: "chipRaise", files: ["chips-handle-1", "chips-handle-2"] },

  "rec-deal": { sfx: "cardSlide", files: ["card-slide-1", "card-slide-2", "card-slide-3", "card-slide-4", "card-slide-5", "card-slide-6"] },
  "rec-deal-place": { sfx: "cardSlide", files: ["card-place-1", "card-place-2"] },

  "rec-shuffle": { sfx: "shuffle", files: ["card-shuffle"] },

  "rec-fold": { sfx: "fold", files: ["card-shove-1", "card-shove-2", "card-shove-3", "card-shove-4"] },

  "rec-reveal": { sfx: "reveal", files: ["card-place-3", "card-place-4"] },
  "rec-reveal-fan": { sfx: "reveal", files: ["card-fan-1", "card-fan-2"] },

  "rec-pot": { sfx: "potSlide", files: ["chips-stack-3", "chips-stack-4", "chips-stack-5", "chips-stack-6"] },
  "rec-pot-sweep": { sfx: "potSlide", files: ["chips-handle-3", "chips-handle-4"] },

  "rec-allin": { sfx: "allIn", files: ["chips-handle-5", "chips-handle-6", "chips-stack-5", "chips-stack-6"] },

  "rec-win": { sfx: "win", files: ["chips-stack-1", "chips-stack-2", "chips-stack-3", "chips-stack-4"] },
};

/**
 * TWO STRIPS GET NO RECORDING, AND THAT IS THE HONEST ANSWER.
 *
 * `checkKnock` is a hand on a table and `yourTurn` is a chime. Neither is a
 * card or a chip, so neither is in a casino foley pack, and inventing one out
 * of a chip sound would be worse than leaving the synth arm - which is
 * already the right primitive for a struck table. The studio says so out loud
 * rather than showing an empty group.
 */
export const NO_RECORDING: readonly SfxName[] = ["checkKnock", "yourTurn"];

export { SAMPLE_GAIN };
