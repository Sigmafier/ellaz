// A technique is a way FRAMES ARE MADE, independent of how they look (that
// is a style). Every sampled technique produces the same subject - the robot,
// standing - so the gallery can show eight of them in a row and the
// difference is the technique, never the character.

import type { Op } from "../scene-ops";

export interface Technique {
  /** stable slug, also the docs table key */
  id: string;
  name: string;
  /** where frames come from, one line */
  input: string;
  /** what a NEW animation costs, one line */
  costPerAnimation: string;
  /** one paragraph for the card */
  summary: string;
  /** the robot, standing, feet at (0,0), body units - or null for a card-only technique */
  sample: (() => Op[]) | null;
  /** why there is no sample yet, for card-only entries */
  blockedOn?: string;
}
