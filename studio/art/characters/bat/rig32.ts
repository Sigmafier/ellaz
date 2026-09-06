// The 32px bat on the rig: pixels32.ts cut along the standard bones. The
// wings are the arms; its own walk flaps them and lifts off the ground
// (`hops`), because a bat does not walk.

import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { BAT32_GRID as G, BAT32_PALETTE as PAL } from "./pixels32";

export const BAT32_UNIT = 5;
const U = BAT32_UNIT;

// eyes: Y at rows 13-14, cols 17-18 and 21-22, a K pupil at the lower-right of each
const HURT_HEAD = editGrid(editGrid(G, { 13: [17, "pp"], 14: [17, "YY"] }), { 13: [21, "pp"], 14: [21, "YY"] });
const KO_HEAD = editGrid(editGrid(G, { 13: [17, "Kp"], 14: [17, "pK"] }), { 13: [21, "Kp"], 14: [21, "pK"] });

export const BAT32_SPEC: PixelRigSpec = {
  id: "bat",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [20, 32],
  bones: {
    torso: { at: [20, 27], parent: "root" },
    head: { at: [20, 16], parent: "torso" },
    armL: { at: [15, 14], parent: "torso" },
    armR: { at: [25, 14], parent: "torso" },
    legL: { at: [17, 27], parent: "root" },
    legR: { at: [22, 27], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[27, 31, 14, 19]] },
    { id: "legR", bone: "legR", z: 1, regions: [[27, 31, 20, 25]] },
    { id: "wingL", bone: "armL", z: 0, regions: [[4, 26, 0, 15]] },
    { id: "wingR", bone: "armR", z: 0, regions: [[4, 26, 24, 39]] },
    { id: "head", bone: "head", z: 3, regions: [[3, 16, 13, 27]] },
    { id: "torso", bone: "torso", z: 2, regions: [[10, 27, 13, 27]] },
  ],
  sockets: { head: { bone: "head", at: [20, 5] } },
  hitbox: [13, 5, 27, 31],
  hops: true,
  clips: [],
};

const built = buildPixelRig(BAT32_SPEC);
const clips = standardClips({
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
});
clips[1] = { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { armL: { rot: -0.5 }, armR: { rot: 0.5 }, root: { dy: -2 } } }, { at: 3, pose: { armL: { rot: 0.5 }, armR: { rot: -0.5 }, root: { dy: -5 } } }] };
built.rig.clips = scaleClipTranslations(clips, U * 0.46, U);
// the standard tumble would stand this body on end; it lies down its own way
built.rig.clips[4].keys[1].pose = { root: { rot: Math.PI, dy: -27 * U } };

export const bat32 = built;
export const bat32Rig = built.rig;
