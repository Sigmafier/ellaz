// Game Boy: a 7-pixel cell, outline, and four green shades split so the
// foreground takes the two dark ones and the background the two light ones.
// Without that split a character dissolved into the wall behind it.

import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 7;

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { outline: true, fgAware: true });
