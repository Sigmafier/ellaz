// C64 multicolour: pixels twice as wide as they are tall (8 x 4), the sixteen
// measured colours, a little dither, and a one-cell dark outline.

import { ditherPixelate } from "../../passes/dither";
import { hexToRgb } from "../../passes/quantize";
import c64 from "../../palettes/c64.json";
import type { Renderer } from "../types";

export const CELL_X = 8;
export const CELL_Y = 4;
const PAL = c64.colors.map((c) => hexToRgb(c.hex));

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL_X, PAL, { cellY: CELL_Y, outline: true, strength: 0.3 });
