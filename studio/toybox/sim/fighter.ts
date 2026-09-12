// One fighter's tick: read its input, walk the state graph the moves file
// describes, apply frame-entry impulses, gravity and friction, and keep it
// inside the arena. Pure: takes a FighterState, returns a new one plus the
// events it raised. Hits between fighters are hits.ts; this file never reads
// another fighter.
//
// Order inside a tick: timers -> (floor / stun / transitions + walk) -> move
// -> advance the clip clock -> fire the impulse of any frame just entered.
// The impulse lands on the velocity that the NEXT tick's move reads.

import { canCancel, frameAt, frameIndexAt, stateDone } from "./moves";
import { clamp, floorDiv } from "./fixed";
import type { CArena, CFighter, CMatch, FighterState, FightEvent, InputFrame } from "./types";

export interface FighterTick { f: FighterState; events: FightEvent[] }

/** a wave spawn not yet due (active 0) or a corpse that has gone (active 3): it takes no input, lands no hit, pushes nobody and is not drawn. The ONE predicate every site reads */
export function dormant(f: FighterState): boolean {
  return f.active === 0 || f.active === 3;
}

function enterState(f: FighterState, st: number): FighterState {
  return { ...f, st, stT: 0, frame: 0, hitMask: 0 };
}

/**
 * input -> a transition, or -1. Only stand/walk take movement; attack re-enters
 * from cancelFrom, and never while `cool` is running - the recovery window
 * match.attackCooldownTicks opens after every attack START.
 */
function transition(f: FighterState, cf: CFighter, input: InputFrame): number {
  const st = cf.states[f.st];
  const moving = input.mx !== 0 || input.mz !== 0;
  if (input.attack && f.cool === 0 && st.onAttack >= 0 && (f.st !== st.onAttack || canCancel(st, f.frame))) return st.onAttack;
  if (moving && st.onMove >= 0) return st.onMove;
  if (!moving && st.onStop >= 0) return st.onStop;
  return -1;
}

/** take the transition; an attack start also arms the cooldown */
function applyTransition(f: FighterState, cf: CFighter, match: CMatch, to: number): FighterState {
  const started = enterState(f, to);
  return to === cf.states[f.st].onAttack ? { ...started, cool: match.attackCooldownTicks } : started;
}

/** only the state that can `stop` (walk) takes its velocity from the stick */
function walkVelocity(f: FighterState, cf: CFighter, input: InputFrame): FighterState {
  if (cf.states[f.st].onStop < 0) return f;
  const face = input.mx !== 0 ? input.mx : f.face;
  return { ...f, vx: input.mx * cf.speed, vz: input.mz * cf.zSpeed, face };
}

/** the impulse of the frame now showing, when it was entered on this tick */
function fireImpulse(f: FighterState, cf: CFighter, prevSt: number, prevFrame: number): FighterState {
  if (f.st === prevSt && f.frame === prevFrame) return f;
  const fr = frameAt(cf, f.st, f.stT);
  if (fr.impulseX === 0 && fr.impulseY === 0) return f;
  return { ...f, vx: f.vx + fr.impulseX * f.face, vh: f.vh - fr.impulseY };
}

/** a flying fighter that is alive holds its hover height: no gravity, no landing, and a knock's lift is shed */
function moveFlying(f: FighterState, cf: CFighter, arena: CArena, match: CMatch): FighterState {
  const vx = floorDiv(f.vx * (match.friction - 1), match.friction);
  return { ...f, x: clamp(f.x + f.vx, arena.xMin, arena.xMax), z: clamp(f.z + f.vz, arena.zMin, arena.zMax), h: cf.hover, vx, vz: 0, vh: 0 };
}

