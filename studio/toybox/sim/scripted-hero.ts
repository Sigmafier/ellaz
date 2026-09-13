// The scripted hero: line up the nearest live foe's lane, close to reach, face
// it, swing whenever the cooldown allows, and walk right when the way is open.
// ONE policy, shared by the completability KPI (stage-completes.test.ts) and the
// tape recorder (harness/record-tape.ts), so a recorded tape is played by the same
// hero the KPI measures (2026-09-14; it lived inside the test until then).
//
// What it proves and what it does not: it swings on the first tick of every
// recovery window, which a thumb never does, so it shows a level CAN be won and
// says nothing about how hard it is - .claude/rules/a-perfect-bot-proves-a-level-can-be-won-not-how-hard-it-is.md.

import { reachOf } from "./ai";
import { abs, sign } from "./fixed";
import { heroIndex } from "./stage";
import { FP, NO_INPUT } from "./types";
import type { FightData, FighterState, FightState, InputFrame } from "./types";

/** FP of z difference the hero accepts before stepping toward a foe's lane */
const LANE = 3 * FP;
/** FP the hero stops short of its reach, so a foe's step in does not carry it out of range */
const REACH_MARGIN = 6 * FP;

/** the policy for one game's compiled data */
export function policyFor(data: FightData): (s: FightState) => InputFrame {
  const HERO = heroIndex(data);
  const reach = reachOf(data.fighters[data.cast[HERO].fighter]);
  const nearestFoe = (s: FightState): FighterState | null => {
    let best: FighterState | null = null, bestD = 0;
    s.fighters.forEach((f, i) => {
      if (i === HERO || f.active === 0 || f.hp <= 0 || data.cast[i].team === data.cast[HERO].team) return;
      const d = abs(f.x - s.fighters[HERO].x) + abs(f.z - s.fighters[HERO].z);
      if (!best || d < bestD) { best = f; bestD = d; }
    });
    return best;
  };
  return (s) => {
    const hero = s.fighters[HERO];
    const foe = nearestFoe(s);
    if (!foe) return s.stage!.wphase === 1 ? { mx: 1, mz: 0, attack: false } : NO_INPUT;
    const dx = foe.x - hero.x, dz = foe.z - hero.z;
    const mz = abs(dz) > LANE ? sign(dz) : 0;
    const far = abs(dx) > reach - REACH_MARGIN;
    const mx = far ? sign(dx) : sign(dx) !== hero.face ? sign(dx) : 0;
    const attack = !far && abs(dz) <= data.match.hitZBand * FP && hero.cool === 0 && sign(dx) === hero.face;
    return { mx, mz, attack };
  };
}
