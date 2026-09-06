// A pixel character at rest, placed in a scene: feet at (x, ground), one
// authored pixel = UNIT scene units at s = 1, so a pixel style's cells line
// up with the drawing's own pixels. Every scene draws the cast through this,
// never through the geometric statics - those stay as technique samples.

import { place, type Op } from "../scene-ops";
import { characterById, PIXEL_CAST } from "../characters";

export function castAt(id: string, x: number, ground: number, s = 1): Op[] {
  const p = PIXEL_CAST.find((c) => c.id === id);
  const ch = characterById(id);
  if (!p || !ch) throw new Error(`no pixel character "${id}"`);
  const U = p.spec.unit;
  const [oc, orow] = p.spec.origin;
  return place(ch.staticOps(), x - oc * U * s, ground - orow * U * s, s);
}

/** authored width in scene units at s = 1 */
export const castWidth = (id: string): number => {
  const p = PIXEL_CAST.find((c) => c.id === id);
  if (!p) throw new Error(`no pixel character "${id}"`);
  return p.spec.grid[0].length * p.spec.unit;
};
