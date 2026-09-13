// The match around the fighters: who is on the floor, when the fight is
// over, and the rematch. Phases are integers so they hash; durations are
// tick counts from the match file.

import { freshAi } from "./ai";
import { spawnFighter } from "./fighter";
import { seedRng } from "./rng";
import { heroIndex, heroMaxHp } from "./stage";
import type { Carry, FightData, FighterState, FightEvent, FightState, Phase, StageState } from "./types";

/** every roster row at its cast position; a wave spawn (wave >= 0) starts dormant and stage.ts wakes it */
export function spawnAll(data: FightData): FighterState[] {
  return data.cast.map((c) => spawnFighter(data.fighters[c.fighter], c.x, c.z, c.face, c.control === "ai" ? freshAi() : null, c.wave < 0 ? 1 : 0));
}

/**
 * The fresh state; with a `carry` (a campaign's purse from the stage before), the
 * stage block starts at that purse and the hero at the hp its level earns. Without
 * one the state is byte-identical to what every golden was recorded through -
 * sim/carry.test.ts pins the identity over every stage mode on disk. A carry on a
 * mode with no stage block has nowhere to go and is refused.
 */
export function createState(data: FightData, carry?: Carry): FightState {
  const stage: StageState | null = data.stage ? { wave: 0, wphase: 0, waveT: 0, camX: 0, coins: 0, xp: 0, level: 1 } : null;
  const fighters = spawnAll(data);
  if (carry) {
    if (!stage) throw new Error(`fight/match: a carry (level ${carry.level}) was handed to a mode with no stage block; hero "${data.fighters[data.cast[heroIndex(data)].fighter].id}" has no level to carry`);
    stage.coins = carry.coins; stage.xp = carry.xp; stage.level = carry.level;
    const hero = heroIndex(data);
    fighters[hero] = { ...fighters[hero], hp: heroMaxHp(data, carry.level) };
  }
  return { tick: 0, rng: seedRng(data.seed), phase: 1, phaseT: 0, freeze: 0, shake: 0, winner: -1, stage, pickups: [], fighters, events: [{ kind: "phase", phase: 1 }] };
}

function winnerOf(s: FightState, data: FightData): -1 | 0 | 1 {
  const alive = s.fighters.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);
  if (alive.length === s.fighters.length) return -1;
  const teams = new Set(alive.map((i) => data.cast[i].team));
  if (teams.size !== 1) return -1;
  return (alive[0] === 0 ? 0 : 1) as 0 | 1;
}

function toPhase(s: FightState, phase: Phase, events: FightEvent[]): FightState {
  events.push({ kind: "phase", phase });
  return { ...s, phase, phaseT: 0 };
}

/** after the fighters have ticked: advance the phase clock, detect the KO, run the rematch */
export function tickMatch(s: FightState, data: FightData): FightState {
  const events = [...s.events];
  let next: FightState = { ...s, phaseT: s.phaseT + 1 };
  if (next.phase === 1) {
    const w = winnerOf(next, data);
    if (w >= 0) next = toPhase({ ...next, winner: w }, 2, events);
  } else if (next.phase === 2 && next.phaseT >= data.match.koFadeTicks) {
    next = toPhase(next, 3, events);
  } else if (next.phase === 3 && next.phaseT >= data.match.rematchAfterTicks) {
    next = toPhase({ ...next, winner: -1, fighters: spawnAll(data), freeze: 0, shake: 0 }, 1, events);
  }
  return { ...next, events };
}
