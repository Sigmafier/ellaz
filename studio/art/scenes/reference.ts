// The neutral reference: the whole roster on a plain two-tone ground, one
// row per band pair (kids above, teen and adult below). This is the scene a
// style recipe's "Sample" heading points at, because it has no room or field
// to flatter a style - only the cast. Every character is drawn at s = 1, so
// one authored pixel is one snes16 cell.

import { E, R, type Op, type Scene } from "../scene-ops";
import { PIXEL_CAST } from "../characters";
import { castAt, castWidth } from "./cast";

const GAP = 60;
const ROWS: string[][] = [
  PIXEL_CAST.filter((c) => c.band === "kids").map((c) => c.id),
  PIXEL_CAST.filter((c) => c.band !== "kids").map((c) => c.id),
];
const rowWidth = (ids: string[]) => ids.reduce((w, id) => w + castWidth(id), 0) + GAP * (ids.length + 1);

export const W = Math.max(...ROWS.map(rowWidth));
export const H = 800;
const GROUNDS = [380, 780];

function row(ids: string[], ground: number): Op[] {
  const ops: Op[] = [R(0, ground - 40, W, 60, "#c9d3e3", false)];
  let x = GAP;
  for (const id of ids) {
    const w = castWidth(id);
    ops.push(E(x + w / 2, ground - 8, w * 0.42, 9, "rgba(0,0,0,.2)", false));
    ops.push(...castAt(id, x + w / 2, ground));
    x += w + GAP;
  }
  return ops;
}

export const reference: Scene = {
  id: "reference",
  w: W,
  h: H,
  ops: [
    R(0, 0, W, H, "#e8eef7", false),
    ...ROWS.flatMap((ids, i) => row(ids, GROUNDS[i])),
  ],
};
