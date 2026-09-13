// The turn machine: five phases, and what moves between them. PLAYER waits
// for a pick or a wait; ANIM plays one hero's walk or strike; ENEMY walks
// the cursor over every living foe, each acting out the intent it showed;
// WON and LOST wait for a restart. Every function here writes into the state
// it is handed - step.ts clones first, so nothing outside step.ts may call
// one on a state it means to keep.
//
// The numbers are the rules file's and the units'. The only literals here are
// the phase, act, sub, banner and log CODES from types.ts, which name things
// and tune nothing. The demo (scratchpad ember.js, 2026-09-13) is the
// line-by-line reference; where it slept for seconds, this counts ticks.

import { floorDiv, toFP } from "../sim/fixed";
import { colOf, inGrid, reachable, rowOf, targetsFrom, tileX, tileY, unitAt } from "./grid";
import { planIntents } from "./intent";
import {
  ACT_NONE, ACT_RECOVER, ACT_WALK, ACT_WINDUP,
  BANNER_DEFEAT, BANNER_ENEMY_TURN, BANNER_VICTORY, BANNER_YOUR_TURN,
  CLIP_ATTACK, CLIP_HURT, CLIP_IDLE, CLIP_KO, CLIP_WALK,
  LOG_CLICK_A_HERO, LOG_DEFEAT, LOG_HERO_DONE, LOG_HERO_PICKED, LOG_HIT, LOG_HIT_DOWN, LOG_PICK_ANOTHER, LOG_STRIKE_OR_WAIT, LOG_VICTORY,
  PHASE_ANIM, PHASE_ENEMY, PHASE_LOST, PHASE_PLAYER, PHASE_WON,
  SUB_BETWEEN, SUB_STRIKE, SUB_WAIT, SUB_WALK,
} from "./types";
import type { TurnData, TurnState, UnitState } from "./types";

// ---- the state ---------------------------------------------------------------

export function createState(data: TurnData): TurnState {
  const g = data.grid;
  const units: UnitState[] = data.units.map((u) => ({
    c: u.c, r: u.r, x: tileX(g, u.c), y: tileY(g, u.r), hp: u.hp, acted: 0, moved: 0, face: u.team === 0 ? 1 : -1,
    clip: CLIP_IDLE, clipT: 0, act: ACT_NONE, actT: 0, fromX: 0, fromY: 0, pathIdx: 0, target: -1, strikes: 0, path: [],
  }));
  planIntents(data, units);
  return {
    tick: 0, rng: data.seed >>> 0, phase: PHASE_PLAYER, phaseT: 0, sub: SUB_WAIT, turn: 1, sel: -1, actor: -1, cursor: -1,
    banner: BANNER_YOUR_TURN, bannerT: data.rules.firstBannerTicks,
    log: { kind: LOG_CLICK_A_HERO, a: -1, b: -1, n: 0 },
    units, floats: [], events: [],
  };
}

/** a deep copy with this tick's events emptied: what step() writes into */
export function cloneState(s: TurnState): TurnState {
  return {
    ...s,
    log: { ...s.log },
    units: s.units.map((u) => ({ ...u, path: [...u.path] })),
    floats: s.floats.map((f) => ({ ...f })),
    events: [],
  };
}

const alive = (s: TurnState, i: number): boolean => s.units[i].hp > 0;
const isHero = (data: TurnData, i: number): boolean => data.units[i].team === 0;

/** does any unit of the party (hero true) or of the foes (hero false) still stand */
export function anyAlive(s: TurnState, data: TurnData, hero: boolean): boolean {
  for (let i = 0; i < s.units.length; i++) if (alive(s, i) && isHero(data, i) === hero) return true;
  return false;
}

function setLog(s: TurnState, kind: number, a = -1, b = -1, n = 0): void { s.log = { kind, a, b, n }; }
function setBanner(s: TurnState, banner: number, ticks: number): void { s.banner = banner; s.bannerT = ticks; }
function playClip(u: UnitState, clip: number): void { u.clip = clip; u.clipT = 0; }
function faceToward(u: UnitState, c: number): void { if (c > u.c) u.face = 1; else if (c < u.c) u.face = -1; }

