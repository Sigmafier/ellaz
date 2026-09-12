// The CPU fighter: approach to punching range, wait out a cooldown, swing,
// sometimes back off. Every number is from the ai file, every draw is from
// the sim's own rng (so a replay of the same seed produces the same fight),
// and the output is an ordinary InputFrame - the AI presses the same buttons
// a player would, which is what keeps the state graph honest.

import { abs, sign } from "./fixed";
import { frameIndexAt } from "./moves";
import { rngByte, rngRange } from "./rng";
import { FP } from "./types";
import type { AiState, CAi, CFighter, FighterState, InputFrame } from "./types";

export interface AiThought { input: InputFrame; ai: AiState; rng: number }

export function freshAi(): AiState {
  return { cooldown: 0, mode: 0, modeT: 0, wantMx: 0, wantMz: 0, wantAttack: false };
}

/** how far the attack reaches, in FP: the widest itr box across the attack state's frames */
export function reachOf(cf: CFighter): number {
  let reach = 0;
  for (const st of cf.states) {
    if (st.onAttack < 0 && st.next < 0) continue;
    for (const fr of st.frames) for (const h of fr.itr) reach = Math.max(reach, h.box.x + h.box.w);
  }
  return reach;
}

function towardZ(dz: number, params: CAi): -1 | 0 | 1 {
  return abs(dz) > params.zTolerance * FP ? sign(dz) : 0;
}

/** the x intent given the gap to the target and the reach band [reach+max, reach+min] */
function towardX(dx: number, reach: number, params: CAi): -1 | 0 | 1 {
  const gap = abs(dx);
  const near = reach + params.reachPad.max * FP;
  const far = reach + params.reachPad.min * FP;
  if (gap < near) return (-sign(dx)) as -1 | 0 | 1;
  if (gap > far) return sign(dx);
  return 0;
}

function retreating(self: FighterState, target: FighterState, ai: AiState, rng: number): AiThought {
  const mx = (-sign(target.x - self.x)) as -1 | 0 | 1;
  const next: AiState = { ...ai, modeT: ai.modeT - 1, mode: ai.modeT - 1 > 0 ? 2 : 0, wantMx: mx, wantMz: 0, wantAttack: false };
  return { input: { mx, mz: 0, attack: false }, ai: next, rng };
}

/** is a hit still AHEAD in the fighter's state - this frame or a later one carries an itr box. A swing whose active frames have passed is recovery, not danger */
export function swinging(f: FighterState, cf: CFighter): boolean {
  const st = cf.states[f.st];
  return st.frames.slice(frameIndexAt(st, f.stT)).some((fr) => fr.itr.length > 0);
}

/** how far a fighter's standing hurt box sticks out from its pivot toward whoever it faces, in FP: the part of it a punch reaches first */
export function bodyFront(cf: CFighter): number {
  let front = 0;
  for (const b of cf.states[cf.initial].frames[0].bdy) front = Math.max(front, abs(b.x), b.x + b.w);
  return front;
}

/**
 * While the target's swing is ahead, with `holdWhenTargetAttacks` odds this tick: step
 * out of the target's reach if inside it, else stand and wait. Only while APPROACHING
 * (mode 0) - a fighter already reacting in range (mode 1) is committed and swings through.
 * The danger radius is the target's reach plus THIS fighter's body front plus the pad:
 * traced 2026-09-12, a teddy holding at 60 px against a 56 px punch was still hit at
 * 64-66 px, because its own hurt box begins 9 px ahead of its pivot.
 */
function holdBack(cf: CFighter, tcf: CFighter, params: CAi, dx: number, mx: -1 | 0 | 1, mz: -1 | 0 | 1, rng0: number): { mx: -1 | 0 | 1; mz: -1 | 0 | 1; rng: number } {
  const [rng, byte] = rngByte(rng0);
  if (byte >= params.holdWhenTargetAttacks) return { mx, mz, rng };
  const danger = reachOf(tcf) + bodyFront(cf) + params.reachPad.min * FP;
  return { mx: abs(dx) <= danger ? ((-sign(dx)) as -1 | 0 | 1) : 0, mz: 0, rng };
}

/** One tick of thought. `tcf` is the TARGET's compiled fighter: the AI reads its swing and its reach */
export function thinkAi(self: FighterState, target: FighterState, cf: CFighter, tcf: CFighter, params: CAi, ai: AiState, rng0: number): AiThought {
  let rng = rng0;
  if (ai.mode === 2) return retreating(self, target, ai, rng);
  const dx = target.x - self.x, dz = target.z - self.z;
  const reach = reachOf(cf);
  let mz = towardZ(dz, params);
  let mx = towardX(dx, reach, params);
  if (params.holdWhenTargetAttacks > 0 && ai.mode === 0 && swinging(target, tcf)) {
    ({ mx, mz, rng } = holdBack(cf, tcf, params, dx, mx, mz, rng));
  }
  let cooldown = ai.cooldown > 0 ? ai.cooldown - 1 : 0;
  let modeT = ai.modeT;
  let attack = false;
  const inRange = mx === 0 && mz === 0 && abs(dx) <= reach + params.reachPad.min * FP;
  if (inRange && cooldown === 0) {
    if (ai.mode === 0) {
      // first sight of the target in range: react after a short delay
      [rng, modeT] = rngRange(rng, params.reactTicks[0], params.reactTicks[1]);
      return { input: { mx: 0, mz: 0, attack: false }, ai: { cooldown, mode: 1, modeT, wantMx: 0, wantMz: 0, wantAttack: false }, rng };
    }
    if (modeT > 0) modeT -= 1;
    if (modeT === 0) {
      attack = true;
      [rng, cooldown] = rngRange(rng, params.cooldownTicks[0], params.cooldownTicks[1]);
      let byte: number;
      [rng, byte] = rngByte(rng);
      if (byte < params.retreatChance) {
        let ticks: number;
        [rng, ticks] = rngRange(rng, params.retreatTicks[0], params.retreatTicks[1]);
        return { input: { mx: 0, mz: 0, attack: true }, ai: { cooldown, mode: 2, modeT: ticks, wantMx: 0, wantMz: 0, wantAttack: true }, rng };
      }
    }
  }
  const mode = inRange ? (ai.mode === 1 ? 1 : 0) : 0;
  return { input: { mx, mz, attack }, ai: { cooldown, mode, modeT: mode === 1 ? modeT : 0, wantMx: mx, wantMz: mz, wantAttack: attack }, rng };
}
