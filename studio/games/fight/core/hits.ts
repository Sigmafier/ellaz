// Hits between fighters, from the moves files alone: an attacker's `itr` box
// on its current frame against every opposing fighter's `bdy` boxes, within
// the z band the match file allows. Damage, knock, stun and fall come from
// the hit record; whether the target staggers, falls or dies comes from the
// match file's thresholds. Nothing here is a literal.

import { overlaps, worldBox } from "./collide";
import { frameAt } from "./moves";
import { abs } from "./fixed";
import { FP } from "./types";
import type { CFighter, CHit, CMatch, FighterState, FightEvent, FightState } from "./types";

interface Landed { attacker: number; target: number; hit: CHit }

function inBand(a: FighterState, t: FighterState, match: CMatch): boolean {
  return abs(a.z - t.z) <= match.hitZBand * FP;
}

function touches(hit: CHit, a: FighterState, t: FighterState, tf: CFighter): boolean {
  const box = worldBox(hit.box, a.x, a.h, a.face);
  const bdy = frameAt(tf, t.st, t.stT).bdy;
  for (const b of bdy) if (overlaps(box, worldBox(b, t.x, t.h, t.face))) return true;
  return false;
}

/** every (attacker, target, hit) that connects this tick; one hit per target per attack */
export function findHits(s: FightState, fighters: CFighter[], cast: { fighter: number; team: number }[], match: CMatch): Landed[] {
  const out: Landed[] = [];
  s.fighters.forEach((a, ai) => {
    if (a.hp <= 0 || a.stun > 0 || a.down > 0) return;
    const itr = frameAt(fighters[cast[ai].fighter], a.st, a.stT).itr;
    if (itr.length === 0) return;
    s.fighters.forEach((t, ti) => {
      if (ti === ai || cast[ti].team === cast[ai].team || t.hp <= 0 || t.inv > 0 || t.down > 0) return;
      if ((a.hitMask & (1 << ti)) !== 0 || !inBand(a, t, match)) return;
      const hit = itr.find((h) => touches(h, a, t, fighters[cast[ti].fighter]));
      if (hit) out.push({ attacker: ai, target: ti, hit });
    });
  });
  return out;
}

/** the target after a hit: hp, knock, stun, and which reaction state it enters */
export function applyHit(t: FighterState, tf: CFighter, hit: CHit, face: 1 | -1, match: CMatch): FighterState {
  const hp = t.hp - hit.damage;
  const hits = t.hits + 1;
  const fall = t.fall + hit.fall;
  const knockedDown = hp > 0 && (hits >= match.hitsToKnockdown || fall >= match.fallThreshold);
  const st = hp <= 0 || knockedDown ? tf.ko : tf.hurt;
  return {
    ...t,
    hp,
    vx: hit.knockX * face,
    vh: t.vh - hit.knockY,
    face: (-face) as 1 | -1,
    st,
    stT: 0,
    frame: 0,
    stun: hp <= 0 || knockedDown ? 0 : hit.stun,
    fall: knockedDown ? 0 : fall,
    hits: knockedDown ? 0 : hits,
    hitsT: knockedDown ? 0 : (t.hits === 0 ? 0 : t.hitsT),
    hitMask: 0,
  };
}

/** resolve every landed hit into new fighter states, hitstop, shake and events */
export function resolveHits(s: FightState, fighters: CFighter[], cast: { fighter: number; team: number }[], match: CMatch): FightState {
  const landed = findHits(s, fighters, cast, match);
  if (landed.length === 0) return s;
  const next = s.fighters.slice();
  const events: FightEvent[] = [...s.events];
  for (const { attacker, target, hit } of landed) {
    const a = next[attacker], t = next[target];
    const struck = applyHit(t, fighters[cast[target].fighter], hit, a.face, match);
    next[target] = struck;
    next[attacker] = { ...a, hitMask: a.hitMask | (1 << target) };
    events.push({ kind: "hit", attacker, target, x: t.x, z: t.z, h: t.h, damage: hit.damage, effect: hit.effect });
    if (struck.hp <= 0) events.push({ kind: "ko", target });
    else if (struck.st === fighters[cast[target].fighter].ko) events.push({ kind: "knockdown", target });
  }
  return { ...s, fighters: next, events, freeze: match.hitstopTicks, shake: match.shakeTicks };
}
