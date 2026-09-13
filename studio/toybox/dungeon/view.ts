// The dungeon state as a DrawPlan: the same shape the fight's view emits, so
// the same two cells draw it. Sprites are the actors at their interpolated
// feet, projected from FP tile units to the iso screen; shadows sit under
// them; the coins on the floor are the fight's coin prop; the click markers
// and the open door's glow are flat rects; everything with words in it goes
// in `hud.dungeon` for the cells' shared layout. Nothing here is hashed, so
// nothing here moves a golden.
//
// The room's picture and its props are NOT here: the sim never opens `art`.
// The cell kind (cells/kinds/dungeon.ts) draws the room frame in the arena
// pass and merges the props into the sprite list, depth-sorted with these.
//
// The literals below are drawing constants (the sketch's, 2026-09-11): the
// shadows' sizes, the marker's diamond, the colours. They tune what the room
// looks like, never how it plays.

import { floorDiv, toPx } from "../sim/fixed";
import { lerp256 } from "../sim/view";
import type { BossHud, DrawPlan, DungeonHud, HudModel, PropOp, RectProp, ShadowOp, SpriteOp } from "../sim/view";
import { clipOfState } from "./foes";
import { tileI, tileJ } from "./grid";
import { alive } from "./hits";
import { knightClip } from "./knight";
import { FACE_LEFT, KIND_KNIGHT, PHASE_DOOR, PHASE_LOST, PHASE_WON, ST_FLY, ST_GONE, TILE } from "./types";
import type { ActorState, CActor, DungeonData, DungeonState } from "./types";

const SHADOW_KNIGHT_W = 32, SHADOW_KNIGHT_H = 12, SHADOW_SLIME_W = 60, SHADOW_SLIME_H = 16;
/** a flier's shadow shrinks with its height: half-width max(6, 14 - alt * 12 / 100), height 8 */
const SHADOW_FLY_RX = 14, SHADOW_FLY_MIN_RX = 6, SHADOW_FLY_SHRINK_NUM = 12, SHADOW_FLY_SHRINK_DEN = 100, SHADOW_FLY_H = 8;
/** a bat draws a little in front of what shares its ground */
const FLY_DEPTH_LIFT = floorDiv(TILE * 3, 10);
const SPIN_TICKS = 6, SPIN_PHASES = 6;
/** the click marker: a 2:1 diamond outline of 2 px rows, shrinking as it fades; the door's glow the same diamond, held */
const MARKER_HALF_H = 12, MARKER_SHRINK = 5, MARKER_ROW = 2, MARKER_INK = "#1a1230", MARKER_GOLD = "#ffc93c", MARKER_CORE = "#fff4c0";
const DOOR_GLOW = "#ffd23f", DOOR_GLOW_INK = "#7a1a50";

/** world FP -> screen px keeping the fraction; the cell rounds to its grid */
export function toScreen(room: DungeonData["room"], x: number, y: number): { x: number; y: number } {
  return { x: room.ox + ((x - y) * room.tileW) / (2 * TILE), y: room.oy + ((x + y) * room.tileH) / (2 * TILE) };
}

/** screen px -> world FP, floored: the inverse the pointer needs */
export function worldAtPx(data: DungeonData, px: number, py: number): { x: number; y: number } {
  const r = data.room;
  // a = (px - ox) / (tileW / 2) tiles, b = (py - oy) / (tileH / 2) tiles; x = (a + b) / 2, y = (b - a) / 2, all scaled by TILE
  const a = floorDiv((px - r.ox) * 2 * TILE, r.tileW), b = floorDiv((py - r.oy) * 2 * TILE, r.tileH);
  return { x: floorDiv(a + b, 2), y: floorDiv(b - a, 2) };
}

/** a flier bobs as a triangle wave over bobTicks, +-bobPx around its hover */
function bobOf(ca: CActor, a: ActorState, tick: number): number {
  if (!ca.flying || a.state !== ST_FLY || ca.bobTicks <= 1) return 0;
  const half = floorDiv(ca.bobTicks, 2), phase = tick - floorDiv(tick, ca.bobTicks) * ca.bobTicks;
  const tri = phase < half ? phase / half : (ca.bobTicks - phase) / half;
  return (tri * 2 - 1) * ca.bobPx;
}

