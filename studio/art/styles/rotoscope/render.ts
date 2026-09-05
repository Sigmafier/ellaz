// Rotoscoped pixel: a 4-pixel cell, no outline, and an eight-colour muted
// palette - the few flat tones a traced performer was reduced to. The
// motion, not the rendering, is what this style is for.

import { ditherPixelate } from "../../passes/dither";
import { hexToRgb } from "../../passes/quantize";
import type { Renderer } from "../types";

export const CELL = 4;
export const MUTED = ["#1B1A2E", "#3E3A5C", "#6B5B7B", "#9C7C6B", "#C9A27E", "#5A7A6B", "#8FA3A8", "#E8DCC8"];
const PAL = MUTED.map(hexToRgb);

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL, PAL, { strength: 0 });
