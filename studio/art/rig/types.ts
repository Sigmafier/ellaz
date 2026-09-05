// The parts rig: a paper-doll. Bones form a tree; parts are op lists drawn in
// their bone's local space; a pose bends the bones; a clip is keyframed poses
// baked to frames. All in BODY UNITS: the pivot (bottom-centre of the feet)
// is (0, 0), y grows downward, so a 64-tall character's head is at y = -64.
//
// Pure data. Nothing here draws.

import type { Op } from "../scene-ops";

export interface Bone {
  id: string;
  parent: string | null;
  /** rest position of this bone's pivot, relative to the parent's pivot (body units for the root) */
  x: number;
  y: number;
}

export interface Part {
  id: string;
  bone: string;
  /** ops in bone-local space: (0,0) is the bone's pivot */
  ops: Op[];
  /** draw order, low first */
  z: number;
}

/** A change to one bone: rotation (radians), translation, scale. All optional, all rest = identity. */
export interface BoneDelta {
  rot?: number;
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
}
export type Pose = Record<string, BoneDelta>;

export type ClipId = "idle" | "walk" | "attack" | "hurt" | "ko";
export const CLIP_IDS: readonly ClipId[] = ["idle", "walk", "attack", "hurt", "ko"];

export interface Keyframe {
  /** frame index this pose is reached at, 0-based */
  at: number;
  pose: Pose;
}

export interface Clip {
  id: ClipId;
  /** total frames baked */
  frames: number;
  fps: number;
  loop: boolean;
  keys: Keyframe[];
  /** part ids swapped in for this clip only (hurt face, ko eyes) */
  swaps?: Record<string, Op[]>;
}

export interface Socket {
  bone: string;
  x: number;
  y: number;
}

export interface Rig {
  id: string;
  bones: Bone[];
  parts: Part[];
  /** named attachment points in bone-local space */
  sockets: Record<string, Socket>;
  /** body-space hitbox at rest: [x, y, w, h] */
  hitbox: [number, number, number, number];
  clips: Clip[];
}

/** One baked frame: world-space ops (pivot at 0,0), plus everything an atlas needs to know. */
export interface Frame {
  name: string;
  clip: ClipId;
  index: number;
  ops: Op[];
  /** always (0, 0) in body space - kept explicit so an export cannot forget it */
  pivot: { x: number; y: number };
  sockets: Record<string, { x: number; y: number }>;
}

export interface BakedClip {
  id: ClipId;
  fps: number;
  loop: boolean;
  frames: Frame[];
}
