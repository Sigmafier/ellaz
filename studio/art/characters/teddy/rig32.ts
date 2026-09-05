// The 32px angry teddy on the rig: pixels32.ts cut along the standard bones.
// The feet carry their own colours (D, E) so the legs can claim them out of
// the body's bottom rows; the head region takes three rows of the body's top
// so the chin turns with the head.

import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { TEDDY32_GRID as G, TEDDY32_PALETTE as PAL } from "./pixels32";

export const TEDDY32_UNIT = 5;
const U = TEDDY32_UNIT;

// eyes: K at rows 9-10, cols 11-12 and 18-19 (with a W glint at row 9)
const HURT_HEAD = editGrid(G, { 9: [11, "FF"], 10: [11, "qq"] }).map((r, i) => (i === 9 ? r.slice(0, 18) + "FF" + r.slice(20) : i === 10 ? r.slice(0, 18) + "qq" + r.slice(20) : r));
const KO_HEAD = editGrid(G, { 9: [11, "qF"], 10: [11, "Fq"] }).map((r, i) => (i === 9 ? r.slice(0, 18) + "Fq" + r.slice(20) : i === 10 ? r.slice(0, 18) + "qF" + r.slice(20) : r));

export const TEDDY32_SPEC: PixelRigSpec = {
  id: "teddy",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [15, 32],
  bones: {
    torso: { at: [15, 26], parent: "root" },
    head: { at: [15, 17], parent: "torso" },
    armL: { at: [8, 20], parent: "torso" },
    armR: { at: [22, 20], parent: "torso" },
    legL: { at: [11, 27], parent: "root" },
    legR: { at: [19, 27], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[26, 31, 4, 14]], only: "DEO" },
    { id: "legR", bone: "legR", z: 1, regions: [[26, 31, 15, 26]], only: "DEO" },
    { id: "armL", bone: "armL", z: 0, regions: [[17, 25, 0, 7]] },
    { id: "armR", bone: "armR", z: 3, regions: [[17, 25, 23, 29]] },
    { id: "head", bone: "head", z: 4, regions: [[0, 18, 0, 29]] },
    { id: "torso", bone: "torso", z: 2, regions: [[16, 31, 0, 29]] },
  ],
  sockets: { hand: { bone: "armR", at: [26, 21] }, head: { bone: "head", at: [15, 0] } },
  hitbox: [7, 2, 23, 31],
  clips: [],
};

const built = buildPixelRig(TEDDY32_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.46, U);

export const teddy32 = built;
export const teddy32Rig = built.rig;
