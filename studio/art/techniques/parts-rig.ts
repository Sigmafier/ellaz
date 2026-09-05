// Parts rig: parts drawn once, bones keyframed, frames baked. The default
// for heroes, because a new clip is a few keyframes rather than a redraw.

import { bakePose, poseAt } from "../rig/rig";
import { robotRig } from "../characters/robot/rig";
import type { Technique } from "./types";

export const partsRig: Technique = {
  id: "parts-rig",
  name: "Parts rig (paper-doll bones)",
  input: "parts in bone-local space + keyframed poses",
  costPerAnimation: "two to four keyframes; frames are baked",
  summary: "Draw every part once, hang it on a bone tree, and describe a clip as a handful of keyframed poses. Baking interpolates the rest. The robot and knight are rigged this way; a new clip is minutes, and the pivot cannot drift because it is the root. Rigid parts cannot squash, so blobs and cloth want another technique.",
  sample: () => bakePose(robotRig, poseAt(robotRig.clips[0], 1)),
};
