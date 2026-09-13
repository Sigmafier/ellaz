// The turn state as a DrawPlan: the same shape the fight's view emits, so the
// same two cells draw it. Sprites are the units at their interpolated feet;
// shadows sit under them; the grid, the selection, the reach, the targets,
// the intent chevrons and the strike box are flat rects in `props`, laid
// under the sprites; everything with words in it goes in `hud.turn` for the
// cells' shared layout. Nothing here is hashed, so nothing here moves a golden.
//
// The literals below are the demo's drawing constants (2026-09-13): the tile
// slab's inset and height, the chevron's size, the colours. They tune what the
// board looks like, never how it plays.

import { floorDiv, toPx } from "../sim/fixed";
import { lerp256 } from "../sim/view";
import type { DrawPlan, HudModel, RectProp, ShadowOp, SpriteOp, TurnHud } from "../sim/view";
import { colOf, inGrid, reachable, rowOf, targetsFrom, tileX, tileY } from "./grid";
import { BANNER_NONE, PHASE_ANIM, PHASE_LOST, PHASE_PLAYER, PHASE_WON } from "./types";
import type { TurnData, TurnState } from "./types";

const pxF = (v: number): number => v / 256;

/** a tile slab: inset from the tile's edges, lifted off the feet line, with a 2 px rim */
const SLAB_INSET = 6, SLAB_LIFT = 30, SLAB_H = 34, SLAB_RIM = 2;
const GRID_FILL = "rgba(255,255,255,0.12)", GRID_RIM = "rgba(26,18,48,0.28)";
const MOVE_FILL = "rgba(74,140,255,0.45)", MOVE_RIM = "#2b5cff";
const TARGET_FILL = "rgba(255,77,94,0.5)", TARGET_RIM = "#c2185b";
const SEL_FILL = "rgba(255,201,60,0.5)", SEL_RIM = "#ffd23f";
const INTENT = "#ff4d5e", STRIKE = "#ffd23f", INK = "#1a1230";
const BOX_FILL = "rgba(255,77,94,0.35)", BOX_EDGE = 3;
/** a chevron head: a stepped wedge this many px long, growing this many px wider per step, drawn this far above the feet line */
const CHEVRON_STEPS = 6, CHEVRON_STEP = 2, CHEVRON_GROW = 3, CHEVRON_LIFT = 14;
const SHADOW_W = 60, SHADOW_H = 16, SHADOW_FLY_W = 40, SHADOW_FLY_H = 10;

function slab(data: TurnData, c: number, r: number, fill: string, rim: string, depth: number): RectProp[] {
  const g = data.grid;
  const x = toPx(tileX(g, c)) - toPx(floorDiv(g.tileW, 2)) + SLAB_INSET, y = toPx(tileY(g, r)) - SLAB_LIFT;
  const w = toPx(g.tileW) - SLAB_INSET * 2;
  return [
    { kind: "rect", x, y, w, h: SLAB_H, color: rim, depth },
    { kind: "rect", x: x + SLAB_RIM, y: y + SLAB_RIM, w: w - SLAB_RIM * 2, h: SLAB_H - SLAB_RIM * 2, color: fill, depth },
  ];
}

/** a wedge pointing (dx, dy) with its tip at (x, y): an ink outline one step larger under a coloured one */
function chevron(x: number, y: number, dx: number, dy: number, color: string, depth: number): RectProp[] {
  const out: RectProp[] = [];
  for (const [col, extra] of [[INK, 1], [color, 0]] as const) {
    for (let i = 0; i < CHEVRON_STEPS; i++) {
      const along = i * CHEVRON_STEP, half = i * CHEVRON_GROW + 1 + extra;
      // the tip leads: step i sits `along` px behind the tip, `half` px each side of the line
      const cx = x - dx * along, cy = y - dy * along, w = CHEVRON_STEP + extra;
      if (dx !== 0) out.push({ kind: "rect", x: dx > 0 ? cx - w : cx, y: cy - half, w, h: half * 2, color: col, depth });
      else out.push({ kind: "rect", x: cx - half, y: dy > 0 ? cy - w : cy, w: half * 2, h: w, color: col, depth });
    }
  }
  return out;
}

