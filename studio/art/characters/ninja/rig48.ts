// The 48px ninja on the rig: pixels48.ts cut along the standard bones. The
// blade rides the right arm and draws a thin crescent on attack; the scarf
// stays with the torso.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { NINJA48_GRID as G, NINJA48_PALETTE as PAL } from "./pixels48";

export const NINJA48_UNIT = 5;
const U = NINJA48_UNIT;

// eyes: K at rows 7-8, cols 13-14 and 18-19, in the mask's slit
const HURT_HEAD = editGrid(editGrid(G, { 7: [13, "FF"], 8: [13, "KK"] }), { 7: [18, "FF"], 8: [18, "KK"] });
const KO_HEAD = editGrid(editGrid(G, { 7: [13, "KF"], 8: [13, "FK"] }), { 7: [18, "KF"], 8: [18, "FK"] });

const arc = (r: number, a0: number, a1: number, n = 9): [number, number][] =>
  Array.from({ length: n }, (_, i) => { const a = a0 + ((a1 - a0) * i) / (n - 1); return [(12 + Math.cos(a) * r) * U, (1.5 + Math.sin(a) * r) * U]; });
const SLASH_RIM = P([...arc(9, -1.3, 0.3), ...arc(5, 0.3, -1.3)], PAL.O);
const SLASH = P([...arc(8, -1.25, 0.25), ...arc(6, 0.25, -1.25)], PAL.B);
export const NINJA48_SPEC: PixelRigSpec = {
  id: "ninja",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [16, 48],
  bones: {
    torso: { at: [16, 29], parent: "root" },
    head: { at: [16, 13], parent: "torso" },
    armL: { at: [8, 17], parent: "torso" },
    armR: { at: [22, 19], parent: "torso" },
    legL: { at: [13, 31], parent: "root" },
    legR: { at: [19, 31], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[30, 47, 8, 16]] },
    { id: "legR", bone: "legR", z: 1, regions: [[30, 47, 16, 24]] },
    { id: "armL", bone: "armL", z: 0, regions: [[16, 32, 5, 10]] },
    { id: "armR", bone: "armR", z: 4, regions: [[17, 24, 22, 33]] },
    { id: "head", bone: "head", z: 3, regions: [[0, 12, 6, 26]] },
    { id: "torso", bone: "torso", z: 2, regions: [[12, 30, 0, 33]] },
    { id: "slash", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [33, 20] }, head: { bone: "head", at: [16, 1] } },
  hitbox: [9, 1, 24, 47],
  clips: [],
};

const built = buildPixelRig(NINJA48_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  attack: { slash: [SLASH_RIM, SLASH] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.7, U);

export const ninja48 = built;
export const ninja48Rig = built.rig;
