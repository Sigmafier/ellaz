// Fantasy-console sixteen: a 4-pixel cell, the fixed 16-colour palette, a
// light dither so ramps read as ramps, and the classic one-cell outline.

import { ditherPixelate } from "../../passes/dither";
import { hexToRgb } from "../../passes/quantize";
import pico8 from "../../palettes/pico8.json";
import type { Renderer } from "../types";

export const CELL = 4;
const PAL = pico8.colors.map((c) => hexToRgb(c.hex));

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL, PAL, { outline: true, strength: 0.35 });
