// The completability KPI: a scripted hero - chase the nearest live enemy,
// swing in reach, walk right when the way is open - clears all three waves of
// the real toybox quest inside 9,000 ticks with the real data, and collects
// every coin once the stage is clear. No human, no tape: if a wave's numbers
// make the run unwinnable, this is where it shows.

import { loadMode } from "../data/load";
import { reachOf } from "./ai";
import { compileFight } from "./compile";
import { abs, sign } from "./fixed";
import { createState } from "./match";
import { heroIndex } from "./stage";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FighterState, FightState, InputFrame } from "./types";

const data = compileFight(loadMode("stage"));
const HERO = heroIndex(data);
const heroCf = data.fighters[data.cast[HERO].fighter];
const reach = reachOf(heroCf);
const LANE = 3 * FP;
const BUDGET = 9000;

function nearestFoe(s: FightState): FighterState | null {
  let best: FighterState | null = null, bestD = 0;
  s.fighters.forEach((f, i) => {
    if (i === HERO || f.active === 0 || f.hp <= 0 || data.cast[i].team === data.cast[HERO].team) return;
    const d = abs(f.x - s.fighters[HERO].x) + abs(f.z - s.fighters[HERO].z);
    if (!best || d < bestD) { best = f; bestD = d; }
  });
  return best;
}

/** the policy: line up the lane, close to reach, face it, swing when the cooldown allows */
function policy(s: FightState): InputFrame {
  const hero = s.fighters[HERO];
  const foe = nearestFoe(s);
  if (!foe) return s.stage!.wphase === 1 ? { mx: 1, mz: 0, attack: false } : NO_INPUT;
  const dx = foe.x - hero.x, dz = foe.z - hero.z;
  const mz = abs(dz) > LANE ? sign(dz) : 0;
  const far = abs(dx) > reach - 6 * FP;
  const mx = far ? sign(dx) : sign(dx) !== hero.face ? sign(dx) : 0;
  const attack = !far && abs(dz) <= data.match.hitZBand * FP && hero.cool === 0 && sign(dx) === hero.face;
  return { mx, mz, attack };
}

describe("the toybox quest is completable by a scripted hero", () => {
  it("clears 3 of 3 waves inside the budget, levels up on the way, and every coin ends in the purse", () => {
    let s = createState(data);
    const clears: string[] = [];
    let ticks = 0;
    for (; ticks < BUDGET && s.stage!.wphase !== 2; ticks++) {
      const inputs = data.fighters.map((_, i) => (i === HERO ? policy(s) : NO_INPUT));
      s = step(s, inputs, data);
      for (const e of s.events) if (e.kind === "wave") clears.push(`t${s.tick} wave ${e.wave} -> ${["fight", "go", "clear", "fade"][e.wphase]}`);
    }
    console.log(`stage-completes: ${clears.join(" | ")} - clear at tick ${s.tick}`);
    expect(s.stage!.wphase).toBe(2);
    expect(s.stage!.wave).toBe(data.stage!.waves - 1);
    const kos = data.cast.filter((c) => c.wave >= 0).length;
    expect(s.fighters.filter((f, i) => i !== HERO && f.hp <= 0).length).toBe(kos);
    expect(s.stage!.level).toBeGreaterThanOrEqual(2);
    // the magnet: two seconds after the clear every coin has reached the hero
    for (let t = 0; t < 120; t++) s = step(s, data.fighters.map(() => NO_INPUT), data);
    expect(s.pickups).toEqual([]);
    expect(s.stage!.coins).toBe(kos);
    expect(ticks).toBeLessThan(BUDGET);
  });
});
