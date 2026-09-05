// SNES 16-bit: a 5-pixel cell, a one-cell dark outline around the cast,
// flat fills, no shading. The look the operator picked for both games.

import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 5;

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { outline: true });
