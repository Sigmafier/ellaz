// The words for the recorded arms. Lab chunk only.
//
// `audio/samples.ts` holds the mapping, because a player who never opens this
// screen still has to be able to PLAY a picked recording. The prose stays
// here so it is not in the shell.
//
// Every one of these is a real recording of a real object: Kenney's Casino
// Audio pack, CC0. Blurbs say what the recording IS - what was recorded, and
// how many takes - because that is the information a synth arm cannot offer
// and it is the whole reason to look at this group first.

import { SAMPLE_ARMS } from "../audio/samples";
import type { SfxName } from "../audio/pokerVoices";

export interface SampleCandidate {
  id: string;
  name: string;
  blurb: string;
  takes: number;
}

const WORDS: Record<string, { name: string; blurb: string }> = {
  "rec-chip-lay": {
    name: "Real chip",
    blurb: "A clay chip set down on felt. Recorded, not modelled.",
  },
  "rec-chip-stack": {
    name: "Real chip on chips",
    blurb: "Landing on the chips already in the pot rather than on the cloth.",
  },
  "rec-raise-stack": {
    name: "Real stack",
    blurb: "Chips colliding and a column set down. Four takes, so a raise never repeats.",
  },
  "rec-raise-handful": {
    name: "Real handful",
    blurb: "A hand of chips moved at once. Looser and messier than the stack.",
  },
  "rec-deal": {
    name: "Real deal",
    blurb: "A card across felt. SIX takes - this fires five times a hand and it is the one that has to survive repetition.",
  },
  "rec-deal-place": {
    name: "Real card placed",
    blurb: "Set down rather than skimmed. Shorter, with the landing at the front.",
  },
  "rec-shuffle": {
    name: "Real shuffle",
    blurb: "An actual riffle of an actual deck, three seconds of it.",
  },
  "rec-fold": {
    name: "Real muck",
    blurb: "Two cards shoved away across the cloth. Four takes.",
  },
  "rec-reveal": {
    name: "Real turn",
    blurb: "A card put down face up. The slap and the settle, both recorded.",
  },
  "rec-reveal-fan": {
    name: "Real fan",
    blurb: "Cards spread in one movement. Longer, and it reads as a showdown.",
  },
  "rec-pot": {
    name: "Real pot",
    blurb: "Chips stacked up in front of you. Four takes.",
  },
  "rec-pot-sweep": {
    name: "Real sweep",
    blurb: "A handful gathered and moved. Less stacking, more travelling.",
  },
  "rec-allin": {
    name: "Real shove",
    blurb: "The biggest handful in the pack, over a stack going down.",
  },
  "rec-win": {
    name: "Real pile",
    blurb: "No music at all - your chips arriving, four different ways.",
  },
};

/** The recorded arms for one sound, in the order the studio lists them. */
export function recordedFor(sfx: SfxName): SampleCandidate[] {
  return Object.entries(SAMPLE_ARMS)
    .filter(([, arm]) => arm.sfx === sfx)
    .map(([id, arm]) => {
      const w = WORDS[id];
      // A missing word is a bug in THIS file, not a reason to render nothing -
      // an arm with no name would be an invisible button. Fall back to the id
      // so it is obvious and clickable rather than absent and silent.
      return { id, name: w?.name ?? id, blurb: w?.blurb ?? "A recording.", takes: arm.files.length };
    });
}

/** Every recorded arm id, for the tests and the reset path. */
export const RECORDED_IDS: string[] = Object.keys(SAMPLE_ARMS);
