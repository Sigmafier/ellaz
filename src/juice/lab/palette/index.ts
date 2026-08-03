// The sound palette - "which CHARACTER", as opposed to the brackets'
// "which TREATMENT".
//
// Every character is synthesised from physics: real modal ratios for struck
// objects, real damping for their partials, a real room. That is WHY they feel
// familiar. Nothing here samples or imitates any product's actual assets, so
// there is no trade-dress exposure, and the whole palette is still 0 KB and
// works offline.

import type { VoiceSpec } from "../specs";
import type { JuiceEvent } from "../voices";
import type { Character } from "./builders";
import { TAP } from "./tap";
import { CORRECT, WRONG } from "./feedback";
import { COIN, STAR, WIN } from "./reward";

export type { Character } from "./builders";

export const PALETTE: Record<JuiceEvent, Character[]> = {
  tap: TAP,
  correct: CORRECT,
  win: WIN,
  coin: COIN,
  wrong: WRONG,
  star: STAR,
};

export const PALETTE_EVENTS: JuiceEvent[] = ["tap", "correct", "win", "coin", "wrong", "star"];

/** Every palette voice, for the engines to warm and level-match. */
export const PALETTE_SPECS: VoiceSpec[] = PALETTE_EVENTS.flatMap((e) =>
  PALETTE[e].map((c) => c.spec),
);

/** How many choices the operator is being offered, for the lab header. */
export const PALETTE_COUNT = PALETTE_SPECS.length;
