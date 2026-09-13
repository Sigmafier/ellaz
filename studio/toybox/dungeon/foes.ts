// The foes: a slime hops at the knight and bites, a bat hovers, flies at him,
// swoops and retreats; a fallen foe drops its coins and fades; ground foes
// keep off each other and off the knight's toes. Every function writes into
// the state it is handed; step.ts clones first. The sketch's slime(), bat(),
// updateEnemy() and separate() are the reference; the orbit is gone (trig),
// so an idle bat hovers where it spawned and an aggroed one flies straight in.

import { floorDiv } from "../sim/fixed";
import { centre, clampInside, clearLine, dist, findPath, moveBy, tileI, tileJ, tileOf } from "./grid";
import { actorOf, alive, hurt } from "./hits";
import { tickKnockback } from "./knight";
import { FACE_LEFT, FACE_RIGHT, KIND_BAT, KIND_SLIME, ST_ATTACK, ST_FLY, ST_GONE, ST_HURT, ST_IDLE, ST_KO, ST_RETREAT, ST_SWOOP, ST_WALK } from "./types";
import type { ActorState, CActor, DungeonData, DungeonState } from "./types";

const HERO = 0;

const clipDone = (ca: CActor, clipIdx: number, t: number): boolean => t >= ca.clips[clipIdx].frames.length * ca.clips[clipIdx].ticksPerFrame;
/** the frame a clip shows at state clock t: a looping clip wraps, a one-shot holds its last frame. Measured 2026-09-13: clamping the walk left both aggroed slimes standing in the walk state for 6,000 ticks, their hop frames never coming round again */
export function frameOf(ca: CActor, clipIdx: number, t: number): number {
  const clip = ca.clips[clipIdx], n = clip.frames.length, k = floorDiv(t, clip.ticksPerFrame);
  return clip.loop ? k - floorDiv(k, n) * n : Math.min(k, n - 1);
}
/** the clip index a foe's state shows: a bat's fly and retreat are its walk, its swoop its attack */
export const clipOfState = (state: number): number => state === ST_KO ? 4 : state === ST_HURT ? 3 : state === ST_ATTACK || state === ST_SWOOP ? 2 : state === ST_WALK || state === ST_FLY || state === ST_RETREAT ? 1 : 0;

function setState(a: ActorState, state: number): void {
  if (a.state === state) return;
  a.state = state; a.stateT = 0;
}

/** a foe faces left or right by the screen-space sign of its motion */
function faceBy(a: ActorState, vx: number, vy: number): void {
  const sx = vx - vy;
  if (sx < 0) a.face = FACE_LEFT; else if (sx > 0) a.face = FACE_RIGHT;
}

/** is the knight close enough to wake this foe, once the room's grace has passed */
function aggroed(s: DungeonState, data: DungeonData, d: number, range: number): boolean {
  return alive(s.actors[HERO]) && d < range && s.tick >= data.rules.aggroStartTicks;
}

// ---- the fall ------------------------------------------------------------------

/** the coins land a little beyond the body, away from the knight, and never inside a prop */
function dropCoins(s: DungeonState, data: DungeonData, i: number, ca: CActor): void {
  const a = s.actors[i], k = s.actors[HERO], rules = data.rules;
  const ax = a.x - k.x, ay = a.y - k.y, al = dist(ax, ay) || 1;
  const drop = { x: a.x, y: a.y };
  moveBy(data.room, drop, floorDiv(ax * rules.dropBeyond, al), floorDiv(ay * rules.dropBeyond, al), rules.dropRadius);
  s.drops.push({ x: drop.x, y: drop.y, value: ca.coins, t: 0 });
}

/** a ko'd foe lies through its clip, drops once, fades, and is gone; a bat sinks to the floor as it goes */
function tickFallen(s: DungeonState, data: DungeonData, i: number, ca: CActor): void {
  const a = s.actors[i];
  if (ca.flying && a.alt > 0) a.alt -= floorDiv(a.alt, ca.bat!.swoopAltDiv) + 1;
  if (a.alt < 0) a.alt = 0;
  if (!clipDone(ca, 4, a.stateT)) return;
  if (a.dropped === 0) { a.dropped = 1; if (ca.coins > 0) dropCoins(s, data, i, ca); }
  const total = ca.clips[4].frames.length * ca.clips[4].ticksPerFrame;
  if (a.stateT >= total + data.rules.fadeTicks) setState(a, ST_GONE);
}

// ---- the slime -------------------------------------------------------------------

