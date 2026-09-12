// The match around the fighters: who is on the floor, when the fight is
// over, and the rematch. Phases are integers so they hash; durations are
// tick counts from the match file.

import { freshAi } from "./ai";
import { spawnFighter } from "./fighter";
import { seedRng } from "./rng";
import type { FightData, FighterState, FightEvent, FightState, Phase, StageState } from "./types";

/** every roster row at its cast position; a wave spawn (wave >= 0) starts dormant and stage.ts wakes it */
export function spawnAll(data: FightData): FighterState[] {
  return data.cast.map((c) => spawnFighter(data.fighters[c.fighter], c.x, c.z, c.face, c.control === "ai" ? freshAi() : null, c.wave < 0 ? 1 : 0));
}

export function createState(data: FightData): FightState {
  const stage: StageState | null = data.stage ? { wave: 0, wphase: 0, waveT: 0, camX: 0, coins: 0, xp: 0, level: 1 } : null;
  return { tick: 0, rng: seedRng(data.seed), phase: 1, phaseT: 0, freeze: 0, shake: 0, winner: -1, stage, pickups: [], fighters: spawnAll(data), events: [{ kind: "phase", phase: 1 }] };
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
