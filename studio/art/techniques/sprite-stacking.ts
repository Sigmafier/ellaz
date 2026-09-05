// Sprite stacking: a character is a stack of flat slices, drawn bottom to top
// with a small vertical offset each. Rotate every slice by the same angle and
// the whole character turns in fake 3D. One stack, any rotation.

import { C, E, R, bbox, type Op } from "../scene-ops";
import { rotate, transformOp, translate, multiply } from "../rig/transform";
import type { Technique } from "./types";

export interface Slice { ops: Op[]; height: number }

/** Draw a stack at rotation `angle`, `lift` units per slice, feet at (0, 0). */
export function stack(slices: Slice[], angle: number, lift = 1): Op[] {
  const out: Op[] = [];
  let y = 0;
  for (const s of slices) {
    for (let k = 0; k < s.height; k++) {
      const m = multiply(translate(0, y), rotate(angle));
      out.push(...s.ops.map((op) => transformOp(op, m)));
      y -= lift;
    }
  }
  return out;
}

const r = "#d8342e", d = "#8f1c18", m = "#9aa3b2", y = "#ffd23f", k = "#1a1a2e";
const disc = (rad: number, f: string, sx = 1): Op[] => [E(0, 0, rad * sx, rad * 0.5, f)];

export function robotSlices(): Slice[] {
  return [
    { ops: [E(-6, 0, 6, 3, k), E(6, 0, 6, 3, k)], height: 3 },                    // feet
    { ops: [E(-5, 0, 3.5, 2, d), E(5, 0, 3.5, 2, d)], height: 7 },               // legs
    { ops: disc(12, r, 1.1), height: 12 },                                        // torso
    { ops: [E(0, 0, 13, 6.5, r), E(-16, 0, 4, 2, m), E(16, 0, 4, 2, m)], height: 3 }, // shoulders
    { ops: disc(6, d), height: 2 },                                               // neck
    { ops: disc(11, r), height: 6 },                                              // head lower
    { ops: [E(0, 0, 11, 5.5, r), R(-8, -6, 16, 3, y)], height: 4 },              // visor band
    { ops: disc(11, r), height: 3 },                                              // head top
    { ops: [C(0, 0, 2, m)], height: 3 },                                          // antenna
    { ops: [C(0, 0, 3, y)], height: 2 },                                          // bulb
  ];
}

export const spriteStacking: Technique = {
  id: "sprite-stacking",
  name: "Sprite stacking",
  input: "a stack of flat slices, each with a height",
  costPerAnimation: "one stack; rotation is free, poses are new stacks",
  summary: "Slice the character horizontally, draw each slice flat, and draw them bottom-up with a one-unit lift per layer. Rotate every slice by the same angle and the character turns like a voxel model, at a fraction of the cost. Silhouettes are round by nature, so it suits robots and blobs more than knights.",
  sample: () => {
    const ops = stack(robotSlices(), 0.35);
    const lowest = Math.max(...ops.map((o) => { const [, by, , bh] = bbox(o); return by + bh; }));
    return ops.map((o) => transformOp(o, translate(0, -lowest)));
  },
};
