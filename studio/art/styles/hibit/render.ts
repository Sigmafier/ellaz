// Hi-bit modern pixel: a 3-pixel cell, no outline, and the foreground shaded
// with a radial highlight before downsampling - the Owlboy / Celeste read.

import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 3;

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { shaded: true });