// ---- walking ------------------------------------------------------------------

/** start the next tile of `path`: the unit's tile moves NOW and its feet catch up over walkTicks (the demo's order) */
function beginWalkStep(s: TurnState, data: TurnData, i: number): void {
  const u = s.units[i], g = data.grid;
  const idx = u.path[u.pathIdx];
  const c = colOf(g, idx), r = rowOf(g, idx);
  faceToward(u, c);
  u.fromX = u.x; u.fromY = u.y;
  u.c = c; u.r = r;
  u.act = ACT_WALK; u.actT = data.rules.walkTicks;
  if (u.clip !== CLIP_WALK) playClip(u, CLIP_WALK);
}

export function beginWalk(s: TurnState, data: TurnData, i: number, path: number[]): void {
  const u = s.units[i];
  u.path = path; u.pathIdx = 0;
  beginWalkStep(s, data, i);
}

/** one tick of a walk; true once the last tile is reached and the feet stand exactly on it */
function tickWalk(s: TurnState, data: TurnData, i: number): boolean {
  const u = s.units[i], g = data.grid, W = data.rules.walkTicks;
  u.actT -= 1;
  const k = W - u.actT;
  const tx = tileX(g, u.c), ty = tileY(g, u.r);
  u.x = u.fromX + floorDiv((tx - u.fromX) * k, W);
  u.y = u.fromY + floorDiv((ty - u.fromY) * k, W);
  if (u.actT > 0) return false;
  u.x = tx; u.y = ty;
  u.pathIdx += 1;
  if (u.pathIdx < u.path.length) { beginWalkStep(s, data, i); return false; }
  u.act = ACT_NONE; u.path = []; u.pathIdx = 0;
  playClip(u, CLIP_IDLE);
  return true;
}

// ---- striking -----------------------------------------------------------------

export function beginStrike(s: TurnState, data: TurnData, a: number, d: number): void {
  const u = s.units[a];
  u.target = d;
  faceToward(u, s.units[d].c);
  playClip(u, CLIP_ATTACK);
  u.act = ACT_WINDUP; u.actT = data.rules.strikeWindupTicks;
}

/** the damage lands: hp floors at 0, a float rises from the target, the target plays hurt or ko, the log and the events say so */
function landHit(s: TurnState, data: TurnData, a: number): void {
  const u = s.units[a], d = s.units[u.target], du = data.units[u.target], atk = data.units[a].atk;
  d.hp = d.hp > atk ? d.hp - atk : 0;
  s.floats.push({ x: d.x, y: d.y - toFP(du.tall + du.hover), value: atk, t: data.rules.floatTicks });
  playClip(d, d.hp <= 0 ? CLIP_KO : CLIP_HURT);
  setLog(s, d.hp <= 0 ? LOG_HIT_DOWN : LOG_HIT, a, u.target, atk);
  s.events.push({ kind: "hit", attacker: a, target: u.target, x: d.x, z: d.y, h: toFP(floorDiv(du.tall, 2) + du.hover), damage: atk, effect: "none" });
  if (d.hp <= 0) s.events.push({ kind: "ko", target: u.target });
}

/** one tick of a strike: the windup ends in the hit, the recover ends in both parties settling; true when settled */
function tickStrike(s: TurnState, data: TurnData, a: number): boolean {
  const u = s.units[a];
  u.actT -= 1;
  if (u.actT > 0) return false;
  if (u.act === ACT_WINDUP) {
    landHit(s, data, a);
    u.act = ACT_RECOVER; u.actT = data.rules.strikeRecoverTicks;
    return false;
  }
  u.act = ACT_NONE;
  if (u.hp > 0) playClip(u, CLIP_IDLE);
  const d = s.units[u.target];
  if (d.hp > 0) playClip(d, CLIP_IDLE);
  return true;
}

/** tick whatever the actor is doing; true when it is done */
export function tickActor(s: TurnState, data: TurnData): boolean {
  const u = s.units[s.actor];
  return u.act === ACT_WALK ? tickWalk(s, data, s.actor) : tickStrike(s, data, s.actor);
}

