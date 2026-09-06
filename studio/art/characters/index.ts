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
import { bunny48, BUNNY48_SPEC } from "./bunny/rig48";
import { crab32, CRAB32_SPEC } from "./crab/rig32";
import { owl64, OWL64_SPEC } from "./owl/rig64";
import { ninja48, NINJA48_SPEC } from "./ninja/rig48";
import { wizard48, WIZARD48_SPEC } from "./wizard/rig48";
import { bat32, BAT32_SPEC } from "./bat/rig32";
import { brawler48, BRAWLER48_SPEC } from "./brawler/rig48";
import { golem64, GOLEM64_SPEC } from "./golem/rig64";

export type Side = "hero" | "enemy";
export type Role = "hero" | "enemy" | "boss";
/** who the character is drawn for; the proportions and the reading age follow it (docs/art-bible.md § The roster) */
export type Band = "kids" | "teen" | "adult";

export interface Character {
  id: string;
  name: string;
  side: Side;
  role: Role;
  band: Band;
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

function pixelCharacter(id: string, name: string, role: Role, band: Band, built: PixelRig, spec: PixelRigSpec): Character & { rig: Rig } {
  const U = spec.unit;
  const [oc, orow] = spec.origin;
  return {
    id, name, side: role === "hero" ? "hero" : "enemy", role, band, technique: "pixel-parts", pixel: U, rig: built.rig,
    staticOps: () => snapOps(bakePose(built.rig, {}), U).map((o) => transformOp(o, translate(oc * U, orow * U))),
    clips: () => snapClips(bakeAll(built.rig), U),
  };
}

/** the roster: archetype x audience band (docs/art-bible.md § The roster), in the order the gallery lists them */
export const PIXEL_CAST: { id: string; name: string; built: PixelRig; spec: PixelRigSpec; role: Role; band: Band }[] = [
  { id: "robot", name: "Robot", built: robot48, spec: ROBOT48_SPEC, role: "hero", band: "kids" },
  { id: "bunny", name: "Bunny", built: bunny48, spec: BUNNY48_SPEC, role: "hero", band: "kids" },
  { id: "teddy", name: "Angry Teddy", built: teddy32, spec: TEDDY32_SPEC, role: "enemy", band: "kids" },
  { id: "slime", name: "Slime", built: slime32, spec: SLIME32_SPEC, role: "enemy", band: "kids" },
  { id: "crab", name: "Crab", built: crab32, spec: CRAB32_SPEC, role: "enemy", band: "kids" },
  { id: "owl", name: "Owl King", built: owl64, spec: OWL64_SPEC, role: "boss", band: "kids" },
  { id: "knight", name: "Knight", built: knight48, spec: KNIGHT48_SPEC, role: "hero", band: "teen" },
  { id: "ninja", name: "Ninja", built: ninja48, spec: NINJA48_SPEC, role: "hero", band: "teen" },
  { id: "wizard", name: "Wizard", built: wizard48, spec: WIZARD48_SPEC, role: "hero", band: "teen" },
  { id: "bat", name: "Bat", built: bat32, spec: BAT32_SPEC, role: "enemy", band: "teen" },
  { id: "brawler", name: "Brawler", built: brawler48, spec: BRAWLER48_SPEC, role: "hero", band: "adult" },
  { id: "golem", name: "Golem", built: golem64, spec: GOLEM64_SPEC, role: "boss", band: "adult" },
];

export const CHARACTERS: Character[] = PIXEL_CAST.map((c) => pixelCharacter(c.id, c.name, c.role, c.band, c.built, c.spec));

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
export const characterById = (id: string): Character | undefined => CHARACTERS.find((c) => c.id === id);
export const RIGGED = CHARACTERS.filter((c) => c.rig !== null) as (Character & { rig: Rig })[];
