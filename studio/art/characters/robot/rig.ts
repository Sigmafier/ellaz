// The robot as a rig. Body units: feet bottom-centre at (0, 0), head top at
// y = -64 - the static pose's coordinates shifted by (-12, -64). Every part
// is in its bone's local space; the static pose is reproduced exactly when
// every bone is at rest, which the test beside this file asserts.

import { C, P, R } from "../../scene-ops";
import type { Rig } from "../../rig/types";
import { standardClips } from "../clips";
import { ROBOT_COLOURS as k } from "./static";

const SPARK = P([[38, 0], [44, -7], [46, 0], [54, 1], [46, 4], [44, 11], [40, 4], [32, 3]], k.spark);

export const robotRig: Rig = {
  id: "robot",
  bones: [
    { id: "root", parent: null, x: 0, y: 0 },
    { id: "torso", parent: "root", x: 0, y: -18 },
    { id: "head", parent: "torso", x: 0, y: -24 },
    { id: "armL", parent: "torso", x: -12, y: -16 },
    { id: "armR", parent: "torso", x: 8, y: -15 },
    { id: "legL", parent: "root", x: -7, y: -18 },
    { id: "legR", parent: "root", x: 5, y: -18 },
  ],
  parts: [
    { id: "armL", bone: "armL", z: 0, ops: [R(-12, -4, 12, 8, k.metal, true, 2)] },
    { id: "legL", bone: "legL", z: 1, ops: [R(-4, 0, 8, 14, k.shellDark, true, 1), R(-7, 12, 12, 6, k.eye, true, 2)] },
    { id: "legR", bone: "legR", z: 1, ops: [R(-4, 0, 8, 14, k.shellDark, true, 1), R(-5, 12, 12, 6, k.eye, true, 2)] },
    { id: "torso", bone: "torso", z: 2, ops: [R(-14, -24, 26, 24, k.shell, true, 3), R(-6, -18, 10, 10, k.chest, true, 1)] },
    { id: "head", bone: "head", z: 3, ops: [R(-12, -22, 24, 20, k.shell, true, 4), R(-9, -16, 18, 7, k.visor, true, 1), R(-6, -14, 3, 3, k.eye), R(3, -14, 3, 3, k.eye), R(-3, -28, 6, 7, k.metal), C(0, -30, 3, k.visor)] },
    { id: "armR", bone: "armR", z: 4, ops: [R(0, -4, 30, 8, k.metal, true, 2), C(32, 0, 6, k.metal)] },
    { id: "spark", bone: "armR", z: 5, ops: [] },
  ],
  sockets: { hand: { bone: "armR", x: 32, y: 0 }, head: { bone: "head", x: 0, y: -30 } },
  hitbox: [-14, -66, 28, 66],
  clips: standardClips({
    attack: { spark: [SPARK] },
    hurt: { head: [R(-12, -22, 24, 20, k.shell, true, 4), R(-9, -16, 18, 7, k.shellDark, true, 1), R(-6, -14, 3, 3, k.visor), R(3, -14, 3, 3, k.visor), R(-3, -28, 6, 7, k.metal), C(0, -30, 3, k.visor)] },
    ko: { head: [R(-12, -22, 24, 20, k.shell, true, 4), R(-9, -16, 18, 7, k.shellDark, true, 1), R(-3, -28, 6, 7, k.metal), C(0, -30, 3, k.metal)] },
  }),
};
