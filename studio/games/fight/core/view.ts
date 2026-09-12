// The draw plan: what a cell draws this frame, computed from two sim states
// and the interpolation fraction the loop hands over. Pure, never hashed,
// and the ONLY place that turns FP world units into screen pixels. A cell
// draws exactly what is here; it never reads FightState itself.
//
// Screen space: x is world x; the floor line is world z (the 2.5D band, y
// grows downward); a fighter's feet sit at (x, z - h). Draw order is by z,
// far (small z) first.

import { dormant } from "./fighter";
import { floorDiv, toPx } from "./fixed";
import { frameIndexAt } from "./moves";
import type { CFighter, FightData, FightState } from "./types";

export interface SpriteOp { set: string; frame: string; x: number; y: number; flip: boolean; depth: number; who: number }
export interface ShadowOp { x: number; y: number; w: number; h: number; depth: number }
export interface BoxOp { kind: "bdy" | "itr" | "push"; x: number; y: number; w: number; h: number; who: number }
export interface HudModel { hp: number[]; maxHp: number[]; names: string[]; phase: number; winner: number; tick: number }
/** `camX` is the camera's left edge in world px, lerped like a fighter; 0 when the mode has no camera */
export interface DrawPlan { sprites: SpriteOp[]; shadows: ShadowOp[]; boxes: BoxOp[]; hud: HudModel; shake: number; camX: number }

/** blend two FP values by alpha256 in [0, 256]; exact at both ends */
export function lerp256(a: number, b: number, alpha256: number): number {
  return a + floorDiv((b - a) * alpha256, 256);
}

function frameNameOf(cf: CFighter, st: number, frame: number): string {
  const names = cf.states[st].frameNames;
  return names[Math.min(frame, names.length - 1)];
}

function boxesOf(cf: CFighter, st: number, stT: number, x: number, y: number, face: 1 | -1, who: number): BoxOp[] {
  const state = cf.states[st];
  const idx = Math.min(state.frames.length - 1, Math.max(0, frameIndexAt(state, stT)));
  const fr = state.frames[idx];
  const place = (kind: BoxOp["kind"], b: { x: number; y: number; w: number; h: number }): BoxOp => {
    const bx = face === 1 ? b.x : -(b.x + b.w);
    return { kind, x: x + toPx(bx), y: y + toPx(b.y), w: toPx(b.w), h: toPx(b.h), who };
  };
  return [...fr.bdy.map((b) => place("bdy", b)), ...fr.itr.map((h) => place("itr", h.box)), ...(fr.push ? [place("push", fr.push)] : [])];
}

export function viewOf(prev: FightState, next: FightState, alpha256: number, data: FightData, withBoxes = false): DrawPlan {
  const sprites: SpriteOp[] = [], shadows: ShadowOp[] = [], boxes: BoxOp[] = [];
  next.fighters.forEach((f, i) => {
    if (dormant(f)) return;
    const p = prev.fighters[i] ?? f;
    const cf = data.fighters[data.cast[i].fighter];
    const same = p.st === f.st;
    const x = toPx(same ? lerp256(p.x, f.x, alpha256) : f.x);
    const z = toPx(same ? lerp256(p.z, f.z, alpha256) : f.z);
    const h = toPx(same ? lerp256(p.h, f.h, alpha256) : f.h);
    const y = z - h;
    sprites.push({ set: cf.set, frame: frameNameOf(cf, f.st, f.frame), x, y, flip: f.face === -1, depth: z, who: i });
    const shrink = Math.max(8, 24 - floorDiv(h, 4));
    shadows.push({ x, y: z, w: shrink * 2, h: floorDiv(shrink, 2), depth: z - 1 });
    if (withBoxes) boxes.push(...boxesOf(cf, f.st, f.stT, x, y, f.face, i));
  });
  sprites.sort((a, b) => a.depth - b.depth);
  shadows.sort((a, b) => a.depth - b.depth);
  const hud: HudModel = {
    hp: next.fighters.map((f) => Math.max(0, f.hp)),
    maxHp: next.fighters.map((_, i) => data.fighters[data.cast[i].fighter].hp),
    names: next.fighters.map((_, i) => data.fighters[data.cast[i].fighter].id),
    phase: next.phase,
    winner: next.winner,
    tick: next.tick,
  };
  const camX = next.stage ? toPx(lerp256(prev.stage ? prev.stage.camX : next.stage.camX, next.stage.camX, alpha256)) : 0;
  return { sprites, shadows, boxes, hud, shake: next.shake, camX };
}
