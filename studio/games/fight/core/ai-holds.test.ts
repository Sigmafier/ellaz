// The AI approach fix, and its measurement. With holdWhenTargetAttacks the CPU
// stands its ground on the ticks the target is mid-swing instead of walking
// into the fist; at 0 it walks straight in - the old behaviour, pinned here
// so the change is a number in a file and not a memory. The measurement is
// the one the README recorded: a robot standing still and mashing attack for
// 6,000 ticks of Versus took 0 hits. It takes some now, and the test prints
// both numbers so the commit can quote them.

import { loadMode } from "../data/load";
import { freshAi, reachOf, swinging, thinkAi } from "./ai";
import { compileFight } from "./compile";
import { createState } from "./match";
import { stateIndex } from "./moves";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FightData, InputFrame } from "./types";

const loaded = loadMode("versus");
const data = compileFight(loaded);
const robot = data.fighters[data.cast[0].fighter];
const teddy = data.fighters[data.cast[1].fighter];
const params = data.ais[data.cast[1].ai];

/** the same Versus data with the teddy's hold set to `hold` and the rng seeded with `seed` - data mutations, nothing in code */
function withHold(hold: number, seed = loaded.mode.seed): FightData {
  const j = JSON.parse(JSON.stringify(loaded));
  j.ais[0].holdWhenTargetAttacks = hold;
  j.mode.seed = seed;
  return compileFight(j);
}

/** hits the robot takes while standing still and mashing attack for `ticks` */
function mashHits(d: FightData, ticks: number): number {
  let s = createState(d);
  let hits = 0;
  const mash: InputFrame[] = [{ mx: 0, mz: 0, attack: true }, NO_INPUT];
  for (let t = 0; t < ticks; t++) {
    s = step(s, mash, d);
    hits += s.events.filter((e) => e.kind === "hit" && e.target === 0).length;
  }
  return hits;
}

describe("holdWhenTargetAttacks", () => {
  const [r, t] = createState(data).fighters;
  const attack = stateIndex(robot, "attack");
  const swingingRobot = { ...r, st: attack, stT: 0 };
  const far = { ...t, x: r.x + 200 * FP, z: r.z };

  it("swinging() reads a hit still AHEAD in the state: true at the swing's start, false once the last active frame has passed", () => {
    expect(swinging(swingingRobot, robot)).toBe(true);
    expect(swinging(r, robot)).toBe(false);
    expect(swinging({ ...r, st: stateIndex(robot, "walk") }, robot)).toBe(false);
    const st = robot.states[attack];
    const lastActive = st.frames.map((f, i) => (f.itr.length ? i : -1)).filter((i) => i >= 0).pop()!;
    expect(lastActive).toBeGreaterThanOrEqual(0);
    expect(lastActive).toBeLessThan(st.frames.length - 1);
    const recovering = { ...r, st: attack, stT: st.total - 1 };
    expect(swinging(recovering, robot)).toBe(false);
  });

  it("at 255, outside the target's reach the AI stands still on a tick the swing is ahead; at 0 it walks in - the old behaviour, pinned", () => {
    const hold = thinkAi(far, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    expect(hold.input).toEqual({ mx: 0, mz: 0, attack: false });
    const walk = thinkAi(far, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 0 }, freshAi(), 1234);
    expect(walk.input.mx).toBe(-1);
  });

  it("inside the target's reach it steps OUT while the swing is ahead - the robot out-reaches the teddy, so standing there is standing in the punch", () => {
    expect(reachOf(robot)).toBeGreaterThan(reachOf(teddy));
    const inside = { ...t, x: r.x + reachOf(robot) - 2 * FP, z: r.z };
    const out = thinkAi(inside, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    expect(out.input).toEqual({ mx: 1, mz: 0, attack: false });
    // but not once the swing's active frames have passed: then it closes in
    const recovering = { ...swingingRobot, stT: robot.states[attack].total - 1 };
    const closeIn = thinkAi(inside, recovering, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    expect(closeIn.input.mx).toBe(-1);
  });

  it("a fighter already reacting in range (mode 1) is committed: the swing ahead does not make it step back", () => {
    const inRange = { ...t, x: r.x + reachOf(teddy) - FP, z: r.z };
    const reacting = { ...freshAi(), mode: 1 as const, modeT: 4 };
    const th = thinkAi(inRange, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, reacting, 1234);
    expect(th.input.mx).toBe(0);
    expect(th.ai.mode).toBe(1);
    expect(th.rng).toBe(1234);
  });

  it("while the target is calm, 255 walks in exactly like 0 does, and draws no rng", () => {
    const a = thinkAi(far, r, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    const b = thinkAi(far, r, teddy, robot, { ...params, holdWhenTargetAttacks: 0 }, freshAi(), 1234);
    expect(a.input).toEqual(b.input);
    expect(a.input.mx).toBe(-1);
    expect(a.rng).toBe(1234);
  });

  it("draws one rng byte per held tick, from the sim's rng - so a replay holds on the same ticks", () => {
    const a = thinkAi(far, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    expect(a.rng).not.toBe(1234);
    const again = thinkAi(far, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 255 }, freshAi(), 1234);
    expect(again.rng).toBe(a.rng);
    // in between: 128 holds roughly half the ticks over a long swing, never all, never none
    let rng = 7, held = 0;
    for (let i = 0; i < 400; i++) {
      const th = thinkAi(far, swingingRobot, teddy, robot, { ...params, holdWhenTargetAttacks: 128 }, freshAi(), rng);
      rng = th.rng;
      if (th.input.mx === 0) held += 1;
    }
    expect(held).toBeGreaterThan(120);
    expect(held).toBeLessThan(280);
  });

  it("the measurement: a robot standing still and mashing attack for 6,000 ticks takes 0 hits at hold 0 and at least one at the file's value, on every one of three seeds", () => {
    // measured 2026-09-12 at attackCooldownTicks 60: hold 0 -> 0,0,0,0,0 over five seeds; hold 200 -> 2,3,10,1,4.
    // At the old cooldown of 45 no hold value landed a hit - the teddy cannot cross the 27 px between the
    // robot's reach and its own inside a 25-tick recovery - which is why the match file moved to 60.
    const seeds = [loaded.mode.seed, 1, 2];
    const before = seeds.map((seed) => mashHits(withHold(0, seed), 6000));
    const after = seeds.map((seed) => mashHits(withHold(params.holdWhenTargetAttacks, seed), 6000));
    console.log(`ai-holds: standing-mash hits taken by the robot over 6,000 ticks, seeds ${seeds.join("/")} - hold 0: ${before.join("/")}, hold ${params.holdWhenTargetAttacks} (teddy-cpu.json): ${after.join("/")}`);
    expect(before).toEqual([0, 0, 0]);
    for (const n of after) expect(n).toBeGreaterThanOrEqual(1);
    expect(mashHits(data, 6000)).toBe(after[0]);
  });
});
