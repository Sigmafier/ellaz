// The robot as one static pose (the prototype's), in a 64-unit-tall body
// space with the head's top-left at (0,0). W8 replaces this with a rigged
// body; the static pose stays as the reference every technique sample draws.

import { C, P, R, place, type Op } from "../../scene-ops";

export const ROBOT_COLOURS = {
  shell: "#d8342e",
  shellDark: "#8f1c18",
  metal: "#9aa3b2",
  visor: "#ffd23f",
  eye: "#1a1a2e",
  chest: "#2b5cff",
  spark: "#ffd23f",
} as const;

export function robotOps(): Op[] {
  const k = ROBOT_COLOURS;
  const o: Op[] = [];
  // torso, chest light, shoulder, extended arm + fist
  o.push(R(-2, 22, 26, 24, k.shell, true, 3));
  o.push(R(6, 28, 10, 10, k.chest, true, 1));
  o.push(R(-12, 26, 12, 8, k.metal, true, 2));
  o.push(R(20, 27, 30, 8, k.metal, true, 2));
  o.push(C(52, 31, 6, k.metal));
  // head, visor, eyes, antenna
  o.push(R(0, 0, 24, 20, k.shell, true, 4));
  o.push(R(3, 6, 18, 7, k.visor, true, 1));
  o.push(R(6, 8, 3, 3, k.eye));
  o.push(R(15, 8, 3, 3, k.eye));
  o.push(R(9, -6, 6, 7, k.metal));
  o.push(C(12, -8, 3, k.visor));
  // legs and feet
  o.push(R(1, 46, 8, 14, k.shellDark, true, 1));
  o.push(R(13, 46, 8, 14, k.shellDark, true, 1));
  o.push(R(-2, 58, 12, 6, k.eye, true, 2));
  o.push(R(12, 58, 12, 6, k.eye, true, 2));
  // punch spark
  o.push(P([[58, 31], [64, 24], [66, 31], [74, 32], [66, 35], [64, 42], [60, 35], [52, 34]], k.spark));
  return o;
}

/** The robot placed at (x, y) and scaled by s. */
export const robot = (x: number, y: number, s: number): Op[] => place(robotOps(), x, y, s);
