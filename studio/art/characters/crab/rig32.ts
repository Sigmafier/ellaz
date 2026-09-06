// The 32px crab on the rig: pixels32.ts cut along the standard bones. The
// claws are the arms, the eye stalks are the head, three legs a side share a
// hip so the standard walk scuttles.

import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { CRAB32_GRID as G, CRAB32_PALETTE as PAL } from "./pixels32";

export const CRAB32_UNIT = 5;
const U = CRAB32_UNIT;

// eyes: on the stalks, K at rows 5-6, cols 15-16 and 25-26, a W glint at the top-left
const HURT_HEAD = editGrid(editGrid(G, { 5: [15, "WW"], 6: [15, "KK"] }), { 5: [25, "WW"], 6: [25, "KK"] });
const KO_HEAD = editGrid(editGrid(G, { 5: [15, "KW"], 6: [15, "WK"] }), { 5: [25, "KW"], 6: [25, "WK"] });

export const CRAB32_SPEC: PixelRigSpec = {
  id: "crab",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [20, 32],
  bones: {
    torso: { at: [20, 27], parent: "root" },
    head: { at: [20, 11], parent: "torso" },
    armL: { at: [9, 18], parent: "torso" },
    armR: { at: [31, 18], parent: "torso" },
    legL: { at: [14, 27], parent: "root" },
    legR: { at: [26, 27], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[25, 31, 0, 18]], only: "dqO" },
    { id: "legR", bone: "legR", z: 1, regions: [[25, 31, 21, 39]], only: "dqO" },
    { id: "clawL", bone: "armL", z: 3, regions: [[5, 22, 0, 10]] },
    { id: "clawR", bone: "armR", z: 3, regions: [[5, 22, 29, 39]] },
    { id: "head", bone: "head", z: 4, regions: [[0, 11, 11, 29]] },
    { id: "torso", bone: "torso", z: 2, regions: [[0, 31, 0, 39]] },
  ],
  sockets: { hand: { bone: "armR", at: [39, 16] }, head: { bone: "head", at: [20, 3] } },
  hitbox: [7, 2, 33, 31],
  clips: [],
};

const built = buildPixelRig(CRAB32_SPEC);
const clips = standardClips({
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
});
clips[1] = { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -5 }, legR: { dx: 5 }, torso: { dy: -3 } } }, { at: 3, pose: { legL: { dx: 5 }, legR: { dx: -5 }, torso: { dy: -3 } } }] };
built.rig.clips = scaleClipTranslations(clips, U * 0.46, U);
// the standard tumble would stand this body on end; it lies down its own way
built.rig.clips[4].keys[1].pose = { root: { rot: Math.PI, dy: -30 * U } };

export const crab32 = built;
export const crab32Rig = built.rig;
