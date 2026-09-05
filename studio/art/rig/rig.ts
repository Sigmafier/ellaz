// Posing and baking. worldMatrices() walks the bone tree; poseAt()
// interpolates keyframes; bakeClip() turns a clip into frames whose ops are
// in body space with the pivot at (0, 0) on every frame - the one property
// an engine relies on when it swaps clips.

import type { Op } from "../scene-ops";
import { IDENTITY, apply, multiply, rotate, scale, translate, transformOp, type Mat } from "./transform";
import type { BakedClip, BoneDelta, Clip, Frame, Pose, Rig } from "./types";

/** Every reason a rig is malformed; empty = valid. */
export function validateRig(rig: Rig): string[] {
  const out: string[] = [];
  const ids = new Set(rig.bones.map((b) => b.id));
  if (ids.size !== rig.bones.length) out.push(`${rig.id}: duplicate bone ids`);
  const roots = rig.bones.filter((b) => b.parent === null);
  if (roots.length !== 1) out.push(`${rig.id}: ${roots.length} root bones, need exactly 1`);
  for (const b of rig.bones) if (b.parent !== null && !ids.has(b.parent)) out.push(`${rig.id}: bone ${b.id} parent ${b.parent} does not exist`);
  for (const p of rig.parts) if (!ids.has(p.bone)) out.push(`${rig.id}: part ${p.id} on unknown bone ${p.bone}`);
  for (const [name, s] of Object.entries(rig.sockets)) if (!ids.has(s.bone)) out.push(`${rig.id}: socket ${name} on unknown bone ${s.bone}`);
  for (const c of rig.clips) {
    if (c.frames < 1) out.push(`${rig.id}/${c.id}: no frames`);
    for (const k of c.keys) {
      if (k.at < 0 || k.at >= c.frames) out.push(`${rig.id}/${c.id}: keyframe at ${k.at} outside 0..${c.frames - 1}`);
      for (const bone of Object.keys(k.pose)) if (!ids.has(bone)) out.push(`${rig.id}/${c.id}: pose names unknown bone ${bone}`);
    }
    for (const part of Object.keys(c.swaps ?? {})) if (!rig.parts.some((p) => p.id === part)) out.push(`${rig.id}/${c.id}: swap names unknown part ${part}`);
  }
  return out;
}

function local(delta: BoneDelta | undefined, bx: number, by: number): Mat {
  const d = delta ?? {};
  // to parent: translate to rest position + delta, rotate, scale
  let m = translate(bx + (d.dx ?? 0), by + (d.dy ?? 0));
  if (d.rot) m = multiply(m, rotate(d.rot));
  if (d.sx !== undefined || d.sy !== undefined) m = multiply(m, scale(d.sx ?? 1, d.sy ?? 1));
  return m;
}

/** World (body-space) matrix for every bone under `pose`. */
export function worldMatrices(rig: Rig, pose: Pose): Record<string, Mat> {
  const byId = new Map(rig.bones.map((b) => [b.id, b]));
  const out: Record<string, Mat> = {};
  const resolve = (id: string): Mat => {
    if (out[id]) return out[id];
    const b = byId.get(id)!;
    const parent = b.parent === null ? IDENTITY : resolve(b.parent);
    out[id] = multiply(parent, local(pose[id], b.x, b.y));
    return out[id];
  };
  for (const b of rig.bones) resolve(b.id);
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const bone of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const da = a[bone] ?? {}, db = b[bone] ?? {};
    out[bone] = {
      rot: lerp(da.rot ?? 0, db.rot ?? 0, t),
      dx: lerp(da.dx ?? 0, db.dx ?? 0, t),
      dy: lerp(da.dy ?? 0, db.dy ?? 0, t),
      sx: lerp(da.sx ?? 1, db.sx ?? 1, t),
      sy: lerp(da.sy ?? 1, db.sy ?? 1, t),
    };
  }
  return out;
}

/** The pose at frame `i`: linear between the surrounding keyframes; a looping clip wraps to its first key. */
export function poseAt(clip: Clip, i: number): Pose {
  const keys = [...clip.keys].sort((p, q) => p.at - q.at);
  if (keys.length === 0) return {};
  const before = [...keys].reverse().find((k) => k.at <= i) ?? keys[0];
  let after = keys.find((k) => k.at > i);
  let span: number;
  if (!after) {
    if (!clip.loop || keys.length < 2) return before.pose;
    after = keys[0];
    span = clip.frames - before.at + after.at;
  } else {
    span = after.at - before.at;
  }
  if (span === 0) return before.pose;
  return interpolatePose(before.pose, after.pose, (i - before.at) / span);
}

/** Bake one pose to body-space ops, parts in z order, with clip swaps applied. */
export function bakePose(rig: Rig, pose: Pose, swaps: Record<string, Op[]> = {}): Op[] {
  const mats = worldMatrices(rig, pose);
  return [...rig.parts]
    .sort((a, b) => a.z - b.z)
    .flatMap((p) => (swaps[p.id] ?? p.ops).map((op) => transformOp(op, mats[p.bone])));
}

export const frameName = (character: string, clip: string, i: number): string => `${character}_${clip}_${String(i).padStart(4, "0")}`;

export function bakeClip(rig: Rig, clip: Clip): BakedClip {
  const frames: Frame[] = [];
  for (let i = 0; i < clip.frames; i++) {
    const pose = poseAt(clip, i);
    const mats = worldMatrices(rig, pose);
    const sockets: Frame["sockets"] = {};
    for (const [name, s] of Object.entries(rig.sockets)) {
      const [x, y] = apply(mats[s.bone], s.x, s.y);
      sockets[name] = { x, y };
    }
    frames.push({ name: frameName(rig.id, clip.id, i), clip: clip.id, index: i, ops: bakePose(rig, pose, clip.swaps), pivot: { x: 0, y: 0 }, sockets });
  }
  return { id: clip.id, fps: clip.fps, loop: clip.loop, frames };
}

export const bakeAll = (rig: Rig): BakedClip[] => rig.clips.map((c) => bakeClip(rig, c));
