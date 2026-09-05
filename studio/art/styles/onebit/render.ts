// 1-bit: two values, a 4-pixel cell, full-amplitude ordered dither so every
// mid-tone becomes a checkerboard, and a one-cell ink outline so the cast
// keeps an edge when its fill dithers to the same weave as the ground.

import { ditherPixelate } from "../../passes/dither";
import { hexToRgb } from "../../passes/quantize";
import onebit from "../../palettes/onebit.json";
import type { Renderer } from "../types";

export const CELL = 4;
const PAL = onebit.colors.map((c) => hexToRgb(c.hex));

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL, PAL, { outline: true, strength: 1 });
