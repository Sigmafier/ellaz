// The knight: what a click, a held direction and a swing do, how he follows a
// path or a target, when he regains hp and mp. Every function writes into the
// state it is handed; step.ts clones first. The sketch's Knight.update and
// handleClick are the reference; the numbers are the actor file's and the
// rules file's.

import { floorDiv } from "../sim/fixed";
import { centre, clampInside, clearLine, dist, findPath, isBlocked, moveBy, pull, tileI, tileJ, tileOf } from "./grid";
import { actorOf, alive, strike } from "./hits";
import { ACT_INPUT_CLICK, ACT_INPUT_SWING, FACE_DOWN, FACE_LEFT, FACE_RIGHT, FACE_UP, ST_ATTACK, ST_IDLE, ST_KO, ST_WALK, TILE } from "./types";
import type { ActorState, CActor, DungeonData, DungeonInput, DungeonState } from "./types";

/** sqrt 2 as 181/256: a diagonal held walk covers the same ground per tick as a straight one */
const DIAG_NUM = 181, DIAG_DEN = 256;

/** screen-space facing from a world-space direction: mostly vertical on screen reads as up or down */
export function facingOf(dx: number, dy: number, prev: number, num: number, den: number): number {
  const sdx = dx - dy, sdy = dx + dy;
  if (sdx === 0 && sdy === 0) return prev;
  const asdx = sdx < 0 ? -sdx : sdx, asdy = sdy < 0 ? -sdy : sdy;
  // |sdy / 2| > |sdx| * num / den  <=>  |sdy| * den > 2 * |sdx| * num
  if (asdy * den > 2 * asdx * num) return sdy > 0 ? FACE_DOWN : FACE_UP;
  return sdx > 0 ? FACE_RIGHT : FACE_LEFT;
}

/** the clip the knight is showing: the facings set for down and up, the side set for left, right and the ko */
export function knightClip(ca: CActor, a: ActorState): { frames: readonly string[]; ticksPerFrame: number; loop: boolean; side: boolean } {
  const sideView = ca.faceClips === null || a.state === ST_KO || a.face === FACE_LEFT || a.face === FACE_RIGHT;
  if (sideView) return { ...ca.clips[a.state === ST_KO ? 4 : a.state === ST_ATTACK ? 2 : a.state === ST_WALK ? 1 : 0], side: true };
  const base = a.state === ST_ATTACK ? 4 : a.state === ST_WALK ? 2 : 0;
  return { ...ca.faceClips![base + (a.face === FACE_UP ? 1 : 0)], side: false };
}

const clipDone = (clip: { frames: readonly string[]; ticksPerFrame: number }, t: number): boolean => t >= clip.frames.length * clip.ticksPerFrame;

/** the nearest live foe within `seek` of the knight, or -1 */
export function nearestFoe(s: DungeonState, k: number, seek: number): number {
  let best = -1, bestD = seek;
  for (let i = 0; i < s.actors.length; i++) {
    if (i === k || !alive(s.actors[i])) continue;
    const d = dist(s.actors[i].x - s.actors[k].x, s.actors[i].y - s.actors[k].y);
    if (d < bestD) { best = i; bestD = d; }
  }
  return best;
}

function startAttack(a: ActorState, ca: CActor): void {
  a.state = ST_ATTACK; a.stateT = 0; a.struck = 0;
  a.mp = a.mp > ca.knight!.mpCost ? a.mp - ca.knight!.mpCost : 0;
  a.path = []; a.target = -1; a.goalX = -1; a.goalY = -1;
}

/** Space: the nearest foe in reach is faced and swung at; none, the swing goes where the knight looks */
function handleSwing(s: DungeonState, data: DungeonData, k: number): void {
  const a = s.actors[k], ca = actorOf(data, k);
  const near = nearestFoe(s, k, data.rules.swingSeek);
  if (near >= 0) a.face = facingOf(s.actors[near].x - a.x, s.actors[near].y - a.y, a.face, data.rules.facingNum, data.rules.facingDen);
  startAttack(a, ca);
}

