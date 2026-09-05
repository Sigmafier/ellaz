// The 32px slime on the rig: one body part that squashes and stretches with
// sx/sy on the torso bone (pivot at the bottom, so the feet stay put), two
// drips as arm parts that ride along. Its own clips, the same ids and tempo
// as everyone else's, because a blob does not walk - it hops.

import { buildPixelRig, editGrid, type PixelRigSpec } from "../../techniques/pixel-parts";
import type { Clip } from "../../rig/types";
import { SLIME32_GRID as G, SLIME32_PALETTE as PAL } from "./pixels32";

export const SLIME32_UNIT = 5;
const U = SLIME32_UNIT;

// eyes: K 3x3 at rows 17-19, cols 13-15 and 25-27, glint W at the top-left
const HURT_BODY = editGrid(G, { 17: [13, "ggg"], 18: [13, "KKK"], 19: [13, "ggg"] }).map((r, i) => (i === 17 || i === 19 ? r.slice(0, 25) + "ggg" + r.slice(28) : i === 18 ? r.slice(0, 25) + "KKK" + r.slice(28) : r));
const KO_BODY = editGrid(G, { 17: [13, "Qgg"], 18: [13, "gQg"], 19: [13, "ggQ"] }).map((r, i) => (i === 17 ? r.slice(0, 25) + "ggQ" + r.slice(28) : i === 18 ? r.slice(0, 25) + "gQg" + r.slice(28) : i === 19 ? r.slice(0, 25) + "Qgg" + r.slice(28) : r));

const squash = (sx: number, sy: number, dx = 0, dy = 0) => ({ torso: { sx, sy, dx: dx * U, dy: dy * U } });

export function slimeClips(hurtBody: import("../../scene-ops").Op[], koBody: import("../../scene-ops").Op[]): Clip[] {
  return [
    { id: "idle", frames: 4, fps: 6, loop: true, keys: [{ at: 0, pose: {} }, { at: 2, pose: squash(0.96, 1.08) }] },
    { id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: squash(1.15, 0.9) }, { at: 2, pose: squash(0.9, 1.15, 2, -6) }, { at: 4, pose: squash(1.2, 0.85, 4, 0) }] },
    { id: "attack", frames: 6, fps: 12, loop: false, keys: [{ at: 0, pose: squash(1.25, 0.8, -3) }, { at: 2, pose: squash(0.75, 1.3, 6) }, { at: 5, pose: {} }] },
    { id: "hurt", frames: 3, fps: 10, loop: false, swaps: { body: hurtBody }, keys: [{ at: 0, pose: squash(1.3, 0.75, -6) }, { at: 2, pose: squash(1.02, 1) }] },
    { id: "ko", frames: 6, fps: 8, loop: false, swaps: { body: koBody }, keys: [{ at: 0, pose: {} }, { at: 5, pose: squash(1.8, 0.45) }] },
  ];
}

export const SLIME32_SPEC: PixelRigSpec = {
  id: "slime",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [20, 32],
  bones: {
    torso: { at: [20, 32], parent: "root" },
    head: { at: [20, 16], parent: "torso" },
    armL: { at: [4, 30], parent: "torso" },
    armR: { at: [36, 30], parent: "torso" },
    legL: { at: [16, 32], parent: "root" },
    legR: { at: [24, 32], parent: "root" },
  },
  parts: [
    { id: "dripL", bone: "armL", z: 0, regions: [[22, 31, 0, 4]] },
    { id: "dripR", bone: "armR", z: 0, regions: [[23, 31, 35, 39]] },
    { id: "body", bone: "torso", z: 1, regions: [[0, 31, 0, 39]] },
  ],
  sockets: { head: { bone: "torso", at: [20, 8] } },
  hitbox: [4, 9, 35, 31],
  hops: true,
  clips: [],
};

const built = buildPixelRig(SLIME32_SPEC);
built.rig.clips = slimeClips(built.swap("body", HURT_BODY), built.swap("body", KO_BODY));

export const slime32 = built;
export const slime32Rig = built.rig;
