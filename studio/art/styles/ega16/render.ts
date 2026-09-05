// EGA sixteen: a 4-pixel cell, the sixteen RGBI colours, and a heavy
// crosshatch dither because sixteen loud colours have no ramps of their own.

import { ditherPixelate } from "../../passes/dither";
import { hexToRgb } from "../../passes/quantize";
import ega16 from "../../palettes/ega16.json";
import type { Renderer } from "../types";

export const CELL = 4;
const PAL = ega16.colors.map((c) => hexToRgb(c.hex));

export const render: Renderer = (scene) => ditherPixelate(scene.ops, scene.w, scene.h, CELL, PAL, { outline: true, strength: 0.7 });
