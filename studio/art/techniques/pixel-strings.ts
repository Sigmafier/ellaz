// Pixel strings: a palette-indexed text grid, one character per pixel. The
// oldest trick in the book and still the fastest way to draw a 16x24 sprite
// in code. Each cell becomes a rect op, so every style can render it.

import { R, type Op } from "../scene-ops";
import type { Technique } from "./types";

export const ROBOT_PALETTE: Record<string, string> = {
  r: "#d8342e", d: "#8f1c18", m: "#9aa3b2", y: "#ffd23f", k: "#1a1a2e", b: "#2b5cff",
};

// 16 wide x 24 tall, 4 units per cell = 64 tall. "." is transparent.
export const ROBOT_GRID = [
  ".......y........",
  ".......m........",
  ".....rrrrrr.....",
  ".....ryyyyr.....",
  ".....rykyyr.....",
  ".....ryyyyr.....",
  ".....rrrrrr.....",
  ".......rr.......",
  ".mm.rrrrrrrr.mm.",
  ".mmmrrrbbrrrmmm.",
  "....rrrbbrrr....",
  "....rrrrrrrr....",
  "....rrrrrrrr....",
  "....rrrrrrrr....",
  "....rrrrrrrr....",
  ".....dd..dd.....",
  ".....dd..dd.....",
  ".....dd..dd.....",
  ".....dd..dd.....",
  ".....dd..dd.....",
  "....kkk..kkk....",
  "....kkk..kkk....",
  "................",
  "................",
];

/** Turn a grid into rect ops, `cell` units per cell, feet at (0, 0). Consecutive same-colour cells on a row merge into one rect. */
export function gridToOps(rows: string[], palette: Record<string, string>, cell: number): Op[] {
  const out: Op[] = [];
  const w = Math.max(...rows.map((r) => r.length));
  const lastInkRow = rows.reduce((m, r, i) => (/[^.]/.test(r) ? i : m), 0);
  const originY = -(lastInkRow + 1) * cell;
  const originX = -(w * cell) / 2;
  rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i];
      if (ch === "." || !palette[ch]) { i++; continue; }
      let n = 1;
      while (row[i + n] === ch) n++;
      out.push(R(originX + i * cell, originY + j * cell, n * cell, cell, palette[ch]));
      i += n;
    }
  });
  return out;
}

export const pixelStrings: Technique = {
  id: "pixel-strings",
  name: "Pixel strings in code",
  input: "a palette-indexed text grid per frame",
  costPerAnimation: "one grid per frame, by hand",
  summary: "Draw the sprite as rows of characters, one per pixel, with a map from character to colour. Runs of the same colour merge into one rect so a 16x24 grid becomes a few dozen ops. Fastest to author for anything under 32 cells; every frame is a whole new grid, so animation is the cost.",
  sample: () => gridToOps(ROBOT_GRID, ROBOT_PALETTE, 4),
};
