// The 48px bunny on the rig: pixels48.ts cut along the standard bones. The
// ears turn with the head; the carrot is the right paw's, so it swings on
// attack, with a small star at its tip.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { BUNNY48_GRID as G, BUNNY48_PALETTE as PAL } from "./pixels48";

export const BUNNY48_UNIT = 5;
const U = BUNNY48_UNIT;

// eyes: K 2x2 at rows 19-20, cols 12-13 and 18-19, a W glint at the top-left of each
const HURT_HEAD = editGrid(editGrid(G, { 19: [12, "ff"], 20: [12, "KK"] }), { 19: [18, "ff"], 20: [18, "KK"] });
const KO_HEAD = editGrid(editGrid(G, { 19: [12, "Kf"], 20: [12, "fK"] }), { 19: [18, "Kf"], 20: [18, "fK"] });

const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; });
const SPARK_RIM = P(star(8, -5, 5, 2.4), PAL.O);
const SPARK = P(star(8, -5, 4, 1.8), PAL.W);
export const BUNNY48_SPEC: PixelRigSpec = {
  id: "bunny",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [16, 48],
  bones: {
    torso: { at: [16, 41], parent: "root" },
    head: { at: [16, 28], parent: "torso" },
    armL: { at: [7, 29], parent: "torso" },
    armR: { at: [24, 27], parent: "torso" },
    legL: { at: [11, 41], parent: "root" },
    legR: { at: [21, 41], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[40, 47, 4, 15]] },
    { id: "legR", bone: "legR", z: 1, regions: [[40, 47, 16, 27]] },
    { id: "armL", bone: "armL", z: 0, regions: [[27, 38, 2, 9]] },
    { id: "head", bone: "head", z: 3, regions: [[0, 28, 0, 25]] },
    { id: "armR", bone: "armR", z: 4, regions: [[19, 34, 20, 31]] },
    { id: "torso", bone: "torso", z: 2, regions: [[27, 40, 0, 31]] },
    { id: "spark", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [31, 22] }, head: { bone: "head", at: [16, 0] } },
  hitbox: [8, 0, 24, 47],
  clips: [],
};

const built = buildPixelRig(BUNNY48_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  attack: { spark: [SPARK_RIM, SPARK] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.7, U);

export const bunny48 = built;
export const bunny48Rig = built.rig;
