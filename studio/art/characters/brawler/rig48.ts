// The 48px brawler on the rig: pixels48.ts cut along the standard bones. The
// forward glove throws a star on attack; the hanging glove is the left arm.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { BRAWLER48_GRID as G, BRAWLER48_PALETTE as PAL } from "./pixels48";

export const BRAWLER48_UNIT = 5;
const U = BRAWLER48_UNIT;

// eyes: K at row 9, cols 13-14 and 18-19
const HURT_HEAD = editGrid(editGrid(G, { 9: [13, "dd"] }), { 9: [18, "dd"] });
const KO_HEAD = editGrid(editGrid(G, { 8: [13, "KF"], 9: [13, "FK"] }), { 8: [18, "KF"], 9: [18, "FK"] });

const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; });
const SPARK_RIM = P(star(13, 2, 6, 3.0), PAL.O);
const SPARK = P(star(13, 2, 5, 2.4), PAL.W);
export const BRAWLER48_SPEC: PixelRigSpec = {
  id: "brawler",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [16, 48],
  bones: {
    torso: { at: [16, 34], parent: "root" },
    head: { at: [16, 13], parent: "torso" },
    armL: { at: [6, 16], parent: "torso" },
    armR: { at: [23, 17], parent: "torso" },
    legL: { at: [12, 35], parent: "root" },
    legR: { at: [20, 35], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[35, 47, 7, 16]] },
    { id: "legR", bone: "legR", z: 1, regions: [[35, 47, 16, 24]] },
    { id: "armL", bone: "armL", z: 0, regions: [[14, 35, 0, 9]] },
    { id: "armR", bone: "armR", z: 4, regions: [[12, 25, 22, 33]] },
    { id: "head", bone: "head", z: 3, regions: [[0, 13, 8, 24]] },
    { id: "torso", bone: "torso", z: 2, regions: [[13, 35, 0, 33]] },
    { id: "spark", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [34, 19] }, head: { bone: "head", at: [16, 1] } },
  hitbox: [8, 0, 24, 47],
  clips: [],
};

const built = buildPixelRig(BRAWLER48_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  attack: { spark: [SPARK_RIM, SPARK] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.7, U);

export const brawler48 = built;
export const brawler48Rig = built.rig;
