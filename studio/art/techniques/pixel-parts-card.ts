// The technique card for pixel parts on the rig. The sample is the 48px
// knight at rest, brought to one unit per pixel so it stands beside the other
// samples at the same height the robot does - the robot itself is not pixel
// art yet; when it is, it takes this sample over.

import { bakePose } from "../rig/rig";
import { scale, transformOp } from "../rig/transform";
import { KNIGHT48_UNIT, knight48Rig } from "../characters/knight/rig48";
import { snapOps } from "./pixel-parts";
import type { Technique } from "./types";

export const pixelParts: Technique = {
  id: "pixel-parts",
  name: "Pixel parts on the rig",
  input: "one pixel grid per character, cut into parts along the bone tree",
  costPerAnimation: "the standard clips for free; a new clip is keyframes, and every frame re-snaps to the grid",
  summary: "Draw the character once at its native size - 48 pixels for a hero - with the craft rules: silhouette first, clusters not dots, one light, hue-shifted ramps, its own outline. Cut the grid into parts on the standard bones, pose it with the standard clips, and re-rasterise every baked frame onto the pixel grid so a turned limb is crisp cells in the source palette. One drawing, five clips; the knight was the first.",
  sample: () => snapOps(bakePose(knight48Rig, {}), KNIGHT48_UNIT).map((o) => transformOp(o, scale(1 / KNIGHT48_UNIT, 1 / KNIGHT48_UNIT))),
};
