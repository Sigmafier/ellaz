// The slime has no bones. Every frame is a hand-authored op list - the
// "shape DSL per frame" technique - because a blob squashes and stretches
// in ways a rig of rigid parts cannot. Same clip ids, same frame grammar.

import { C, E, type Op } from "../../scene-ops";
import { frameName } from "../../rig/rig";
import type { BakedClip, ClipId, Frame } from "../../rig/types";
import { SLIME_COLOURS as k } from "./static";

/**
 * One slime pose. `sq` is squash (1 = rest; >1 wider and shorter), `lean`
 * shifts the top, `lift` raises the whole blob (a hop), `eyes` scales the
 * eyes, `mouth` is the mouth height. Feet (the base) stay at y = 0 unless lifted.
 */
function blob(sq = 1, lean = 0, lift = 0, eyes = 1, mouth = 2, drips = true): Op[] {
  const w = 26 * sq, h = 20 / sq;
  const cy = -h - lift, top = -2 * h - lift;
  const o: Op[] = [];
  o.push(E(0, cy, w, h, k.body));
  o.push(E(-2 + lean, cy - 4 / sq, w * 0.85, h * 0.85, k.bodyLight));
  o.push(E(-8 + lean, top + 14 / sq, 6, 3, k.shine));
  o.push(C(-8 + lean, cy - 2, 3 * eyes, k.eye), C(8 + lean, cy - 2, 3 * eyes, k.eye));
  if (mouth > 0) o.push(E(lean, cy + 7 / sq, 5, mouth, k.mouth));
  if (drips) o.push(E(-30 * sq, -4, 5, 4, k.bodyLight), E(30 * sq, -3, 4, 3, k.bodyLight));
  return o;
}

function clip(id: ClipId, fps: number, loop: boolean, poses: Op[][]): BakedClip {
  const frames: Frame[] = poses.map((ops, i) => ({ name: frameName("slime", id, i), clip: id, index: i, ops, pivot: { x: 0, y: 0 }, sockets: { head: { x: 0, y: -40 } } }));
  return { id, fps, loop, frames };
}

export function slimeClips(): BakedClip[] {
  return [
    clip("idle", 6, true, [blob(1), blob(1.06), blob(1.1), blob(1.06)]),
    clip("walk", 10, true, [blob(1.15, 0, 0), blob(0.9, 2, 6), blob(0.8, 4, 12), blob(0.9, 4, 6), blob(1.2, 2, 0), blob(1.05, 0, 0)]),
    clip("attack", 12, false, [blob(1.25, -3, 0, 0.8, 1), blob(0.75, 6, 4, 1.3, 4), blob(0.7, 10, 6, 1.4, 5), blob(0.9, 6, 2, 1.2, 4), blob(1.1, 2, 0, 1, 2), blob(1)]),
    clip("hurt", 10, false, [blob(1.3, -6, 0, 1.4, 0), blob(1.15, -3, 0, 1.2, 1), blob(1.02, -1, 0, 1, 2)]),
    clip("ko", 8, false, [blob(1.1, 0, 0, 1, 2), blob(1.3, 0, 0, 0.8, 1), blob(1.6, 0, 0, 0.6, 0), blob(1.9, 0, 0, 0.4, 0, false), blob(2.2, 0, 0, 0.3, 0, false), blob(2.4, 0, 0, 0.3, 0, false)]),
  ];
}
