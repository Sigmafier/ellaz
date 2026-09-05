// The angry teddy, static pose. Body space: head centre at (0, 6).

import { C, E, P, place, type Op } from "../../scene-ops";

export const TEDDY_COLOURS = {
  fur: "#8a5a2b",
  furLight: "#d9a06a",
  furDark: "#5c3a18",
  eye: "#111111",
} as const;

export function teddyOps(): Op[] {
  const k = TEDDY_COLOURS;
  const o: Op[] = [];
  // ears
  o.push(C(-10, -2, 6, k.fur), C(10, -2, 6, k.fur), C(-10, -2, 3, k.furLight), C(10, -2, 3, k.furLight));
  // body, belly, arms, feet
  o.push(E(0, 34, 15, 17, k.fur), E(0, 38, 8, 10, k.furLight));
  o.push(E(-16, 30, 6, 5, k.fur), E(16, 30, 6, 5, k.fur));
  o.push(E(-8, 54, 6, 5, k.furDark), E(8, 54, 6, 5, k.furDark));
  // head, muzzle, eyes, nose
  o.push(C(0, 6, 14, k.fur), E(0, 11, 6, 4, k.furLight));
  o.push(C(-5, 3, 2, k.eye), C(5, 3, 2, k.eye), C(0, 9, 1.6, k.eye));
  // angry brows
  o.push(P([[-9, -2], [-2, 0], [-2, 1.5], [-9, -0.5]], k.furDark));
  o.push(P([[9, -2], [2, 0], [2, 1.5], [9, -0.5]], k.furDark));
  return o;
}

export const teddy = (x: number, y: number, s: number): Op[] => place(teddyOps(), x, y, s);
