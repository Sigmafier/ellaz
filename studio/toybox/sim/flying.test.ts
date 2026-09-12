// A flying fighter holds its hover height while it is alive - no gravity, no
// landing - and drops the moment it is KO'd. The grounded control beside it
// falls from the same height, so "never lands" cannot pass on a sim that
// simply forgot gravity.

import { gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { freshAi } from "./ai";
import { spawnFighter } from "./fighter";
import { createState } from "./match";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FighterState, FightState } from "./types";

const data = compileFight(loadMode("stage", gameDir("fight")));
const idle = data.fighters.map(() => NO_INPUT);
const BAT = data.cast.findIndex((c) => data.fighters[c.fighter].id === "bat");
const SLIME = data.cast.findIndex((c) => data.fighters[c.fighter].id === "slime");
const bat = data.fighters[data.cast[BAT].fighter];
const slime = data.fighters[data.cast[SLIME].fighter];

/** row `i` awake and alone at x 300, lane 260, with `patch` on top */
function alone(i: number, patch: Partial<FighterState>): FightState {
  const s = createState(data);
  const fighters = s.fighters.slice();
  fighters[i] = { ...spawnFighter(data.fighters[data.cast[i].fighter], 300 * FP, 260 * FP, -1, freshAi(), 1), ...patch };
  // the hero is at the far edge so nothing swings at the subject; the phase is fight with the wave's clock parked
  fighters[0] = { ...fighters[0], x: 40 * FP, z: 190 * FP };
  return { ...s, fighters, stage: { ...s.stage!, wave: data.cast[i].wave, waveT: -100000 } };
}

const landsFor = (who: number, s: FightState, n: number): number => {
  let landed = 0;
  for (let t = 0; t < n; t++) { s = step(s, idle, data); landed += s.events.filter((e) => e.kind === "land" && e.who === who).length; }
  return landed;
};

describe("flying", () => {
  it("the bat spawns at its hover height and the slime on the floor", () => {
    expect(bat.flying).toBe(true);
    expect(bat.hover).toBe(20 * FP);
    expect(alone(BAT, {}).fighters[BAT].h).toBe(20 * FP);
    expect(slime.flying).toBe(false);
    expect(alone(SLIME, {}).fighters[SLIME].h).toBe(0);
  });

  it("holds the hover for 600 ticks with no landing", () => {
    let s = alone(BAT, {});
    expect(landsFor(BAT, s, 600)).toBe(0);
    for (let t = 0; t < 600; t++) s = step(s, idle, data);
    expect(s.fighters[BAT].h).toBe(20 * FP);
    expect(s.fighters[BAT].vh).toBe(0);
  });

  it("the control: a grounded fighter lifted to the same height falls and lands once", () => {
    let s = alone(SLIME, { h: 20 * FP });
    expect(landsFor(SLIME, s, 60)).toBe(1);
    for (let t = 0; t < 60; t++) s = step(s, idle, data);
    expect(s.fighters[SLIME].h).toBe(0);
  });

  it("sheds a knock's lift instead of flying higher", () => {
    let s = alone(BAT, { vh: 600 });
    s = step(s, idle, data);
    expect(s.fighters[BAT].h).toBe(20 * FP);
    expect(s.fighters[BAT].vh).toBe(0);
  });

  it("a KO'd bat falls to the floor and lands", () => {
    let s = alone(BAT, { hp: 0, st: bat.ko });
    expect(landsFor(BAT, s, 60)).toBe(1);
    for (let t = 0; t < 60; t++) s = step(s, idle, data);
    expect(s.fighters[BAT].h).toBe(0);
  });

  it("a knocked-down bat gets back up in the air after downTicks", () => {
    let s = alone(BAT, { down: data.match.downTicks, st: bat.ko, stT: 10000 });
    for (let t = 0; t < data.match.downTicks; t++) s = step(s, idle, data);
    expect(s.fighters[BAT].down).toBe(0);
    expect(s.fighters[BAT].h).toBe(20 * FP);
    expect(s.fighters[BAT].inv).toBeGreaterThan(0);
  });
});