/** a flier's ground point on screen sits `hover` px up, which is hover / tileH tiles back along both axes */
export function groundOf(e: ActorState, room: { tileH: number }): { x: number; y: number } {
  const back = floorDiv(e.alt, room.tileH);
  return { x: e.x - back, y: e.y - back };
}

/** the live foe whose ground point is nearest the click within clickRadius, or -1 */
function foeAtClick(s: DungeonState, data: DungeonData, k: number, x: number, y: number): number {
  let best = -1, bestD = data.rules.clickRadius;
  for (let i = 0; i < s.actors.length; i++) {
    if (i === k || !alive(s.actors[i])) continue;
    const g = groundOf(s.actors[i], data.room);
    const d = dist(g.x - x, g.y - y);
    if (d < bestD) { best = i; bestD = d; }
  }
  return best;
}

/** a click: a foe to target, else a coin to walk to, else a tile to walk to (a gold marker says which) */
export function handleClick(s: DungeonState, data: DungeonData, k: number, x: number, y: number): void {
  const a = s.actors[k], ca = actorOf(data, k), room = data.room, rules = data.rules;
  const foe = foeAtClick(s, data, k, x, y);
  if (foe >= 0) { a.target = foe; a.path = []; a.repath = 0; a.goalX = -1; a.goalY = -1; return; }
  const loot = s.drops.find((d) => dist(d.x - x, d.y - y) < rules.clickRadius);
  const gx = loot ? loot.x : x, gy = loot ? loot.y : y;
  const i = tileOf(gx), j = tileOf(gy);
  if (isBlocked(room, i, j)) return;
  const path = findPath(room, a.x, a.y, i, j);
  if (!path) return;
  pull(room, a, path, ca.radius, rules.lineStep);
  a.target = -1; a.path = path;
  a.goalX = loot ? loot.x : -1; a.goalY = loot ? loot.y : -1;
  s.markers.push({ i, j, t: rules.markerTicks });
}

/** one step toward (tx, ty) at `speed`, snapping when within a step; true when arrived */
function stepToward(room: DungeonData["room"], a: ActorState, ca: CActor, tx: number, ty: number, speed: number): boolean {
  const dx = tx - a.x, dy = ty - a.y, d = dist(dx, dy);
  if (d <= speed) { moveBy(room, a, dx, dy, ca.radius); return true; }
  moveBy(room, a, floorDiv(dx * speed, d), floorDiv(dy * speed, d), ca.radius);
  return false;
}

/** follow the path, then the goal past it; the state is a walk while there is somewhere to go */
function follow(s: DungeonState, data: DungeonData, k: number): void {
  const a = s.actors[k], ca = actorOf(data, k), room = data.room, rules = data.rules;
  if (a.path.length > 0) {
    const head = a.path[0], tx = centre(tileI(room.n, head)), ty = centre(tileJ(room.n, head));
    a.face = facingOf(tx - a.x, ty - a.y, a.face, rules.facingNum, rules.facingDen);
    a.state = ST_WALK;
    if (stepToward(room, a, ca, tx, ty, ca.speed)) { a.path.shift(); pull(room, a, a.path, ca.radius, rules.lineStep); }
    return;
  }
  if (a.goalX >= 0) {
    a.face = facingOf(a.goalX - a.x, a.goalY - a.y, a.face, rules.facingNum, rules.facingDen);
    a.state = ST_WALK;
    if (stepToward(room, a, ca, a.goalX, a.goalY, ca.speed)) { a.goalX = -1; a.goalY = -1; }
    return;
  }
  a.state = ST_IDLE;
}

/** the targeted foe: struck when close, else walked to along a path re-planned every repathTicks */
function chase(s: DungeonState, data: DungeonData, k: number): void {
  const a = s.actors[k], ca = actorOf(data, k), e = s.actors[a.target], rules = data.rules, kr = ca.knight!;
  if (!alive(e)) { a.target = -1; a.path = []; a.state = ST_IDLE; return; }
  const d = dist(e.x - a.x, e.y - a.y);
  if (d < kr.approach) {
    a.face = facingOf(e.x - a.x, e.y - a.y, a.face, rules.facingNum, rules.facingDen);
    startAttack(a, ca);
    return;
  }
  a.repath -= 1;
  if (a.repath <= 0 || a.path.length === 0) {
    const path = findPath(data.room, a.x, a.y, tileOf(e.x), tileOf(e.y));
    a.path = path ?? [];
    pull(data.room, a, a.path, ca.radius, rules.lineStep);
    a.repath = kr.repathTicks;
  }
  if (a.path.length === 0 && clearLine(data.room, a.x, a.y, e.x, e.y, ca.radius, rules.lineStep)) { a.goalX = e.x; a.goalY = e.y; }
  follow(s, data, k);
}