/** the frame to show and the set it lives in: the side set for every foe and for a knight facing left, right or fallen; a knight's facings set for down and up. Measured on the built page 2026-09-13: a set picked by the frame NAME's prefix asked the facings set for "knight_walk_0000" (frames are named after the character, sets after the export), and Phaser warned on every frame */
function frameOf(ca: CActor, a: ActorState): { frame: string; flip: boolean; set: string } {
  const clip = ca.kind === KIND_KNIGHT ? knightClip(ca, a) : { ...ca.clips[clipOfState(a.state)], side: true };
  const n = clip.frames.length, k = floorDiv(a.stateT, clip.ticksPerFrame);
  const idx = clip.loop ? k - floorDiv(k, n) * n : Math.min(k, n - 1);
  return { frame: clip.frames[idx], flip: clip.side && a.face === FACE_LEFT, set: clip.side || ca.facings === null ? ca.set : ca.facings };
}

function shadowOf(ca: CActor, x: number, y: number, altPx: number, depth: number): ShadowOp {
  if (ca.flying) {
    const rx = Math.max(SHADOW_FLY_MIN_RX, SHADOW_FLY_RX - floorDiv(altPx * SHADOW_FLY_SHRINK_NUM, SHADOW_FLY_SHRINK_DEN));
    return { x, y, w: rx * 2, h: SHADOW_FLY_H, depth };
  }
  return ca.kind === KIND_KNIGHT ? { x, y, w: SHADOW_KNIGHT_W, h: SHADOW_KNIGHT_H, depth } : { x, y, w: SHADOW_SLIME_W, h: SHADOW_SLIME_H, depth };
}

/** the 2:1 diamond outline around a tile's screen centre: an ink pass one row under a coloured one */
function diamond(cx: number, cy: number, halfH: number, ink: string, color: string, depth: number): RectProp[] {
  const out: RectProp[] = [];
  const sx = Math.round(cx / 2) * 2, sy = Math.round(cy / 2) * 2;
  for (const [col, off] of [[ink, MARKER_ROW], [color, 0]] as const) {
    for (let r = -halfH; r < halfH; r += MARKER_ROW) {
      const w = (halfH - Math.abs(r + 1)) * 2;
      out.push({ kind: "rect", x: sx - w - MARKER_ROW, y: sy + r + off, w: MARKER_ROW * 2, h: MARKER_ROW, color: col, depth });
      out.push({ kind: "rect", x: sx + w - MARKER_ROW, y: sy + r + off, w: MARKER_ROW * 2, h: MARKER_ROW, color: col, depth });
    }
  }
  return out;
}

/** the coins, the click markers and, once the door is open, its glow: all under the sprites */
function floorProps(data: DungeonData, next: DungeonState): PropOp[] {
  const out: PropOp[] = [];
  const room = data.room, rules = data.rules;
  for (const d of next.drops) {
    const p = toScreen(room, d.x, d.y);
    out.push({ kind: "coin", x: p.x, y: p.y, spin: floorDiv(d.t, SPIN_TICKS) % SPIN_PHASES, depth: d.x + d.y });
  }
  for (const m of next.markers) {
    const c = toScreen(room, m.i * TILE + floorDiv(TILE, 2), m.j * TILE + floorDiv(TILE, 2));
    const halfH = MARKER_HALF_H - floorDiv((rules.markerTicks - m.t) * MARKER_SHRINK, rules.markerTicks);
    out.push(...diamond(c.x, c.y, halfH, MARKER_INK, MARKER_GOLD, -1));
    out.push({ kind: "rect", x: Math.round(c.x / 2) * 2 - MARKER_ROW, y: Math.round(c.y / 2) * 2 - MARKER_ROW, w: MARKER_ROW * 2, h: MARKER_ROW * 2, color: MARKER_CORE, depth: -1 });
  }
  if (next.phase >= PHASE_DOOR && next.phase !== PHASE_LOST) {
    for (const t of room.door) {
      const c = toScreen(room, tileI(room.n, t) * TILE + floorDiv(TILE, 2), tileJ(room.n, t) * TILE + floorDiv(TILE, 2));
      out.push(...diamond(c.x, c.y, MARKER_HALF_H, DOOR_GLOW_INK, DOOR_GLOW, -1));
    }
  }
  return out;
}