function move(f: FighterState, cf: CFighter, arena: CArena, match: CMatch, events: FightEvent[], who: number): FighterState {
  if (cf.flying && f.hp > 0) return moveFlying(f, cf, arena, match);
  let { x, z, h, vx, vz, vh } = f;
  const airborne = h > 0 || vh > 0;
  if (airborne) { vh -= arena.gravity; h += vh; }
  x += vx; z += vz;
  let landed = false;
  if (airborne && h <= 0) { h = 0; vh = 0; landed = true; events.push({ kind: "land", who }); }
  if (!airborne || landed) {
    vx = floorDiv(vx * (match.friction - 1), match.friction);
    vz = 0;
  }
  return { ...f, x: clamp(x, arena.xMin, arena.xMax), z: clamp(z, arena.zMin, arena.zMax), h, vx, vz, vh };
}

/** on the floor: lie for downTicks, then stand up invulnerable. A flyer is never on the floor, so it counts down at its hover height */
function tickDown(f: FighterState, cf: CFighter, match: CMatch): FighterState {
  if (f.h > 0 && !cf.flying) return f;
  if (f.down > 1) return { ...f, down: f.down - 1 };
  return { ...enterState(f, cf.initial), down: 0, inv: match.invTicks, fall: 0, hits: 0, hitsT: 0 };
}

function tickTimers(f: FighterState, match: CMatch): FighterState {
  const inv = f.inv > 0 ? f.inv - 1 : 0;
  const cool = f.cool > 0 ? f.cool - 1 : 0;
  let hits = f.hits, hitsT = f.hitsT;
  if (hits > 0) { hitsT += 1; if (hitsT > match.knockdownWindowTicks) { hits = 0; hitsT = 0; } }
  return { ...f, inv, cool, hits, hitsT };
}

/**
 * the clip clock; a finished one-shot goes to `next`, or - the ko clip - to the floor.
 * A KO'd fighter's held clip keeps COUNTING stT past its end (the frame stays the last):
 * that is the corpse timer stage.ts reads, with no field the hash does not already fold.
 */
function advanceClock(f: FighterState, cf: CFighter, match: CMatch): FighterState {
  const st = cf.states[f.st];
  const stT = f.stT + 1;
  if (!stateDone(st, stT)) return { ...f, stT, frame: frameIndexAt(st, stT) };
  if (st.next >= 0) return enterState({ ...f, stT }, st.next);
  const held = { ...f, stT: f.hp <= 0 ? stT : st.total, frame: st.frames.length - 1 };
  return f.hp > 0 && f.down === 0 ? { ...held, down: match.downTicks } : held;
}

export function tickFighter(f0: FighterState, cf: CFighter, arena: CArena, match: CMatch, input: InputFrame, who: number): FighterTick {
  const events: FightEvent[] = [];
  let f = tickTimers(f0, match);
  const prevSt = f.st, prevFrame = f.frame;
  if (f.down > 0) {
    f = tickDown(f, cf, match);
    f = move(f, cf, arena, match, events, who);
    return { f: fireImpulse(f, cf, prevSt, prevFrame), events };
  }
  if (f.stun > 0) {
    f = { ...f, stun: f.stun - 1 };
    return { f: move(f, cf, arena, match, events, who), events };
  }
  if (f.hp > 0) {
    const to = transition(f, cf, input);
    if (to >= 0) f = applyTransition(f, cf, match, to);
    f = walkVelocity(f, cf, input);
  }
  f = move(f, cf, arena, match, events, who);
  f = advanceClock(f, cf, match);
  return { f: fireImpulse(f, cf, prevSt, prevFrame), events };
}

/** a fresh fighter at its cast position; a flying one starts at its hover height. `active` 0 is a wave spawn not yet due */
export function spawnFighter(cf: CFighter, x: number, z: number, face: 1 | -1, ai: FighterState["ai"], active: FighterState["active"] = 1): FighterState {
  return { x, z, h: cf.flying ? cf.hover : 0, vx: 0, vz: 0, vh: 0, face, st: cf.initial, stT: 0, frame: 0, hp: cf.hp, stun: 0, inv: 0, down: 0, fall: 0, hits: 0, hitsT: 0, hitMask: 0, cool: 0, active, ai };
}
