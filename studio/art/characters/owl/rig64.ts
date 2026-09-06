// The 64px Owl King on the rig: pixels64.ts cut along the standard bones. The
// crown, tufts, eyes and beak turn with the head; the wings are the arms and
// pivot at the shoulder; the talons are the legs.

import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { OWL64_GRID as G, OWL64_PALETTE as PAL } from "./pixels64";

export const OWL64_UNIT = 5;
const U = OWL64_UNIT;

// eyes: K pupils 7 wide at rows 23-29, cols 17-23 and 33-39, inside the yellow irises
const HURT_HEAD = editGrid(editGrid(G, { 23: [17, "yyyyyyy"], 24: [17, "yyyyyyy"], 25: [17, "yyyyyyy"], 26: [17, "KKKKKKK"], 27: [17, "yyyyyyy"], 28: [17, "yyyyyyy"], 29: [17, "yyyyyyy"] }), { 23: [33, "yyyyyyy"], 24: [33, "yyyyyyy"], 25: [33, "yyyyyyy"], 26: [33, "KKKKKKK"], 27: [33, "yyyyyyy"], 28: [33, "yyyyyyy"], 29: [33, "yyyyyyy"] });
const KO_HEAD = editGrid(editGrid(G, { 23: [17, "KyyyyyK"], 24: [17, "yKyyyKy"], 25: [17, "yyKyKyy"], 26: [17, "yyyKyyy"], 27: [17, "yyKyKyy"], 28: [17, "yKyyyKy"], 29: [17, "KyyyyyK"] }), { 23: [33, "KyyyyyK"], 24: [33, "yKyyyKy"], 25: [33, "yyKyKyy"], 26: [33, "yyyKyyy"], 27: [33, "yyKyKyy"], 28: [33, "yKyyyKy"], 29: [33, "KyyyyyK"] });

export const OWL64_SPEC: PixelRigSpec = {
  id: "owl",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [28, 64],
  bones: {
    torso: { at: [28, 58], parent: "root" },
    head: { at: [28, 34], parent: "torso" },
    armL: { at: [8, 27], parent: "torso" },
    armR: { at: [48, 27], parent: "torso" },
    legL: { at: [21, 58], parent: "root" },
    legR: { at: [35, 58], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[57, 63, 14, 26]], only: "NnO" },
    { id: "legR", bone: "legR", z: 1, regions: [[57, 63, 28, 40]], only: "NnO" },
    { id: "wingL", bone: "armL", z: 3, regions: [[26, 54, 0, 13]] },
    { id: "wingR", bone: "armR", z: 3, regions: [[26, 54, 42, 55]] },
    { id: "head", bone: "head", z: 4, regions: [[0, 33, 0, 55]] },
    { id: "torso", bone: "torso", z: 2, regions: [[0, 63, 0, 55]] },
  ],
  sockets: { hand: { bone: "armR", at: [53, 40] }, head: { bone: "head", at: [28, 0] } },
  hitbox: [12, 0, 44, 63],
  clips: [],
};

const built = buildPixelRig(OWL64_SPEC);
const clips = standardClips({
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
});
clips[1] = { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -2 }, armL: { rot: 0.35 }, armR: { rot: -0.35 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -2 }, armL: { rot: -0.35 }, armR: { rot: 0.35 } } }] };
built.rig.clips = scaleClipTranslations(clips, U * 0.95, U);
// the standard tumble would stand this body on end; it lies down its own way
built.rig.clips[4].keys[1].pose = { root: { rot: -Math.PI / 2, dy: -28 * U } };

export const owl64 = built;
export const owl64Rig = built.rig;