// ---- the end -------------------------------------------------------------------

/** VICTORY when no foe stands, DEFEAT when no hero; true when the battle is over */
export function outcome(s: TurnState, data: TurnData): boolean {
  if (!anyAlive(s, data, false)) {
    s.phase = PHASE_WON; s.sel = -1; s.actor = -1;
    setBanner(s, BANNER_VICTORY, 0); setLog(s, LOG_VICTORY);
    s.events.push({ kind: "phase", phase: PHASE_WON });
    return true;
  }
  if (!anyAlive(s, data, true)) {
    s.phase = PHASE_LOST; s.sel = -1; s.actor = -1;
    setBanner(s, BANNER_DEFEAT, 0); setLog(s, LOG_DEFEAT);
    s.events.push({ kind: "phase", phase: PHASE_LOST });
    return true;
  }
  return false;
}

// ---- the player's turn ---------------------------------------------------------

function startEnemyPhase(s: TurnState, data: TurnData): void {
  s.phase = PHASE_ENEMY; s.sel = -1; s.actor = -1; s.cursor = -1;
  s.sub = SUB_WAIT; s.phaseT = data.rules.enemyBannerTicks;
  setBanner(s, BANNER_ENEMY_TURN, data.rules.turnBannerTicks);
  s.events.push({ kind: "phase", phase: PHASE_ENEMY });
}

function maybeEndTurn(s: TurnState, data: TurnData): void {
  for (let i = 0; i < s.units.length; i++) if (isHero(data, i) && alive(s, i) && !s.units[i].acted) return;
  startEnemyPhase(s, data);
}

function heroMove(s: TurnState, data: TurnData, u: number, path: number[]): void {
  s.phase = PHASE_ANIM; s.sub = SUB_WALK; s.actor = u;
  beginWalk(s, data, u, path);
}

function heroStrike(s: TurnState, data: TurnData, u: number, d: number): void {
  s.phase = PHASE_ANIM; s.sub = SUB_STRIKE; s.actor = u;
  beginStrike(s, data, u, d);
}

/** a click on tile (c, r) during the player's phase */
export function handlePick(s: TurnState, data: TurnData, c: number, r: number): void {
  if (!inGrid(data.grid, c, r)) return;
  const u = unitAt(s.units, c, r);
  if (s.sel >= 0) {
    const sel = s.sel, su = s.units[sel];
    if (u >= 0 && !isHero(data, u) && targetsFrom(data, s.units, sel, su.c, su.r).includes(u)) { heroStrike(s, data, sel, u); return; }
    if (!su.moved) {
      const tile = reachable(data, s.units, sel, null).find((t) => t.c === c && t.r === r && t.path.length > 0);
      if (tile) { heroMove(s, data, sel, tile.path); return; }
    }
  }
  if (u >= 0 && isHero(data, u) && !s.units[u].acted) { s.sel = u; setLog(s, LOG_HERO_PICKED, u); return; }
  if (u < 0) s.sel = -1;
}

/** Space: a moved hero waits where it stands; otherwise the whole party is done and the enemies act */
export function handleWait(s: TurnState, data: TurnData): void {
  if (s.sel >= 0 && s.units[s.sel].moved) {
    const u = s.units[s.sel];
    u.acted = 1; u.moved = 0; s.sel = -1;
    setLog(s, LOG_PICK_ANOTHER);
    maybeEndTurn(s, data);
    return;
  }
  for (let i = 0; i < s.units.length; i++) if (isHero(data, i) && alive(s, i)) { s.units[i].acted = 1; s.units[i].moved = 0; }
  startEnemyPhase(s, data);
}

