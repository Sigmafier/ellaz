// The technique library: how frames are made. Eight sampled (each produces
// the robot, or as close to it as the technique can get), three card-only.
// docs/techniques.md is generated from this list by the test, both ways.

import type { Technique } from "./types";
import { pixelStrings } from "./pixel-strings";
import { shapeDsl } from "./shape-dsl";
import { partsRig } from "./parts-rig";
import { parametric } from "./parametric";
import { toolSvg } from "./tool-svg";
import { voxelModel } from "./voxel-model";
import { spriteStacking } from "./sprite-stacking";
import { proceduralMask } from "./procedural-mask";
import { aiCleaned, kidDrawings, runtimeShader } from "./cards";

export const TECHNIQUES: Technique[] = [
  pixelStrings, shapeDsl, partsRig, parametric, toolSvg, voxelModel, spriteStacking, proceduralMask,
  aiCleaned, kidDrawings, runtimeShader,
];

export const TECHNIQUE_IDS = TECHNIQUES.map((t) => t.id);
export const SAMPLED = TECHNIQUES.filter((t) => t.sample !== null) as (Technique & { sample: () => import("../scene-ops").Op[] })[];
export const techniqueById = (id: string): Technique | undefined => TECHNIQUES.find((t) => t.id === id);
export type { Technique } from "./types";
