// The CPU draws from the sim's rng and nothing else: two calls with the same
// arguments produce the same thought, and its randomness is the rng word it
// hands back. A Math.random inside thinkAi breaks the first assertion.

import { loadMode } from "../data/load";
import { freshAi, reachOf, thinkAi } from "./ai";
import { compileFight } from "./compile";
import { spawnAll } from "./match";
import { seedRng } from "./rng";
import { FP } from "./types";

const data = compileFight(loadMode("versus"));
const cpu = data.cast.findIndex((c) => c.control === "ai");
const player = data.cast.findIndex((c) => c.control === "player");

describe("the AI lives inside the sim", () => {
  const pcf = data.fighters[data.cast[player].fighter];

  it("is a pure function of its arguments", () => {
    const [p, t] = [spawnAll(data)[player], spawnAll(data)[cpu]];
    const cf = data.fighters[data.cast[cpu].fighter], params = data.ais[data.cast[cpu].ai];
    const a = thinkAi(t, p, cf, pcf, params, freshAi(), seedRng(7));
    const b = thinkAi(t, p, cf, pcf, params, freshAi(), seedRng(7));
    expect(a).toEqual(b);
  });

  it("walks toward a distant target and attacks in range after its react delay", () => {
    const [p, t0] = [spawnAll(data)[player], spawnAll(data)[cpu]];
    const cf = data.fighters[data.cast[cpu].fighter], params = data.ais[data.cast[cpu].ai];
    const far = thinkAi(t0, p, cf, pcf, params, freshAi(), seedRng(1));
    expect(far.input.mx).toBe(-1);   // teddy starts to the right of the robot and walks left
    const reach = reachOf(cf);
    expect(reach).toBeGreaterThan(0);
    const near = { ...t0, x: p.x + reach + params.reachPad.min * FP - FP, z: p.z };
    let ai = freshAi(), rng = seedRng(1), attacked = false;
    for (let i = 0; i < 40 && !attacked; i++) {
      const th = thinkAi(near, p, cf, pcf, params, ai, rng);
      ai = th.ai; rng = th.rng; attacked = th.input.attack;
    }
    expect(attacked).toBe(true);
  });

  it("different rng words can lead to different decisions (the byte is read)", () => {
    const [p, t0] = [spawnAll(data)[player], spawnAll(data)[cpu]];
    const cf = data.fighters[data.cast[cpu].fighter], params = data.ais[data.cast[cpu].ai];
    const near = { ...t0, x: p.x + reachOf(cf) - FP, z: p.z };
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let ai = freshAi(), rng = seedRng(seed);
      for (let i = 0; i < 40; i++) { const th = thinkAi(near, p, cf, pcf, params, ai, rng); ai = th.ai; rng = th.rng; if (th.input.attack) { outcomes.add(`${th.ai.mode}:${th.ai.cooldown}`); break; } }
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });
});