/** where a slime walks: straight at the knight when the line is clear, else the next tile of a path re-planned every repathTicks */
function slimeAim(s: DungeonState, data: DungeonData, a: ActorState, ca: CActor): { x: number; y: number } {
  const k = s.actors[HERO], sl = ca.slime!, room = data.room;
  if (clearLine(room, a.x, a.y, k.x, k.y, ca.radius, data.rules.lineStep)) { a.path = []; return { x: k.x, y: k.y }; }
  a.repath -= 1;
  if (a.repath <= 0 || a.path.length === 0) { a.path = findPath(room, a.x, a.y, tileOf(k.x), tileOf(k.y)) ?? []; a.repath = sl.repathTicks; }
  if (a.path.length > 0) {
    const hx = centre(tileI(room.n, a.path[0])), hy = centre(tileJ(room.n, a.path[0]));
    if (dist(hx - a.x, hy - a.y) < ca.radius) a.path.shift();
    if (a.path.length > 0) return { x: centre(tileI(room.n, a.path[0])), y: centre(tileJ(room.n, a.path[0])) };
  }
  return { x: k.x, y: k.y };
}

function tickSlimeAttack(s: DungeonState, data: DungeonData, i: number, ca: CActor, d: number): void {
  const a = s.actors[i], k = s.actors[HERO], sl = ca.slime!, frame = frameOf(ca, 2, a.stateT);
  if (frame >= sl.lungeFrom && frame <= sl.lungeTo && d > sl.lungeStop) {
    const dx = k.x - a.x, dy = k.y - a.y;
    moveBy(data.room, a, floorDiv(dx * sl.lungeSpeed, d), floorDiv(dy * sl.lungeSpeed, d), ca.radius);
  }
  if (a.struck === 0 && frame >= sl.strikeFrame) {
    a.struck = 1;
    if (d < sl.biteReach) { hurt(s, data, i, HERO, sl.dmg, a.x, a.y); a.cd = sl.cooldownTicks; }
  }
  if (clipDone(ca, 2, a.stateT)) { setState(a, ST_IDLE); a.pause = sl.pauseTicks; }
}

function tickSlime(s: DungeonState, data: DungeonData, i: number, ca: CActor): void {
  const a = s.actors[i], k = s.actors[HERO], sl = ca.slime!;
  const d = dist(k.x - a.x, k.y - a.y) || 1;
  if (a.cd > 0) a.cd -= 1;
  if (a.pause > 0) a.pause -= 1;
  const aggro = aggroed(s, data, d, sl.aggro);
  if (a.state === ST_ATTACK) { tickSlimeAttack(s, data, i, ca, d); return; }
  if (aggro && a.pause <= 0 && d < sl.biteAt && a.cd <= 0) { setState(a, ST_ATTACK); a.struck = 0; return; }
  if (aggro && a.pause <= 0 && d >= sl.walkAt) {
    setState(a, ST_WALK);
    const aim = slimeAim(s, data, a, ca);
    const mx = aim.x - a.x, my = aim.y - a.y, md = dist(mx, my) || 1, frame = frameOf(ca, 1, a.stateT);
    if (frame >= sl.hopFrom && frame <= sl.hopTo) moveBy(data.room, a, floorDiv(mx * sl.speed, md), floorDiv(my * sl.speed, md), ca.radius);
    faceBy(a, mx, my);
    return;
  }
  setState(a, ST_IDLE);
}

// ---- the bat ----------------------------------------------------------------------

function tickBatSwoop(s: DungeonState, data: DungeonData, i: number, ca: CActor, d: number): { vx: number; vy: number } {
  const a = s.actors[i], b = ca.bat!;
  const tx = a.aimX - a.x, ty = a.aimY - a.y, td = dist(tx, ty) || 1;
  a.alt += floorDiv(b.swoopAlt - a.alt, b.swoopAltDiv);
  if (d < b.hit && a.cd <= 0) { hurt(s, data, i, HERO, b.dmg, a.x, a.y); a.cd = b.cooldownTicks; setState(a, ST_RETREAT); }
  else if (td < b.stop) setState(a, ST_RETREAT);
  return { vx: floorDiv(tx * b.swoopSpeed, td), vy: floorDiv(ty * b.swoopSpeed, td) };
}

function tickBatRetreat(a: ActorState, ca: CActor, k: ActorState, d: number): { vx: number; vy: number } {
  const b = ca.bat!;
  a.alt += floorDiv(b.retreatAlt - a.alt, b.retreatAltDiv);
  if (a.stateT >= b.retreatTicks) { setState(a, ST_FLY); a.swoopT = b.everyTicks; }
  return { vx: -floorDiv((k.x - a.x) * b.retreatSpeed, d), vy: -floorDiv((k.y - a.y) * b.retreatSpeed, d) };
}

