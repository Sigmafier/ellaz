// The 64px golem on the rig: pixels64.ts cut along the standard bones. The
// arms hang as pillars and swing on attack with a burst at the fist; the head
// takes only the stone and glow characters of its rows, the shoulders stay.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { GOLEM64_GRID as G, GOLEM64_PALETTE as PAL } from "./pixels64";

export const GOLEM64_UNIT = 5;
const U = GOLEM64_UNIT;

// eyes: glowing y at rows 9-10, cols 24-26 and 29-31, a Y spark at the top-left
const HURT_HEAD = editGrid(editGrid(G, { 9: [24, "sss"], 10: [24, "yyy"] }), { 9: [29, "sss"], 10: [29, "yyy"] });
const KO_HEAD = editGrid(editGrid(G, { 9: [24, "qqq"], 10: [24, "qqq"] }), { 9: [29, "qqq"], 10: [29, "qqq"] });

const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; });
const SPARK_RIM = P(star(6, 20, 8, 3.6), PAL.O);
const SPARK = P(star(6, 20, 7, 3), PAL.Y);
export const GOLEM64_SPEC: PixelRigSpec = {
  id: "golem",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [28, 64],
  bones: {
    torso: { at: [28, 46], parent: "root" },
    head: { at: [28, 15], parent: "torso" },
    armL: { at: [5, 16], parent: "torso" },
    armR: { at: [50, 16], parent: "torso" },
    legL: { at: [20, 46], parent: "root" },
    legR: { at: [36, 46], parent: "root" },
  },
  parts: [
    { id: "legL", bone: "legL", z: 1, regions: [[46, 63, 11, 27]] },
    { id: "legR", bone: "legR", z: 1, regions: [[46, 63, 28, 44]] },
    { id: "armL", bone: "armL", z: 3, regions: [[15, 51, 0, 10]] },
    { id: "armR", bone: "armR", z: 3, regions: [[15, 51, 45, 55]] },
    { id: "head", bone: "head", z: 4, regions: [[3, 15, 21, 34]], only: "SsdqQyYKO" },
    { id: "torso", bone: "torso", z: 2, regions: [[12, 47, 0, 55]] },
    { id: "spark", bone: "armR", z: 5, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [50, 50] }, head: { bone: "head", at: [28, 4] } },
  hitbox: [10, 3, 45, 63],
  clips: [],
};

const built = buildPixelRig(GOLEM64_SPEC);
const clips = standardClips({
  attack: { spark: [SPARK_RIM, SPARK] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
});
clips[1] = { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -3 }, armL: { rot: 0.2 }, armR: { rot: -0.2 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -1 }, armL: { rot: -0.2 }, armR: { rot: 0.2 } } }] };
// a lunge on the standard's legR swing would dip these long legs; the arm does the work
clips[2] = { id: "attack", frames: 6, fps: 12, loop: false, swaps: { spark: [SPARK_RIM, SPARK] }, keys: [{ at: 0, pose: { armR: { rot: 0.9, dx: -2 }, torso: { rot: -0.1 } } }, { at: 2, pose: { armR: { rot: -0.35, dx: 2 }, torso: { rot: 0.15, dx: 2 } } }, { at: 5, pose: {} }] };
built.rig.clips = scaleClipTranslations(clips, U * 0.95, U);
// the standard tumble would stand this body on end; it lies down its own way
built.rig.clips[4].keys[1].pose = { root: { rot: -Math.PI / 2, dy: -28 * U } };

export const golem64 = built;
export const golem64Rig = built.rig;
