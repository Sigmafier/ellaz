// VGA painterly: a 3-pixel cell, the foreground shaded with a hard highlight
// before it is downsampled, then a 6x6x6 colour cube with
// no dither (a flat field checkered under it) - the "256 colours" of a DOS adventure, ramps and all. No outline.

import { cube, ditherPixelate } from "../../passes/dither";
import type { Renderer } from "../types";

export const CELL = 3;
const CUBE = cube(6);

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL, CUBE, { shaded: true, strength: 0 });