const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** a foe's plan on the board: red heads along its path, a yellow head and a box on the hero it will strike */
function intentProps(data: TurnData, s: TurnState, e: number, depth: number): RectProp[] {
  const g = data.grid, u = s.units[e], out: RectProp[] = [];
  if (u.target < 0) return out;
  let pc = u.c, pr = u.r;
  for (const idx of u.path) {
    const c = colOf(g, idx), r = rowOf(g, idx), dx = sign(c - pc), dy = sign(r - pr);
    out.push(...chevron(toPx(floorDiv(tileX(g, pc) + tileX(g, c), 2)), toPx(floorDiv(tileY(g, pr) + tileY(g, r), 2)) - CHEVRON_LIFT, dx, dy, INTENT, depth));
    pc = c; pr = r;
  }
  if (!u.strikes) return out;
  const t = s.units[u.target], tx = toPx(tileX(g, t.c)), ty = toPx(tileY(g, t.r));
  out.push(...chevron(toPx(floorDiv(tileX(g, pc) + tileX(g, t.c), 2)), toPx(floorDiv(tileY(g, pr) + tileY(g, t.r), 2)) - CHEVRON_LIFT, sign(t.c - pc), sign(t.r - pr), STRIKE, depth));
  const half = toPx(floorDiv(g.tileW, 2)), x = tx - half + 4, w = toPx(g.tileW) - 8, y = ty - SLAB_LIFT - 2, h = SLAB_H + 4;
  out.push({ kind: "rect", x, y, w, h, color: BOX_FILL, depth });
  out.push({ kind: "rect", x, y, w, h: BOX_EDGE, color: INTENT, depth }, { kind: "rect", x, y: y + h - BOX_EDGE, w, h: BOX_EDGE, color: INTENT, depth });
  out.push({ kind: "rect", x, y, w: BOX_EDGE, h, color: INTENT, depth }, { kind: "rect", x: x + w - BOX_EDGE, y, w: BOX_EDGE, h, color: INTENT, depth });
  return out;
}

/** the board: every tile's slab, then the selected hero's reach, targets and own tile, then every foe's intent */
function boardProps(data: TurnData, s: TurnState): RectProp[] {
  const g = data.grid, out: RectProp[] = [];
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (inGrid(g, c, r)) out.push(...slab(data, c, r, GRID_FILL, GRID_RIM, 0));
  if (s.sel >= 0 && s.phase === PHASE_PLAYER) {
    const u = s.units[s.sel];
    if (!u.moved) for (const t of reachable(data, s.units, s.sel, null)) if (t.path.length) out.push(...slab(data, t.c, t.r, MOVE_FILL, MOVE_RIM, 1));
    for (const o of targetsFrom(data, s.units, s.sel, u.c, u.r)) out.push(...slab(data, s.units[o].c, s.units[o].r, TARGET_FILL, TARGET_RIM, 1));
    out.push(...slab(data, u.c, u.r, SEL_FILL, SEL_RIM, 1));
  }
  if (s.phase === PHASE_PLAYER || s.phase === PHASE_ANIM) {
    for (let e = 0; e < s.units.length; e++) if (data.units[e].team !== 0 && s.units[e].hp > 0) out.push(...intentProps(data, s, e, 2));
  }
  return out;
}

