// Pre-rendered to pixel: the cast shaded like plastic (soft radial light,
// rim), downsampled to a 4-pixel cell and snapped to a 6x6x6 cube - the
// look of a 3D render quantised to a sprite. No outline; the shading is
// the edge.

import { cube } from "../../passes/dither";
import { pixelate } from "../../passes/pixelate";
import { nearest } from "../../passes/quantize";
import type { Renderer } from "../types";

export const CELL = 4;
const snap = nearest(cube(6));

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { shaded: true, quant: snap });
