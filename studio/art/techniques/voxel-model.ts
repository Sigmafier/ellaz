// Voxel model pre-rendered: a list of cubes, projected from a fixed
// isometric angle into three polygons per visible cube (top, left, right),
// painter-sorted. One model, any of eight facing directions for free.

import { P, bounds, place, type Op } from "../scene-ops";
import { shade } from "../passes/draw";
import type { Technique } from "./types";

export interface Voxel { x: number; y: number; z: number; f: string }

/** A box of voxels. y is UP in model space. */
export function box(x0: number, y0: number, z0: number, w: number, h: number, d: number, f: string): Voxel[] {
  const out: Voxel[] = [];
  for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) for (let z = z0; z < z0 + d; z++) out.push({ x, y, z, f });
  return out;
}

/**
 * Project voxels isometrically: screen x = (x - z) * c, screen y = (x + z) * c/2 - y * s.
 * Only cubes with an exposed face are drawn; sorted back to front.
 */
export function projectVoxels(vox: Voxel[], c = 3): Op[] {
  const key = (v: { x: number; y: number; z: number }) => `${v.x},${v.y},${v.z}`;
  const set = new Set(vox.map(key));
  const has = (x: number, y: number, z: number) => set.has(`${x},${y},${z}`);
  const s = c * 1.1;
  const sx = (x: number, z: number) => (x - z) * c;
  const sy = (x: number, y: number, z: number) => (x + z) * (c / 2) - y * s;
  const out: Op[] = [];
  for (const v of [...vox].sort((a, b) => a.x + a.z - (b.x + b.z) || a.y - b.y)) {
    const { x, y, z, f } = v;
    if (!has(x, y + 1, z)) out.push(P([[sx(x, z), sy(x, y + 1, z)], [sx(x + 1, z), sy(x + 1, y + 1, z)], [sx(x + 1, z + 1), sy(x + 1, y + 1, z + 1)], [sx(x, z + 1), sy(x, y + 1, z + 1)]], shade(f, 0.25)));
    if (!has(x, y, z + 1)) out.push(P([[sx(x, z + 1), sy(x, y + 1, z + 1)], [sx(x + 1, z + 1), sy(x + 1, y + 1, z + 1)], [sx(x + 1, z + 1), sy(x + 1, y, z + 1)], [sx(x, z + 1), sy(x, y, z + 1)]], shade(f, -0.35)));
    if (!has(x + 1, y, z)) out.push(P([[sx(x + 1, z), sy(x + 1, y + 1, z)], [sx(x + 1, z + 1), sy(x + 1, y + 1, z + 1)], [sx(x + 1, z + 1), sy(x + 1, y, z + 1)], [sx(x + 1, z), sy(x + 1, y, z)]], shade(f, -0.15)));
  }
  return out;
}

export function robotVoxels(): Voxel[] {
  const r = "#d8342e", d = "#8f1c18", m = "#9aa3b2", y = "#ffd23f", k = "#1a1a2e", b = "#2b5cff";
  return [
    ...box(1, 0, 1, 2, 1, 3, k), ...box(4, 0, 1, 2, 1, 3, k),           // feet
    ...box(1, 1, 2, 2, 3, 2, d), ...box(4, 1, 2, 2, 3, 2, d),           // legs
    ...box(0, 4, 1, 7, 6, 4, r), ...box(2, 6, 0, 3, 2, 1, b),           // torso, chest light
    ...box(-2, 7, 2, 2, 2, 2, m), ...box(7, 7, 2, 2, 2, 2, m),          // shoulders
    ...box(1, 10, 1, 5, 5, 4, r), ...box(1, 12, 0, 5, 2, 1, y),         // head, visor
    ...box(3, 15, 2, 1, 2, 1, m), ...box(3, 17, 2, 1, 1, 1, y),         // antenna
  ];
}

export const voxelModel: Technique = {
  id: "voxel",
  name: "Voxel model pre-rendered",
  input: "a list of cubes with colours",
  costPerAnimation: "one pose per clip frame; facing directions are free",
  summary: "Build the character out of cubes and project it from a fixed isometric angle: exposed top, left and right faces become three polygons each, lit by shading the base colour. Rotate the model and you have every facing direction from one source. Animation still means posing cubes, so it pairs best with the rig.",
  sample: () => {
    const ops = projectVoxels(robotVoxels(), 3.2);
    const [x, y, w, h] = bounds(ops)!;
    return place(ops, -(x + w / 2), -(y + h));
  },
};
