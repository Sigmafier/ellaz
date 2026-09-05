// The slime, static pose: a blob, a lighter blob on top, eyes, a mouth, two drips.

import { C, E, place, type Op } from "../../scene-ops";

export const SLIME_COLOURS = {
  body: "#5fcf3a",
  bodyLight: "#7ee04a",
  shine: "#c8ffb0",
  mouth: "#2d6b1b",
  eye: "#111111",
} as const;

export function slimeOps(): Op[] {
  const k = SLIME_COLOURS;
  const o: Op[] = [];
  o.push(E(0, 40, 26, 20, k.body), E(-2, 36, 22, 17, k.bodyLight), E(-8, 26, 6, 3, k.shine));
  o.push(C(-8, 38, 3, k.eye), C(8, 38, 3, k.eye), E(0, 47, 5, 2, k.mouth));
  o.push(E(-30, 52, 5, 4, k.bodyLight), E(30, 54, 4, 3, k.bodyLight));
  return o;
}

export const slime = (x: number, y: number, s: number): Op[] => place(slimeOps(), x, y, s);
