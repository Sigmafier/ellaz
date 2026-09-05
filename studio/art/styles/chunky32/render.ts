// Chunky 32: a 10-pixel cell, so a reference character is a dozen cells
// tall and every detail collapses to a few big clusters. Outline on.

import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 10;

export const render: Renderer = (scene) => pixelate(scene.ops, scene.w, scene.h, CELL, { outline: true });
