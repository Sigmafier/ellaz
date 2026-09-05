// Arcade hand-drawn: a 3-pixel cell, the cast shaded with a hard highlight
// and rim, posterised to five steps per channel so every ramp reads as a
// drawn band, and a one-cell black outline. The big-sprite arcade look.

import { pixelate } from "../../passes/pixelate";
import type { Quantizer } from "../../passes/quantize";
import type { Renderer } from "../types";

export const CELL = 3;
export const STEPS = 5;
const step = 255 / (STEPS - 1);
const posterize: Quantizer = (r, g, b) => [Math.round(r / step) * step, Math.round(g / step) * step, Math.round(b / step) * step];

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { outline: true, shaded: true, quant: posterize });