function dungeonHud(data: DungeonData, s: DungeonState, feet: { x: number; y: number }[]): DungeonHud {
  const k = s.actors[0], ck = data.actors[data.cast[0].actor];
  const bars = s.actors.map((a, i) => ({ a, i })).filter(({ a, i }) => i > 0 && alive(a) && a.hp < data.actors[data.cast[i].actor].hp).map(({ a, i }) => ({
    x: feet[i].x, y: feet[i].y, bar: data.actors[data.cast[i].actor].bar, hp: a.hp, maxHp: data.actors[data.cast[i].actor].hp,
  }));
  const rise = (t: number): number => floorDiv((data.rules.floatTicks - t) * data.rules.floatRise, data.rules.floatTicks);
  const floats = s.floats.map((f) => { const p = toScreen(data.room, f.x, f.y); return { x: p.x, y: p.y - f.z - rise(f.t), value: f.value }; });
  return { hp: k.hp, maxHp: ck.hp, mp: k.mp, maxMp: ck.knight ? ck.knight.mp : 0, coins: s.coins, phase: s.phase, banner: s.banner, bannerT: s.bannerT, bars, floats };
}

/** the first boss standing as the HUD's boss bar; nothing when there is none */
function dungeonBoss(data: DungeonData, next: DungeonState): { boss?: BossHud } {
  const i = next.actors.findIndex((a, j) => data.actors[data.cast[j].actor].boss && alive(a));
  if (i < 0) return {};
  const ca = data.actors[data.cast[i].actor];
  return { boss: { name: ca.id.replace(/-/g, " ").toUpperCase(), hp: next.actors[i].hp, maxHp: ca.hp } };
}

export function viewDungeon(prev: DungeonState, next: DungeonState, alpha256: number, data: DungeonData, withBoxes = false): DrawPlan {
  void withBoxes;
  const sprites: SpriteOp[] = [], shadows: ShadowOp[] = [], feet: { x: number; y: number }[] = [];
  next.actors.forEach((a, i) => {
    const ca = data.actors[data.cast[i].actor];
    if (a.state === ST_GONE) { feet.push({ x: 0, y: 0 }); return; }
    const p = prev.actors[i] ?? a;
    // interpolate only across a tick the actor spent in one state: a restart or a ko snaps
    const same = p.state === a.state;
    const fx = same ? lerp256(p.x, a.x, alpha256) : a.x, fy = same ? lerp256(p.y, a.y, alpha256) : a.y;
    const falt = same ? lerp256(p.alt, a.alt, alpha256) : a.alt;
    const sp = toScreen(data.room, fx, fy);
    const altPx = falt / TILE + bobOf(ca, a, next.tick);
    const depth = fx + fy + (ca.flying ? FLY_DEPTH_LIFT : 0);
    const { frame, flip, set } = frameOf(ca, a);
    sprites.push({ set, frame, x: sp.x, y: sp.y - altPx, flip, depth, who: i, ...(ca.size > 1 ? { size: ca.size } : {}) });
    shadows.push(shadowOf(ca, sp.x, sp.y, toPx(falt), depth - 1));
    feet.push({ x: sp.x, y: sp.y - altPx });
  });
  sprites.sort((a, b) => a.depth - b.depth);
  shadows.sort((a, b) => a.depth - b.depth);
  const props = floorProps(data, next);
  props.sort((a, b) => a.depth - b.depth);
  const hud: HudModel = {
    hp: next.actors.map((a) => Math.max(0, a.hp)),
    maxHp: next.actors.map((_, i) => data.actors[data.cast[i].actor].hp),
    names: next.actors.map((_, i) => data.actors[data.cast[i].actor].id),
    phase: next.phase,
    winner: next.phase === PHASE_WON ? 0 : next.phase === PHASE_LOST ? 1 : -1,
    tick: next.tick,
    stage: null,
    turn: null,
    dungeon: dungeonHud(data, next, feet),
    ...dungeonBoss(data, next),
  };
  return { sprites, shadows, props, boxes: [], hud, shake: 0, camX: 0 };
}