/** the hero's walk or strike has played out: replan the foes, then hand control back or end the turn */
export function afterHeroAction(s: TurnState, data: TurnData): void {
  const u = s.actor, hero = s.units[u];
  s.actor = -1;
  if (s.sub === SUB_WALK) {
    planIntents(data, s.units);
    s.phase = PHASE_PLAYER; s.sel = u; hero.moved = 1;
    if (targetsFrom(data, s.units, u, hero.c, hero.r).length > 0) { setLog(s, LOG_STRIKE_OR_WAIT, u); return; }
    hero.acted = 1; s.sel = -1;
    setLog(s, LOG_HERO_DONE, u);
    maybeEndTurn(s, data);
    return;
  }
  hero.acted = 1; hero.moved = 0; hero.target = -1; s.sel = -1;
  planIntents(data, s.units);
  if (outcome(s, data)) return;
  s.phase = PHASE_PLAYER;
  setLog(s, LOG_PICK_ANOTHER);
  maybeEndTurn(s, data);
}

// ---- the enemies' turn ---------------------------------------------------------

function endEnemyTurn(s: TurnState, data: TurnData): void {
  s.turn += 1;
  for (let i = 0; i < s.units.length; i++) if (alive(s, i)) { s.units[i].acted = 0; s.units[i].moved = 0; }
  planIntents(data, s.units);
  s.phase = PHASE_PLAYER; s.sub = SUB_WAIT; s.cursor = -1; s.actor = -1;
  setBanner(s, BANNER_YOUR_TURN, data.rules.turnBannerTicks);
  setLog(s, LOG_CLICK_A_HERO);
  s.events.push({ kind: "turn", turn: s.turn }, { kind: "phase", phase: PHASE_PLAYER });
}

/** the walk is done (or there was none): strike if the plan said so and the target still stands, else the between-pause */
function enemyStrikeCheck(s: TurnState, data: TurnData, i: number): void {
  const u = s.units[i];
  if (u.strikes && u.target >= 0 && alive(s, u.target)) { s.sub = SUB_STRIKE; beginStrike(s, data, i, u.target); return; }
  s.actor = -1; s.sub = SUB_BETWEEN; s.phaseT = data.rules.betweenTicks;
}

/** the cursor moves to the next living foe with a plan; none left ends the enemies' turn */
function nextEnemy(s: TurnState, data: TurnData): void {
  for (let i = s.cursor + 1; i < s.units.length; i++) {
    if (isHero(data, i) || !alive(s, i) || s.units[i].target < 0) continue;
    s.cursor = i; s.actor = i;
    if (s.units[i].path.length > 0) { s.sub = SUB_WALK; beginWalk(s, data, i, s.units[i].path); return; }
    enemyStrikeCheck(s, data, i);
    return;
  }
  endEnemyTurn(s, data);
}

export function tickEnemyPhase(s: TurnState, data: TurnData): void {
  if (s.sub === SUB_WAIT || s.sub === SUB_BETWEEN) {
    s.phaseT -= 1;
    if (s.phaseT <= 0) nextEnemy(s, data);
    return;
  }
  if (s.sub === SUB_WALK) {
    if (tickActor(s, data)) enemyStrikeCheck(s, data, s.actor);
    return;
  }
  if (tickActor(s, data)) {
    s.actor = -1;
    if (outcome(s, data)) return;
    s.sub = SUB_BETWEEN; s.phaseT = data.rules.betweenTicks;
  }
}

// ---- what every tick does regardless of phase ------------------------------------

/** clips advance (a finished one-shot returns an idle, standing unit to idle; a ko holds its last frame), floats fall due, the banner fades */
export function tickCosmetics(s: TurnState, data: TurnData): void {
  for (let i = 0; i < s.units.length; i++) {
    const u = s.units[i], cl = data.units[i].clips[u.clip];
    const total = cl.frames.length * cl.ticksPerFrame;
    u.clipT += 1;
    if (cl.loop) { if (u.clipT >= total) u.clipT = 0; }
    else if (u.clipT >= total) {
      if (u.hp > 0 && u.act === ACT_NONE && u.clip !== CLIP_IDLE) playClip(u, CLIP_IDLE);
      else u.clipT = total - 1;
    }
  }
  for (const f of s.floats) f.t -= 1;
  s.floats = s.floats.filter((f) => f.t > 0);
  if (s.bannerT > 0) s.bannerT -= 1;
}
