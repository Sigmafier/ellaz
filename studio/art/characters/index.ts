// The cast. One entry per character: its rig (animated) and its static
// reference pose (the scenes and the technique samples draw this one).
//
// Since 2026-09-05 every character is PIXEL ART on the rig: drawn once as a
// grid at its role's size (hero 48, small enemy 32, boss 64), cut along the
// standard bones, and re-snapped to the grid on every baked frame
// (art/techniques/pixel-parts.ts). The geometric rigs and static poses stay
// beside them as the technique library's samples.

import type { Op } from "../scene-ops";
import type { BakedClip, Rig } from "../rig/types";
import { bakeAll, bakePose } from "../rig/rig";
import { transformOp, translate } from "../rig/transform";
import { snapClips, snapOps, type PixelRig, type PixelRigSpec } from "../techniques/pixel-parts";
import { knight48, KNIGHT48_SPEC } from "./knight/rig48";
import { robot48, ROBOT48_SPEC } from "./robot/rig48";
import { teddy32, TEDDY32_SPEC } from "./teddy/rig32";
import { slime32, SLIME32_SPEC } from "./slime/rig32";

export type Side = "hero" | "enemy";
export type Role = "hero" | "enemy" | "boss";

export interface Character {
  id: string;
  name: string;
  side: Side;
  /** the static reference pose, in the scene builders' coordinate space */
  staticOps: () => Op[];
  /** how the frames are made - the technique library's vocabulary */
  technique: "parts-rig" | "parametric" | "shape-frames" | "pixel-parts";
  /** body units per authored pixel, when the character IS pixel art: frames are snapped to this grid and every placement aligns to it */
  pixel?: number;
  /** the rig, when the character has one */
  rig: Rig | null;
  /** every clip, baked. The one thing an exporter needs. */
  clips: () => BakedClip[];
}

/** the operator's sizes by role, in pixels tall (2026-09-05) */
export const HEIGHT_BY_ROLE: Record<Role, number> = { hero: 48, enemy: 32, boss: 64 };

function pixelCharacter(id: string, name: string, side: Side, built: PixelRig, spec: PixelRigSpec): Character & { rig: Rig } {
  const U = spec.unit;
  const [oc, orow] = spec.origin;
  return {
    id, name, side, technique: "pixel-parts", pixel: U, rig: built.rig,
    staticOps: () => snapOps(bakePose(built.rig, {}), U).map((o) => transformOp(o, translate(oc * U, orow * U))),
    clips: () => snapClips(bakeAll(built.rig), U),
  };
}

export const PIXEL_CAST: { id: string; built: PixelRig; spec: PixelRigSpec; role: Role }[] = [
  { id: "robot", built: robot48, spec: ROBOT48_SPEC, role: "hero" },
  { id: "knight", built: knight48, spec: KNIGHT48_SPEC, role: "hero" },
  { id: "teddy", built: teddy32, spec: TEDDY32_SPEC, role: "enemy" },
  { id: "slime", built: slime32, spec: SLIME32_SPEC, role: "enemy" },
];

export const CHARACTERS: Character[] = [
  pixelCharacter("robot", "Robot", "hero", robot48, ROBOT48_SPEC),
  pixelCharacter("knight", "Knight", "hero", knight48, KNIGHT48_SPEC),
  pixelCharacter("teddy", "Angry Teddy", "enemy", teddy32, TEDDY32_SPEC),
  pixelCharacter("slime", "Slime", "enemy", slime32, SLIME32_SPEC),
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
export const characterById = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);
export const RIGGED = CHARACTERS.filter((c) => c.rig !== null) as (Character & { rig: Rig })[];
