// The knight as a rig. Static coordinates shifted by (-11, -63) so the feet
// sit at the origin. The sword is on the right arm, the shield on the left,
// the cape on the torso behind everything.

import { C, P, R } from "../../scene-ops";
import type { Rig } from "../../rig/types";
import { standardClips } from "../clips";
import { KNIGHT_COLOURS as k } from "./static";

const SLASH = P([[8, -34], [26, -40], [30, -26], [22, -14], [10, -16]], "rgba(255,255,255,.55)");

export const knightRig: Rig = {
  id: "knight",
  bones: [
    { id: "root", parent: null, x: 0, y: 0 },
    { id: "torso", parent: "root", x: 0, y: -15 },
    { id: "head", parent: "torso", x: 0, y: -26 },
    { id: "armL", parent: "torso", x: -11, y: -18 },
    { id: "armR", parent: "torso", x: 9, y: -20 },
    { id: "legL", parent: "root", x: -5, y: -15 },
    { id: "legR", parent: "root", x: 5, y: -15 },
  ],
  parts: [
    // cape hangs from the torso, behind everything
    { id: "cape", bone: "torso", z: 0, ops: [P([[-13, -26], [-27, 14], [-7, 10], [3, -26]], k.cape)] },
    { id: "legL", bone: "legL", z: 1, ops: [R(-4, 0, 8, 12, k.greave, true, 1), R(-6, 10, 11, 5, k.eye, true, 2)] },
    { id: "legR", bone: "legR", z: 1, ops: [R(-4, 0, 8, 12, k.greave, true, 1), R(-5, 10, 11, 5, k.eye, true, 2)] },
    { id: "torso", bone: "torso", z: 2, ops: [R(-11, -26, 22, 26, k.plate, true, 3), R(-5, -20, 10, 12, k.plateDark, true, 1)] },
    { id: "armL", bone: "armL", z: 3, ops: [R(-10, -4, 10, 8, k.plate, true, 2), C(-12, 2, 9, k.shield), C(-12, 2, 5, k.gold)] },
    { id: "head", bone: "head", z: 4, ops: [R(-9, -22, 18, 22, k.plate, true, 4), R(-6, -14, 12, 5, k.skin, true, 1), R(-4, -13, 3, 3, k.eye), R(2, -13, 3, 3, k.eye), R(-3, -28, 6, 7, k.plume, true, 2)] },
    { id: "armR", bone: "armR", z: 5, ops: [R(0, -8, 8, 10, k.plate, true, 2), R(4, -50, 5, 42, k.blade, true, 1), R(-2, -10, 17, 4, k.gold, true, 1), R(5, -54, 3, 4, k.gold)] },
    { id: "slash", bone: "armR", z: 6, ops: [] },
  ],
  sockets: { hand: { bone: "armR", x: 4, y: -3 }, head: { bone: "head", x: 0, y: -28 }, shield: { bone: "armL", x: -12, y: 2 } },
  hitbox: [-13, -70, 26, 70],
  clips: standardClips({
    attack: { slash: [SLASH] },
    hurt: { head: [R(-9, -22, 18, 22, k.plate, true, 4), R(-6, -14, 12, 5, k.skin, true, 1), R(-4, -13, 3, 3, k.plume), R(2, -13, 3, 3, k.plume), R(-3, -28, 6, 7, k.plume, true, 2)] },
    ko: { head: [R(-9, -22, 18, 22, k.plate, true, 4), R(-6, -14, 12, 5, k.plateDark, true, 1), R(-3, -28, 6, 7, k.plume, true, 2)] },
  }),
};