function turnHud(data: TurnData, s: TurnState, feet: { x: number; y: number }[]): TurnHud {
  const g = data.grid;
  const party = data.units.map((cu, i) => ({ cu, u: s.units[i], i })).filter(({ cu }) => cu.team === 0).map(({ cu, u, i }) => ({
    name: cu.name, hp: u.hp, maxHp: cu.hp, acted: u.acted === 1, active: s.sel === i, dead: u.hp <= 0,
  }));
  const bars = s.units.map((u, i) => ({ u, i })).filter(({ u }) => u.hp > 0).map(({ u, i }) => ({
    x: feet[i].x, y: feet[i].y, tall: data.units[i].tall, hp: u.hp, maxHp: data.units[i].hp, team: data.units[i].team,
  }));
  const rise = (t: number): number => floorDiv((data.rules.floatTicks - t) * data.rules.floatRise, data.rules.floatTicks);
  const floats = s.floats.map((f) => ({ x: toPx(f.x), y: toPx(f.y) - rise(f.t), value: f.value }));
  const showIntents = s.phase === PHASE_PLAYER || s.phase === PHASE_ANIM;
  const strikeLabels = showIntents ? s.units.flatMap((u, i) => {
    if (data.units[i].team === 0 || u.hp <= 0 || !u.strikes || u.target < 0) return [];
    const t = s.units[u.target];
    return [{ x: toPx(tileX(g, t.c)) + toPx(floorDiv(g.tileW, 2)), y: toPx(tileY(g, t.r)), tall: data.units[u.target].tall + data.units[u.target].hover, atk: data.units[i].atk }];
  }) : [];
  const banner = s.banner !== BANNER_NONE && (s.bannerT > 0 || s.phase >= PHASE_WON) ? s.banner : BANNER_NONE;
  return { turn: s.turn, phase: s.phase, banner, bannerT: s.bannerT, log: { ...s.log }, names: data.units.map((u) => u.name), party, bars, floats, strikeLabels, showEndTurn: s.phase === PHASE_PLAYER };
}

export function viewTurn(prev: TurnState, next: TurnState, alpha256: number, data: TurnData, withBoxes = false): DrawPlan {
  void withBoxes;
  const sprites: SpriteOp[] = [], shadows: ShadowOp[] = [], feet: { x: number; y: number }[] = [];
  next.units.forEach((u, i) => {
    const p = prev.units[i] ?? u, cu = data.units[i];
    const fx = lerp256(p.x, u.x, alpha256), fy = lerp256(p.y, u.y, alpha256);
    const x = pxF(fx), z = pxF(fy), y = z - cu.hover;
    const cl = cu.clips[u.clip];
    const frame = cl.frames[Math.min(floorDiv(u.clipT, cl.ticksPerFrame), cl.frames.length - 1)];
    const zi = toPx(fy);
    sprites.push({ set: cu.set, frame, x, y, flip: u.face === -1, depth: zi, who: i });
    shadows.push({ x, y: z, w: cu.flying ? SHADOW_FLY_W : SHADOW_W, h: cu.flying ? SHADOW_FLY_H : SHADOW_H, depth: zi - 1 });
    feet.push({ x, y });
  });
  sprites.sort((a, b) => a.depth - b.depth);
  shadows.sort((a, b) => a.depth - b.depth);
  const props = boardProps(data, next);
  const hud: HudModel = {
    hp: next.units.map((u) => u.hp),
    maxHp: data.units.map((u) => u.hp),
    names: data.units.map((u) => u.name),
    phase: next.phase,
    winner: next.phase === PHASE_WON ? 0 : next.phase === PHASE_LOST ? 1 : -1,
    tick: next.tick,
    stage: null,
    turn: turnHud(data, next, feet),
  };
  return { sprites, shadows, props, boxes: [], hud, shake: 0, camX: 0 };
}

/** the tile under a view-px point, the way the demo read a click: columns by floor, rows by the nearest feet line */
export function tileAtPx(data: TurnData, x: number, y: number): { c: number; r: number } {
  const g = data.grid;
  const c = Math.floor((x - toPx(g.x)) / toPx(g.tileW));
  const r = Math.round((y - toPx(g.y) + 10) / toPx(g.tileH));
  return { c, r };
}
