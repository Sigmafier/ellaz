// The cast. One entry per character: its rig (animated) and its static
// reference pose (the scenes and the technique samples draw this one).

import type { Op } from "../scene-ops";
import type { BakedClip, Rig } from "../rig/types";
import { bakeAll } from "../rig/rig";
import { robotOps } from "./robot/static";
import { knightOps } from "./knight/static";
import { teddyOps } from "./teddy/static";
import { slimeOps } from "./slime/static";
import { robotRig } from "./robot/rig";
import { knightRig } from "./knight/rig";
import { teddyRig } from "./teddy/rig";
import { slimeClips } from "./slime/frames";

export type Side = "hero" | "enemy";

export interface Character {
  id: string;
  name: string;
  side: Side;
  /** the static reference pose, in the scene builders' coordinate space */
  staticOps: () => Op[];
  /** how the frames are made - the technique library's vocabulary */
  technique: "parts-rig" | "parametric" | "shape-frames";
  /** the rig, when the character has one; slime is frames only */
  rig: Rig | null;
  /** every clip, baked. The one thing an exporter needs. */
  clips: () => BakedClip[];
}

export const CHARACTERS: Character[] = [
  { id: "robot", name: "Robot", side: "hero", technique: "parts-rig", staticOps: robotOps, rig: robotRig, clips: () => bakeAll(robotRig) },
  { id: "knight", name: "Knight", side: "hero", technique: "parts-rig", staticOps: knightOps, rig: knightRig, clips: () => bakeAll(knightRig) },
  { id: "teddy", name: "Angry Teddy", side: "enemy", technique: "parametric", staticOps: teddyOps, rig: teddyRig, clips: () => bakeAll(teddyRig) },
  { id: "slime", name: "Slime", side: "enemy", technique: "shape-frames", staticOps: slimeOps, rig: null, clips: slimeClips },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
export const characterById = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);
export const RIGGED = CHARACTERS.filter((c) => c.rig !== null) as (Character & { rig: Rig })[];
