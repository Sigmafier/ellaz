// Who hurt whom: the knight's cone strike with its rng roll, a foe's contact
// damage, and the one function every hit goes through - hp down, a knockback
// away from the hitter, a float, a flash, the hurt or ko state, the events.
// Every function writes into the state it is handed; step.ts clones first.
//
// The sketch (dungeon-actors.js strike / hurtEnemy / hurtKnight) is the
// reference; where it drew `10 + floor(random * 6)` this draws one rng byte
// from the state, and where it normalised by hypot this floor-divides by the
// integer distance.

import { floorDiv } from "../sim/fixed";
import { rngByte } from "../sim/rng";
import { dist } from "./grid";
import { KIND_KNIGHT, ST_GONE, ST_HURT, ST_KO } from "./types";
import type { ActorState, CActor, DungeonData, DungeonState } from "./types";

/** the facing as a direction in world axes, unnormalised: down (1, 1), up (-1, -1), left (-1, 1), right (1, -1) */
export const FACE_VEC: readonly (readonly [number, number])[] = [[1, 1], [-1, -1], [-1, 1], [1, -1]];
/** sqrt 2 as 181/128, the length of every facing vector above */
const SQRT2_NUM = 181, SQRT2_DEN = 128;
const CENTI = 100;

export const alive = (a: ActorState): boolean => a.state !== ST_KO && a.state !== ST_GONE;
export const actorOf = (data: DungeonData, i: number): CActor => data.actors[data.cast[i].actor];

/** hp down, thrown away from (fromX, fromY), a float and a flash, hurt or ko, the events */
export function hurt(s: DungeonState, data: DungeonData, attacker: number, target: number, dmg: number, fromX: number, fromY: number): void {
  const a = s.actors[target], ca = actorOf(data, target);
  if (!alive(a)) return;
  a.hp = a.hp > dmg ? a.hp - dmg : 0;
  a.since = 0;
  a.flash = data.rules.flashTicks;
  const dx = a.x - fromX, dy = a.y - fromY, d = dist(dx, dy) || 1;
  a.vx = floorDiv(dx * ca.knockSpeed, d);
  a.vy = floorDiv(dy * ca.knockSpeed, d);
  s.floats.push({ x: a.x, y: a.y, z: ca.tall, value: dmg, t: data.rules.floatTicks });
  s.events.push({ kind: "hit", attacker, target, x: a.x, z: a.y, h: floorDiv(ca.tall, 2), damage: dmg, effect: "none" });
  if (a.hp <= 0) {
    a.state = ST_KO; a.stateT = 0; a.path = []; a.target = -1; a.goalX = -1; a.goalY = -1;
    s.events.push({ kind: "ko", target });
    return;
  }
  // the knight has no hurt clip in either of his sets: a hit flashes him and throws him, and his state stands
  if (ca.kind !== KIND_KNIGHT) { a.state = ST_HURT; a.stateT = 0; a.struck = 0; }
}

/** is (dx, dy) at distance d inside the knight's cone: the dot with the facing, over d * sqrt 2, above cone / 100 */
export function inCone(dx: number, dy: number, d: number, face: number, cone: number): boolean {
  const [fx, fy] = FACE_VEC[face];
  return (dx * fx + dy * fy) * CENTI * SQRT2_DEN > cone * d * SQRT2_NUM;
}

/** the roll: dmgMin plus one rng byte scaled into [0, dmgMax - dmgMin] */
export function rollDamage(s: DungeonState, dmgMin: number, dmgMax: number): number {
  const [rng, byte] = rngByte(s.rng);
  s.rng = rng;
  return dmgMin + floorDiv(byte * (dmgMax - dmgMin + 1), 256);
}

/** the knight's strike lands on every live foe within reach that is in the cone or point-blank */
export function strike(s: DungeonState, data: DungeonData, k: number): void {
  const knight = s.actors[k], rules = actorOf(data, k).knight!;
  for (let i = 0; i < s.actors.length; i++) {
    if (i === k) continue;
    const e = s.actors[i];
    if (!alive(e)) continue;
    const dx = e.x - knight.x, dy = e.y - knight.y, d = dist(dx, dy);
    if (d >= rules.reach) continue;
    if (d < rules.pointBlank || inCone(dx, dy, d || 1, knight.face, rules.cone)) hurt(s, data, k, i, rollDamage(s, rules.dmgMin, rules.dmgMax), knight.x, knight.y);
  }
}
