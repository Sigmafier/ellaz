// NES 8-bit: a 9-pixel cell, outline, and the hue/lightness snap that reads
// as NES without the muddy skin tones a straight palette snap gave.

import { pixelate } from "../../passes/pixelate";
import { nesSnap } from "../../passes/quantize";
import type { Renderer } from "../types";

export const CELL = 9;

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { outline: true, quant: nesSnap });
