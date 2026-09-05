// The cast. One entry per character: its rig (animated) and its static
// reference pose (the scenes and the technique samples draw this one).

import type { Op } from "../scene-ops";
import type { Rig } from "../rig/types";
import { robotOps } from "./robot/static";
import { knightOps } from "./knight/static";
import { teddyOps } from "./teddy/static";
import { slimeOps } from "./slime/static";
import { robotRig } from "./robot/rig";
import { knightRig } from "./knight/rig";

export type Side = "hero" | "enemy";

export interface Character {
  id: string;
  name: string;
  side: Side;
  /** the static reference pose, in the scene builders' coordinate space */
  staticOps: () => Op[];
  /** null until the character is rigged (teddy and slime arrive in W9) */
  rig: Rig | null;
}

export const CHARACTERS: Character[] = [
  { id: "robot", name: "Robot", side: "hero", staticOps: robotOps, rig: robotRig },
  { id: "knight", name: "Knight", side: "hero", staticOps: knightOps, rig: knightRig },
  { id: "teddy", name: "Angry Teddy", side: "enemy", staticOps: teddyOps, rig: null },
  { id: "slime", name: "Slime", side: "enemy", staticOps: slimeOps, rig: null },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
export const characterById = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);
export const RIGGED = CHARACTERS.filter((c) => c.rig !== null) as (Character & { rig: Rig })[];
