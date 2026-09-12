// The draw plan: what a cell draws this frame, computed from two sim states
// and the interpolation fraction the loop hands over. Pure, never hashed,
// and the ONLY place that turns FP world units into screen pixels. A cell
// draws exactly what is here; it never reads FightState itself.
//
// Screen space: x is world x; the floor line is world z (the 2.5D band, y
// grows downward); a fighter's feet sit at (x, z - h). Draw order is by z,
// far (small z) first.
//
// A sprite's, shadow's and coin's x/y CARRY THE FRACTION of a game px (FP / 256
// as a float): the cell rounds to its own grid, which is 1/k px on a canvas
// drawn at k times the view. Flooring here threw the interpolation away below
// one game px - on a 120 Hz display a fighter at 64 px/s moves 0.53 px a frame,
// so every second frame drew where the last one did (measured 2026-09-12,
// distinct draws 88.5% at an emulated 120 Hz against 93.6% at 60). Boxes and
// depths stay whole px.

import { dormant } from "./fighter";
import { floorDiv, toPx } from "./fixed";
import { frameIndexAt } from "./moves";
import { xpToNext } from "./pickups";
import { heroIndex, heroMaxHp } from "./stage";
import { FP } from "./types";
import type { CFighter, FightData, FightState, PickupState } from "./types";

/** FP -> game px keeping the fraction; a cell rounds to its grid */
const pxF = (v: number): number => v / FP;

export interface SpriteOp { set: string; frame: string; x: number; y: number; flip: boolean; depth: number; who: number }
export interface ShadowOp { x: number; y: number; w: number; h: number; depth: number }
export interface BoxOp { kind: "bdy" | "itr" | "push"; x: number; y: number; w: number; h: number; who: number }
/** a coin on the floor or in the air: screen px at its centre-bottom, and which of six spin widths it shows */
export interface PropOp { kind: "coin"; x: number; y: number; spin: number; depth: number }
/** what a stage HUD shows; `hero` is the roster row the hp bar belongs to */
export interface StageHud { wave: number; waves: number; wphase: number; waveT: number; coins: number; xp: number; xpNeed: number; level: number; hero: number }
export interface HudModel { hp: number[]; maxHp: number[]; names: string[]; phase: number; winner: number; tick: number; stage: StageHud | null }
/** `camX` is the camera's left edge in world px, lerped like a fighter; 0 when the mode has no camera */
export interface DrawPlan { sprites: SpriteOp[]; shadows: ShadowOp[]; props: PropOp[]; boxes: BoxOp[]; hud: HudModel; shake: number; camX: number }

/** the coin's six spin widths cycle ten times a second: one phase per six ticks */
const SPIN_TICKS = 6;
const SPIN_PHASES = 6;

function propOf(p: PickupState, prev: PickupState | undefined, alpha256: number): PropOp {
  const q = prev ?? p;
  const fz = lerp256(q.z, p.z, alpha256);
  const x = pxF(lerp256(q.x, p.x, alpha256));
  const z = pxF(fz);
  const h = pxF(lerp256(q.h, p.h, alpha256));
  return { kind: "coin", x, y: z - h, spin: floorDiv(p.age, SPIN_TICKS) % SPIN_PHASES, depth: toPx(fz) };
}

function stageHud(next: FightState, data: FightData): StageHud | null {
  if (!next.stage || !data.stage) return null;
  const s = next.stage;
  return { wave: s.wave, waves: data.stage.waves, wphase: s.wphase, waveT: s.waveT, coins: s.coins, xp: s.xp, xpNeed: xpToNext(data.stage, s.level), level: s.level, hero: heroIndex(data) };
}

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
    const fx = same ? lerp256(p.x, f.x, alpha256) : f.x;
    const fz = same ? lerp256(p.z, f.z, alpha256) : f.z;
    const fh = same ? lerp256(p.h, f.h, alpha256) : f.h;
    const x = pxF(fx), z = pxF(fz), h = pxF(fh);
    const y = z - h;
    const zi = toPx(fz), hi = toPx(fh);
    sprites.push({ set: cf.set, frame: frameNameOf(cf, f.st, f.frame), x, y, flip: f.face === -1, depth: zi, who: i });
    const shrink = Math.max(8, 24 - floorDiv(hi, 4));
    shadows.push({ x, y: z, w: shrink * 2, h: floorDiv(shrink, 2), depth: zi - 1 });
    if (withBoxes) boxes.push(...boxesOf(cf, f.st, f.stT, toPx(fx), zi - hi, f.face, i));
  });
  sprites.sort((a, b) => a.depth - b.depth);
  shadows.sort((a, b) => a.depth - b.depth);
  // a coin's previous position is the same index of the previous tick's list when nothing was
  // collected in between; a collected coin shifts the rest, and those draw at their new spot for one frame
  const sameCoins = prev.pickups.length === next.pickups.length;
  const props = next.pickups.map((p, i) => propOf(p, sameCoins ? prev.pickups[i] : undefined, alpha256));
  props.sort((a, b) => a.depth - b.depth);
  const stage = stageHud(next, data);
  const hud: HudModel = {
    hp: next.fighters.map((f) => Math.max(0, f.hp)),
    maxHp: next.fighters.map((_, i) => (stage && i === stage.hero ? heroMaxHp(data, next.stage!.level) : data.fighters[data.cast[i].fighter].hp)),
    names: next.fighters.map((_, i) => data.fighters[data.cast[i].fighter].id),
    phase: next.phase,
    winner: next.winner,
    tick: next.tick,
    stage,
  };
  const camX = next.stage ? toPx(lerp256(prev.stage ? prev.stage.camX : next.stage.camX, next.stage.camX, alpha256)) : 0;
  return { sprites, shadows, props, boxes, hud, shake: next.shake, camX };
}
