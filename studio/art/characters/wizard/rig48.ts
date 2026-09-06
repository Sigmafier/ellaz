// The 48px wizard on the rig: pixels48.ts cut along the standard bones. The
// hat and beard turn with the head; the staff and orb ride the right arm, and
// the orb throws a star on attack.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { WIZARD48_GRID as G, WIZARD48_PALETTE as PAL } from "./pixels48";

export const WIZARD48_UNIT = 5;
const U = WIZARD48_UNIT;

// eyes: K at rows 16-17, cols 14-15 and 18-19, under the brim
const HURT_HEAD = editGrid(editGrid(G, { 16: [14, "FF"], 17: [14, "KK"] }), { 16: [18, "FF"], 17: [18, "KK"] });
const KO_HEAD = editGrid(editGrid(G, { 16: [14, "KF"], 17: [14, "FK"] }), { 16: [18, "KF"], 17: [18, "FK"] });

const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; });
const SPARK_RIM = P(star(5, -17, 7, 3.2), PAL.O);
const SPARK = P(star(5, -17, 6, 2.6), PAL.S);
export const WIZARD48_SPEC: PixelRigSpec = {
  id: "wizard",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [16, 48],
  bones: {
    torso: { at: [16, 44], parent: "root" },
    head: { at: [16, 20], parent: "torso" },
    armL: { at: [8, 22], parent: "torso" },
    armR: { at: [25, 23], parent: "torso" },
    legL: { at: [11, 44], parent: "root" },
    legR: { at: [21, 44], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[44, 47, 7, 16]] },
    { id: "legR", bone: "legR", z: 1, regions: [[44, 47, 17, 26]] },
    { id: "armL", bone: "armL", z: 0, regions: [[21, 36, 4, 10]] },
    { id: "head", bone: "head", z: 3, regions: [[0, 13, 0, 28], [14, 31, 10, 24]] },
    { id: "armR", bone: "armR", z: 4, regions: [[0, 11, 25, 33], [12, 43, 28, 33], [21, 36, 23, 29]] },
    { id: "torso", bone: "torso", z: 2, regions: [[13, 44, 0, 33]] },
    { id: "spark", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [30, 6] }, head: { bone: "head", at: [17, 0] } },
  hitbox: [6, 0, 27, 47],
  clips: [],
};

const built = buildPixelRig(WIZARD48_SPEC);
const clips = standardClips({
  attack: { spark: [SPARK_RIM, SPARK] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
});
clips[1] = { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -2, rot: 0.03 }, armL: { rot: 0.25 }, armR: { rot: -0.15 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -2, rot: -0.03 }, armL: { rot: -0.25 }, armR: { rot: 0.15 } } }] };
built.rig.clips = scaleClipTranslations(clips, U * 0.7, U);

export const wizard48 = built;
export const wizard48Rig = built.rig;
