// The knight, static pose: cape, shield on the left, sword raised on the right.

import { C, P, R, place, type Op } from "../../scene-ops";

export const KNIGHT_COLOURS = {
  plate: "#c0c8d8",
  plateDark: "#8a94a8",
  cape: "#c2185b",
  shield: "#2b5cff",
  gold: "#ffd23f",
  blade: "#e9eef7",
  skin: "#ffd9b3",
  eye: "#1a1a2e",
  plume: "#ff4d8d",
  greave: "#5a6478",
} as const;

export function knightOps(): Op[] {
  const k = KNIGHT_COLOURS;
  const o: Op[] = [];
  o.push(P([[-2, 22], [-16, 62], [4, 58], [14, 22]], k.cape));
  o.push(R(0, 22, 22, 26, k.plate, true, 3), R(6, 28, 10, 12, k.plateDark, true, 1));
  // shield arm
  o.push(R(-10, 26, 10, 8, k.plate, true, 2), C(-12, 32, 9, k.shield), C(-12, 32, 5, k.gold));
  // sword arm, blade, guard, tip
  o.push(R(20, 20, 8, 10, k.plate, true, 2), R(24, -22, 5, 42, k.blade, true, 1));
  o.push(R(18, 18, 17, 4, k.gold, true, 1), R(25, -26, 3, 4, k.gold));
  // helm, face slit, eyes, plume
  o.push(R(2, 0, 18, 22, k.plate, true, 4), R(5, 8, 12, 5, k.skin, true, 1));
  o.push(R(7, 9, 3, 3, k.eye), R(13, 9, 3, 3, k.eye), R(8, -6, 6, 7, k.plume, true, 2));
  // legs, boots
  o.push(R(2, 48, 8, 12, k.greave, true, 1), R(12, 48, 8, 12, k.greave, true, 1));
  o.push(R(0, 58, 11, 5, k.eye, true, 2), R(11, 58, 11, 5, k.eye, true, 2));
  return o;
}

export const knight = (x: number, y: number, s: number): Op[] => place(knightOps(), x, y, s);
