// Procedural mask generator: a seeded noise mask, mirrored left-right, with
// a body-plan template deciding where noise is allowed. Zero authoring per
// sprite - good for a swarm of enemies or a hundred props - and it never
// produces a specific character, only a family. The sample is "a robot-ish
// thing", by design.

import { R, type Op } from "../scene-ops";
import { rngFor } from "../rng";
import type { Technique } from "./types";

export interface MaskSpec {
  w: number; // even, full width in cells
  h: number;
  /** allowed cells, left half only ("." never, "?" maybe, "#" always) */
  template: string[];
  palette: string[];
  seed: string;
  cell: number;
}

export function maskToOps(spec: MaskSpec): Op[] {
  const rng = rngFor(spec.seed);
  const half = spec.w / 2;
  const grid: (string | null)[][] = [];
  for (let j = 0; j < spec.h; j++) {
    const row: (string | null)[] = new Array(spec.w).fill(null);
    for (let i = 0; i < half; i++) {
      const t = spec.template[j]?.[i] ?? ".";
      const on = t === "#" || (t === "?" && rng() > 0.45);
      if (!on) continue;
      const col = spec.palette[Math.floor(rng() * spec.palette.length)];
      row[i] = col;
      row[spec.w - 1 - i] = col;
    }
    grid.push(row);
  }
  const out: Op[] = [];
  const ox = -(spec.w * spec.cell) / 2, oy = -spec.h * spec.cell;
  grid.forEach((row, j) => {
    let i = 0;
    while (i < spec.w) {
      const col = row[i];
      if (!col) { i++; continue; }
      let n = 1;
      while (row[i + n] === col) n++;
      out.push(R(ox + i * spec.cell, oy + j * spec.cell, n * spec.cell, spec.cell, col));
      i += n;
    }
  });
  return out;
}

export const ROBOT_MASK: MaskSpec = {
  w: 14, h: 18, cell: 3.5, seed: "procedural:robot",
  palette: ["#d8342e", "#d8342e", "#8f1c18", "#9aa3b2", "#ffd23f"],
  template: [
    "...?###", "...?###", "..?####", "..?####", "..?####", "...####", "....##.",
    ".?#####", "?######", "?######", "..#####", "..#####", "..#####", "..#####",
    "...##..", "...##..", "...##..", "..###..",
  ],
};

export const proceduralMask: Technique = {
  id: "procedural-mask",
  name: "Procedural mask generator",
  input: "a body-plan template + a seed + a palette",
  costPerAnimation: "zero per sprite; animation by re-seeding or template swaps",
  summary: "A template says where pixels may appear; a seeded coin toss fills the maybes; the result is mirrored so it reads as a creature. Every seed is a new sprite for free, which is exactly right for a swarm and exactly wrong for a hero. The sample is robot-shaped, never THE robot - the technique cannot make one.",
  sample: () => maskToOps(ROBOT_MASK),
};