/** hovering: straight at the knight when aggroed, slowing as it closes; a swoop when the timer and the range allow */
function tickBatFly(s: DungeonState, data: DungeonData, a: ActorState, ca: CActor, k: ActorState, d: number): { vx: number; vy: number } {
  const b = ca.bat!;
  setState(a, ST_FLY);
  a.alt += floorDiv(ca.hover - a.alt, b.retreatAltDiv);
  if (!aggroed(s, data, d, b.aggro)) return { vx: 0, vy: 0 };
  const dx = k.x - a.x, dy = k.y - a.y;
  if (a.swoopT <= 0 && d < b.range) {
    setState(a, ST_SWOOP);
    a.aimX = k.x + floorDiv(dx * b.beyond, d); a.aimY = k.y + floorDiv(dy * b.beyond, d);
    return { vx: 0, vy: 0 };
  }
  const sp = Math.min(b.speed, floorDiv(d * b.closeNum, b.closeDen));
  return { vx: floorDiv(dx * sp, d), vy: floorDiv(dy * sp, d) };
}

function tickBat(s: DungeonState, data: DungeonData, i: number, ca: CActor): void {
  const a = s.actors[i], k = s.actors[HERO], b = ca.bat!;
  const d = dist(k.x - a.x, k.y - a.y) || 1;
  if (a.cd > 0) a.cd -= 1;
  if (a.swoopT > 0) a.swoopT -= 1;
  const v = a.state === ST_SWOOP ? tickBatSwoop(s, data, i, ca, d) : a.state === ST_RETREAT ? tickBatRetreat(a, ca, k, d) : tickBatFly(s, data, a, ca, k, d);
  a.x += v.vx; a.y += v.vy;
  clampInside(data.room, a, b.edgePad);
  faceBy(a, v.vx, v.vy);
}

// ---- every foe ---------------------------------------------------------------------

/** one tick of a foe: the throw of a hit, then the fall, the hurt, or its kind's behaviour */
export function tickFoe(s: DungeonState, data: DungeonData, i: number): void {
  const a = s.actors[i], ca = actorOf(data, i);
  if (a.state === ST_GONE) return;
  tickKnockback(data, a, ca);
  a.since += 1;
  if (a.state === ST_KO) { tickFallen(s, data, i, ca); return; }
  if (a.state === ST_HURT) {
    if (clipDone(ca, 3, a.stateT)) { setState(a, ca.kind === KIND_BAT ? ST_FLY : ST_IDLE); a.pause = ca.kind === KIND_BAT ? ca.bat!.hurtPauseTicks : ca.slime!.hurtPauseTicks; }
    return;
  }
  if (ca.kind === KIND_SLIME) tickSlime(s, data, i, ca);
  else if (ca.kind === KIND_BAT) tickBat(s, data, i, ca);
}

/** ground foes push apart, and off the knight's toes */
export function separate(s: DungeonState, data: DungeonData): void {
  const rules = data.rules, k = s.actors[HERO];
  const list: number[] = [];
  for (let i = 1; i < s.actors.length; i++) if (alive(s.actors[i]) && actorOf(data, i).kind === KIND_SLIME) list.push(i);
  for (let x = 0; x < list.length; x++) {
    const p = s.actors[list[x]], cp = actorOf(data, list[x]);
    for (let y = x + 1; y < list.length; y++) {
      const q = s.actors[list[y]], cq = actorOf(data, list[y]);
      const dx = q.x - p.x, dy = q.y - p.y, d = dist(dx, dy);
      if (d <= 0 || d >= rules.sepFoes) continue;
      const push = floorDiv((rules.sepFoes - d) * rules.sepFoesNum, rules.sepFoesDen);
      moveBy(data.room, p, -floorDiv(dx * push, d), -floorDiv(dy * push, d), cp.radius);
      moveBy(data.room, q, floorDiv(dx * push, d), floorDiv(dy * push, d), cq.radius);
    }
    const dx = p.x - k.x, dy = p.y - k.y, d = dist(dx, dy);
    if (d <= 0 || d >= rules.sepHero) continue;
    const push = floorDiv((rules.sepHero - d) * rules.sepHeroNum, rules.sepHeroDen);
    moveBy(data.room, p, floorDiv(dx * push, d), floorDiv(dy * push, d), cp.radius);
  }
}
