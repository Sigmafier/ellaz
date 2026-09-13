// The completability KPI: a scripted party - each hero strikes a foe in
// reach, else walks to the reachable tile nearest the nearest foe and strikes
// or waits - WINS the meadow inside 6,000 ticks with the real data, and the
// winning tick is printed. The control: a party that only waits is defeated.
// No human, no tape: if the numbers make the battle unwinnable, this is
// where it shows.

import { gameDir, loadTurnMode } from "../data/load";
import { createState } from "./battle";
import { compileTurn } from "./compile";
import { dist, reachable, targetsFrom } from "./grid";
import { stepTurn } from "./step";
import { ACT_INPUT_PICK, ACT_INPUT_WAIT, NO_TURN_INPUT, PHASE_LOST, PHASE_PLAYER, PHASE_WON } from "./types";
import type { TurnData, TurnInput, TurnState } from "./types";

const BUDGET = 6000;
const data = compileTurn(loadTurnMode("meadow", gameDir("ember")));
const pick = (c: number, r: number): TurnInput => ({ c, r, act: ACT_INPUT_PICK });
const WAIT: TurnInput = { c: 0, r: 0, act: ACT_INPUT_WAIT };

/** the nearest standing foe to (c, r), or -1 */
function nearestFoe(d: TurnData, s: TurnState, c: number, r: number): number {
  let best = -1, bestD = 0;
  s.units.forEach((u, i) => {
    if (u.hp <= 0 || d.units[i].team === 0) return;
    const dd = dist(u.c, u.r, c, r);
    if (best < 0 || dd < bestD) { best = i; bestD = dd; }
  });
  return best;
}

/** what the party does on a player tick: select, strike, walk toward the foes, wait */
function party(d: TurnData, s: TurnState): TurnInput {
  if (s.phase !== PHASE_PLAYER) return NO_TURN_INPUT;
  if (s.sel < 0) {
    const i = s.units.findIndex((u, k) => d.units[k].team === 0 && u.hp > 0 && !u.acted);
    return i < 0 ? WAIT : pick(s.units[i].c, s.units[i].r);
  }
  const u = s.units[s.sel];
  const targets = targetsFrom(d, s.units, s.sel, u.c, u.r);
  if (targets.length) return pick(s.units[targets[0]].c, s.units[targets[0]].r);
  if (!u.moved) {
    const foe = nearestFoe(d, s, u.c, u.r);
    let best: { c: number; r: number } | null = null, bestD = 0;
    for (const t of reachable(d, s.units, s.sel, null)) {
      if (!t.path.length || foe < 0) continue;
      const dd = dist(t.c, t.r, s.units[foe].c, s.units[foe].r);
      if (!best || dd < bestD) { best = t; bestD = dd; }
    }
    if (best && bestD < dist(u.c, u.r, s.units[foe].c, s.units[foe].r)) return pick(best.c, best.r);
  }
  return WAIT;
}

function play(d: TurnData, policy: (d: TurnData, s: TurnState) => TurnInput): { s: TurnState; hits: number } {
  let s = createState(d), hits = 0;
  for (let t = 0; t < BUDGET && s.phase !== PHASE_WON && s.phase !== PHASE_LOST; t++) {
    s = stepTurn(s, [policy(d, s)], d);
    hits += s.events.filter((e) => e.kind === "hit").length;
  }
  return { s, hits };
}

describe("the meadow is completable by a scripted party", () => {
  it("the party wins inside the budget, every foe down, and the tick is printed", () => {
    const { s, hits } = play(data, party);
    console.log(`battle-completes ember/meadow: VICTORY at tick ${s.tick} of ${BUDGET}, turn ${s.turn}, ${hits} hits, party hp ${s.units.slice(0, 2).map((u) => u.hp).join("/")}`);
    expect(s.phase).toBe(PHASE_WON);
    expect(s.units.filter((_, i) => data.units[i].team !== 0).every((u) => u.hp <= 0)).toBe(true);
    expect(s.tick).toBeLessThan(BUDGET);
  });

  it("the control: a party that only waits is defeated", () => {
    const { s } = play(data, (_, st) => (st.phase === PHASE_PLAYER ? WAIT : NO_TURN_INPUT));
    expect(s.phase).toBe(PHASE_LOST);
    expect(s.units.slice(0, 2).every((u) => u.hp <= 0)).toBe(true);
    expect(s.tick).toBeLessThan(BUDGET);
  });
});
