// The room: the state's birth and clone, the coins on the floor, the phase
// machine (FIGHT -> DOOR when the last foe falls -> WON when the knight
// stands on a threshold tile; LOST when his hp reaches 0), and the cosmetics
// every tick advances. Every function writes into the state it is handed;
// step.ts clones first.

import { dist } from "./grid";
import { alive, screenFP } from "./hits";
import { knightTile } from "./knight";
import { BANNER_DEFEAT, BANNER_DOOR, BANNER_NONE, BANNER_VICTORY, KIND_BAT, PHASE_DOOR, PHASE_FIGHT, PHASE_LOST, PHASE_WON, ST_FLY, ST_IDLE } from "./types";
import type { ActorState, DungeonData, DungeonState } from "./types";

const HERO = 0;

function newActor(data: DungeonData, i: number): ActorState {
  const c = data.cast[i], ca = data.actors[c.actor];
  return {
    x: c.x, y: c.y, vx: 0, vy: 0, hp: ca.hp, mp: ca.knight ? ca.knight.mp : 0,
    face: i === HERO ? data.room.startFace : 0, state: ca.kind === KIND_BAT ? ST_FLY : ST_IDLE, stateT: 0,
    // a foe's wait is its first cooldown (a slime) or its first swoop's timer (a bat); the knight begins already regenerating
    cd: ca.kind === KIND_BAT ? 0 : c.wait, pause: 0, since: ca.knight ? ca.knight.hpRegenAfter : 0, swoopT: ca.kind === KIND_BAT ? c.wait : 0,
    alt: ca.hover, aimX: 0, aimY: 0, target: -1, repath: 0, struck: 0, dropped: 0, flash: 0, goalX: -1, goalY: -1, path: [],
  };
}

export function createState(data: DungeonData): DungeonState {
  return {
    tick: 0, rng: data.seed >>> 0, phase: PHASE_FIGHT, bannerT: 0, banner: BANNER_NONE, coins: 0,
    actors: data.cast.map((_, i) => newActor(data, i)),
    drops: [], floats: [], markers: [], events: [],
  };
}

/** a deep copy with this tick's events emptied: what step() writes into */
export function cloneState(s: DungeonState): DungeonState {
  return {
    ...s,
    actors: s.actors.map((a) => ({ ...a, path: [...a.path] })),
    drops: s.drops.map((d) => ({ ...d })),
    floats: s.floats.map((f) => ({ ...f })),
    markers: s.markers.map((m) => ({ ...m })),
    events: [],
  };
}

/** does any foe still stand */
export function anyFoeAlive(s: DungeonState): boolean {
  for (let i = 1; i < s.actors.length; i++) if (alive(s.actors[i])) return true;
  return false;
}

/** a coin the knight walks over is taken, once it has lain long enough */
function tickDrops(s: DungeonState, data: DungeonData): void {
  const k = s.actors[HERO], rules = data.rules;
  const kept = [];
  for (const d of s.drops) {
    d.t += 1;
    if (alive(k) && d.t > rules.pickupDelayTicks && dist(d.x - k.x, d.y - k.y) < rules.pickup) {
      s.coins += d.value;
      const at = screenFP(data.room, d.x, d.y);
      s.events.push({ kind: "coin", x: at.x, z: at.y, coins: d.value });
      continue;
    }
    kept.push(d);
  }
  s.drops = kept;
}

function setPhase(s: DungeonState, phase: number, banner: number, ticks: number): void {
  s.phase = phase; s.banner = banner; s.bannerT = ticks;
  s.events.push({ kind: "phase", phase });
}

/** the phase machine: a fallen knight loses from any phase; the last foe opens the door; the threshold wins */
export function tickPhase(s: DungeonState, data: DungeonData): void {
  const k = s.actors[HERO];
  if (!alive(k)) { if (s.phase !== PHASE_LOST) setPhase(s, PHASE_LOST, BANNER_DEFEAT, 0); return; }
  if (s.phase === PHASE_FIGHT && !anyFoeAlive(s)) { setPhase(s, PHASE_DOOR, BANNER_DOOR, data.rules.doorBannerTicks); return; }
  if (s.phase === PHASE_DOOR && data.room.door.includes(knightTile(data, k))) setPhase(s, PHASE_WON, BANNER_VICTORY, 0);
}

/** the room's tick: coins, then the phase */
export function tickRoom(s: DungeonState, data: DungeonData): void {
  tickDrops(s, data);
  tickPhase(s, data);
}

/** every actor's state clock advances, the floats and markers fall due, the flashes and the door banner fade */
export function tickCosmetics(s: DungeonState): void {
  for (const a of s.actors) {
    a.stateT += 1;
    if (a.flash > 0) a.flash -= 1;
  }
  for (const f of s.floats) f.t -= 1;
  s.floats = s.floats.filter((f) => f.t > 0);
  for (const m of s.markers) m.t -= 1;
  s.markers = s.markers.filter((m) => m.t > 0);
  if (s.bannerT > 0 && s.phase !== PHASE_WON && s.phase !== PHASE_LOST) s.bannerT -= 1;
}
