// The completability KPI: a scripted hero - chase the nearest live enemy,
// swing in reach, walk right when the way is open - clears every wave of
// every stage mode of every game inside 9,000 ticks with the real data, and
// collects every coin once the stage is clear. No human, no tape: if a wave's
// numbers make the run unwinnable, this is where it shows.
//
// The population is walked from the tree (games/*/data/modes/*.json naming a
// stage file), never listed by hand, and asserted non-empty with the two
// games known today so a broken walk cannot pass over nothing.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GAMES, gameDir, loadMode, readModeKind } from "../data/load";
import { reachOf } from "./ai";
import { compileFight } from "./compile";
import { abs, sign } from "./fixed";
import { createState } from "./match";
import { heroIndex } from "./stage";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FightData, FighterState, FightState, InputFrame } from "./types";

const LANE = 3 * FP;
const BUDGET = 9000;

/** every (game, mode) whose mode names a stage file */
function stageModes(): { game: string; mode: string }[] {
  const out: { game: string; mode: string }[] = [];
  for (const g of readdirSync(GAMES).sort()) {
    const modes = join(GAMES, g, "data", "modes");
    if (!existsSync(modes)) continue;
    for (const f of readdirSync(modes).filter((x) => x.endsWith(".json")).sort()) {
      const id = f.replace(/\.json$/, "");
      // a turn mode has no waves to clear; its completability KPI is turn/battle-completes.test.ts
      if (readModeKind(id, gameDir(g)) !== "fight") continue;
      if (loadMode(id, gameDir(g)).stage) out.push({ game: g, mode: id });
    }
  }
  return out;
}

/** the policy for one game's data: line up the lane, close to reach, face it, swing when the cooldown allows; walk right when the way is open */
function policyFor(data: FightData): (s: FightState) => InputFrame {
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
    const far = abs(dx) > reach - 6 * FP;
    const mx = far ? sign(dx) : sign(dx) !== hero.face ? sign(dx) : 0;
    const attack = !far && abs(dz) <= data.match.hitZBand * FP && hero.cool === 0 && sign(dx) === hero.face;
    return { mx, mz, attack };
  };
}

const MODES = stageModes();

describe("every stage mode on disk is completable by a scripted hero", () => {
  it("found the crypt and the fight's six (the stage and the campaign's five), so nothing below runs over an empty list", () => {
    expect(MODES).toEqual([
      { game: "crypt", mode: "crypt" },
      { game: "fight", mode: "shelf-1" }, { game: "fight", mode: "shelf-2" }, { game: "fight", mode: "shelf-boss" },
      { game: "fight", mode: "stage" }, { game: "fight", mode: "toybox-2" }, { game: "fight", mode: "toybox-3" },
    ]);
  });

  for (const { game, mode } of MODES) {
    it(`${game}/${mode}: clears every wave inside the budget, levels up on the way, and every coin ends in the purse`, () => {
      const data = compileFight(loadMode(mode, gameDir(game)));
      const HERO = heroIndex(data);
      const policy = policyFor(data);
      let s = createState(data);
      const clears: string[] = [];
      let ticks = 0;
      for (; ticks < BUDGET && s.stage!.wphase !== 2; ticks++) {
        const inputs = data.fighters.map((_, i) => (i === HERO ? policy(s) : NO_INPUT));
        s = step(s, inputs, data);
        for (const e of s.events) if (e.kind === "wave") clears.push(`t${s.tick} wave ${e.wave} -> ${["fight", "go", "clear", "fade"][e.wphase]}`);
      }
      console.log(`stage-completes ${game}/${mode}: ${clears.join(" | ")} - clear at tick ${s.tick} of ${BUDGET}`);
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
  }
});
