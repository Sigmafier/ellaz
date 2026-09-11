// One tick of the whole fight. Pure and non-mutating: `state` and `data` are
// never written to (step-is-pure.test.ts freezes both and expects no throw),
// a fresh FightState comes back, and the events of THIS tick ride on it for
// the cell to draw. Order inside a tick: inputs (player or AI) -> each
// fighter alone -> hits between them -> push-apart -> the match phase.

import { thinkAi } from "./ai";
import { overlapX, worldBox } from "./collide";
import { tickFighter } from "./fighter";
import { resolveHits } from "./hits";
import { tickMatch } from "./match";
import { frameAt } from "./moves";
import { floorDiv } from "./fixed";
import { FP, NO_INPUT } from "./types";
import type { FightData, FighterState, FightEvent, FightState, InputFrame } from "./types";

function inputsFor(s: FightState, given: readonly InputFrame[], data: FightData): { inputs: InputFrame[]; fighters: FighterState[]; rng: number } {
  let rng = s.rng;
  const fighters = s.fighters.slice();
  const inputs = s.fighters.map((f, i) => {
    const c = data.cast[i];
    if (c.control === "player") return given[i] ?? NO_INPUT;
    if (!f.ai || f.hp <= 0) return NO_INPUT;
    const target = s.fighters.findIndex((t, j) => j !== i && data.cast[j].team !== c.team && t.hp > 0);
    if (target < 0) return NO_INPUT;
    const thought = thinkAi(f, s.fighters[target], data.fighters[c.fighter], data.ais[c.ai], f.ai, rng);
    rng = thought.rng;
    fighters[i] = { ...f, ai: thought.ai };
    return thought.input;
  });
  return { inputs, fighters, rng };
}

/** grounded fighters do not overlap in x: each is pushed half the overlap of its push box */
function separate(fighters: FighterState[], data: FightData): FighterState[] {
  const out = fighters.slice();
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      if (a.h > 0 || b.h > 0 || a.hp <= 0 || b.hp <= 0 || a.down > 0 || b.down > 0) continue;
      const pa = frameAt(data.fighters[data.cast[i].fighter], a.st, a.stT).push;
      const pb = frameAt(data.fighters[data.cast[j].fighter], b.st, b.stT).push;
      if (!pa || !pb) continue;
      const dz = a.z - b.z;
      if (dz > data.match.hitZBand * FP || dz < -data.match.hitZBand * FP) continue;
      const push = overlapX(worldBox(pa, a.x, 0, a.face), worldBox(pb, b.x, 0, b.face));
      if (push === 0) continue;
      const half = floorDiv(push, 2);
      out[i] = { ...a, x: a.x + half };
      out[j] = { ...b, x: b.x - (push - half) };
    }
  }
  return out;
}

export function step(state: FightState, given: readonly InputFrame[], data: FightData): FightState {
  const tick = state.tick + 1;
  if (state.freeze > 0) {
    return { ...state, tick, freeze: state.freeze - 1, shake: state.shake > 0 ? state.shake - 1 : 0, events: [] };
  }
  const { inputs, fighters, rng } = inputsFor(state, given, data);
  const events: FightEvent[] = [];
  const ticked = fighters.map((f, i) => {
    const c = data.cast[i];
    const r = tickFighter(f, data.fighters[c.fighter], data.arena, data.match, inputs[i], i);
    events.push(...r.events);
    return r.f;
  });
  let next: FightState = { ...state, tick, rng, shake: state.shake > 0 ? state.shake - 1 : 0, fighters: ticked, events };
  next = resolveHits(next, data.fighters, data.cast, data.match);
  next = { ...next, fighters: separate(next.fighters, data) };
  return tickMatch(next, data);
}