/** a held direction in world axes: a diagonal is scaled so the ground covered per tick is the same */
function walkHeld(s: DungeonState, data: DungeonData, k: number, dx: number, dy: number): void {
  const a = s.actors[k], ca = actorOf(data, k);
  a.path = []; a.target = -1; a.goalX = -1; a.goalY = -1;
  const speed = dx !== 0 && dy !== 0 ? floorDiv(ca.speed * DIAG_NUM, DIAG_DEN) : ca.speed;
  moveBy(data.room, a, dx * speed, dy * speed, ca.radius);
  a.face = facingOf(dx, dy, a.face, data.rules.facingNum, data.rules.facingDen);
  a.state = ST_WALK;
}

/** mp every mpRegenEvery ticks; hp every hpRegenEvery once hpRegenAfter ticks have passed unhurt */
function regen(s: DungeonState, a: ActorState, ca: CActor): void {
  const kr = ca.knight!;
  if (s.tick - floorDiv(s.tick, kr.mpRegenEvery) * kr.mpRegenEvery === 0) a.mp = Math.min(kr.mp, a.mp + kr.mpRegenAmount);
  if (a.since >= kr.hpRegenAfter && s.tick - floorDiv(s.tick, kr.hpRegenEvery) * kr.hpRegenEvery === 0) a.hp = Math.min(ca.hp, a.hp + kr.hpRegenAmount);
}

/** the knockback velocity decays toward zero from either side, and moves the body: a walker against the walls and props, a flier over the props and up to the walls */
export function tickKnockback(data: DungeonData, a: ActorState, ca: CActor): void {
  if (ca.flying) { a.x += a.vx; a.y += a.vy; clampInside(data.room, a, ca.bat ? ca.bat.edgePad : 0); }
  else moveBy(data.room, a, a.vx, a.vy, ca.radius);
  // `0 - x`, never `-x`: a decayed 0 must be +0 (the hash is indifferent, a test's Object.is is not)
  const decay = (v: number): number => (v < 0 ? 0 - floorDiv(-v * ca.knockNum, ca.knockDen) : floorDiv(v * ca.knockNum, ca.knockDen));
  a.vx = decay(a.vx); a.vy = decay(a.vy);
}

/** one tick of the knight: the swing lands on the clip's middle frame; a swing, a click and held keys in that order; else the chase, the path, or idle */
export function tickKnight(s: DungeonState, data: DungeonData, k: number, input: DungeonInput): void {
  const a = s.actors[k], ca = actorOf(data, k);
  if (!alive(a)) return;
  tickKnockback(data, a, ca);
  a.since += 1;
  regen(s, a, ca);
  if (a.state === ST_ATTACK) {
    const clip = knightClip(ca, a);
    if (a.struck === 0 && floorDiv(a.stateT, clip.ticksPerFrame) >= floorDiv(clip.frames.length, 2)) { a.struck = 1; strike(s, data, k); }
    if (clipDone(clip, a.stateT)) { a.state = ST_IDLE; a.stateT = 0; }
    return;
  }
  if (input.act === ACT_INPUT_SWING) { handleSwing(s, data, k); return; }
  if (input.act === ACT_INPUT_CLICK) handleClick(s, data, k, input.x, input.y);
  if (input.dx !== 0 || input.dy !== 0) { walkHeld(s, data, k, input.dx, input.dy); return; }
  if (a.target >= 0) { chase(s, data, k); return; }
  follow(s, data, k);
}

/** the tile the knight stands on, as an index */
export const knightTile = (data: DungeonData, a: ActorState): number => tileOf(a.x) * data.room.n + tileOf(a.y);

export { TILE };
