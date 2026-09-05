// The 48px robot on the rig: pixels48.ts cut along the standard bones. The
// hanging arm is the viewer's left, the punching arm the right; the spark on
// attack is a star in front of the fist, in armR space.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { ROBOT48_GRID as G, ROBOT48_PALETTE as PAL } from "./pixels48";

export const ROBOT48_UNIT = 5;
const U = ROBOT48_UNIT;

// eyes are the K pairs at rows 12-13, cols 14-15 and 19-20, inside the visor
const HURT_HEAD = editGrid(G, { 12: [14, "hh"], 13: [14, "hh"], 14: [14, "KK"] }).map((r, i) => (i === 12 || i === 13 ? r.slice(0, 19) + "hh" + r.slice(21) : i === 14 ? r.slice(0, 19) + "KK" + r.slice(21) : r));
const KO_HEAD = editGrid(G, { 12: [14, "yy"], 13: [14, "yy"], 1: [16, "hh"], 2: [16, "hh"], 3: [16, "hh"] }).map((r, i) => (i === 12 || i === 13 ? r.slice(0, 19) + "yy" + r.slice(21) : r));

const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; });
const SPARK_RIM = P(star(13, 2, 5, 2.4), PAL.O);
const SPARK = P(star(13, 2, 4, 1.8), PAL.Y);

export const ROBOT48_SPEC: PixelRigSpec = {
  id: "robot",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [17, 48],
  bones: {
    torso: { at: [17, 37], parent: "root" },
    head: { at: [17, 21], parent: "torso" },
    armL: { at: [8, 23], parent: "torso" },
    armR: { at: [26, 23], parent: "torso" },
    legL: { at: [13, 38], parent: "root" },
    legR: { at: [21, 38], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[38, 47, 8, 16]] },
    { id: "legR", bone: "legR", z: 1, regions: [[38, 47, 18, 26]] },
    { id: "armL", bone: "armL", z: 0, regions: [[21, 37, 2, 8]] },
    { id: "armR", bone: "armR", z: 4, regions: [[20, 29, 26, 35]] },
    { id: "head", bone: "head", z: 3, regions: [[0, 20, 7, 27]] },
    { id: "torso", bone: "torso", z: 2, regions: [[21, 37, 9, 25]] },
    { id: "spark", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [33, 25] }, head: { bone: "head", at: [17, 0] } },
  hitbox: [9, 0, 25, 47],
  clips: [],
};

const built = buildPixelRig(ROBOT48_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  attack: { spark: [SPARK_RIM, SPARK] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.7, U);

export const robot48 = built;
export const robot48Rig = built.rig;
