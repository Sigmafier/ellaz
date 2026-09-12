// The wave machine against the real toybox quest: spawns wake on their tick at
// the screen's edge, a dormant row is inert at every site, the hero and the
// camera stay inside the bounds the phase allows, fight -> go -> clear turns
// only when the wave's queue is spent AND nothing of it is alive, and the
// hero going down restarts THIS wave with coins, xp and level intact.
//
// Every rule has its negative control beside it, because a stage that never
// spawns anything also passes "nothing is drawn".

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { freshAi } from "./ai";
import { dormant, spawnFighter } from "./fighter";
import { createState } from "./match";
import { frameAt, stateIndex } from "./moves";
import { heroIndex, heroMaxHp } from "./stage";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FighterState, FightState, InputFrame, StageState } from "./types";
import { viewOf } from "./view";

const data = compileFight(loadMode("stage"));
const stage = data.stage!;
const HERO = heroIndex(data);
const W = data.arena.viewW;
const idle = data.fighters.map(() => NO_INPUT);
const rowsOf = (wave: number) => data.cast.map((c, i) => (c.wave === wave ? i : -1)).filter((i) => i >= 0);
const run = (s: FightState, n: number, inputs: InputFrame[] = idle) => { for (let i = 0; i < n; i++) s = step(s, inputs, data); return s; };
const st = (s: FightState) => s.stage as StageState;
const withStage = (s: FightState, patch: Partial<StageState>): FightState => ({ ...s, stage: { ...st(s), ...patch } });
const withFighter = (s: FightState, i: number, patch: Partial<FighterState>): FightState => {
  const fighters = s.fighters.slice(); fighters[i] = { ...fighters[i], ...patch }; return { ...s, fighters };
};
/** a wave row awake at (x, z) with full hp, as spawnDue would leave it */
const awake = (s: FightState, i: number, x: number, z: number, patch: Partial<FighterState> = {}): FightState =>
  withFighter({ ...s, fighters: s.fighters.slice() }, i, { ...spawnFighter(data.fighters[data.cast[i].fighter], x, z, data.cast[i].face, freshAi(), 1), ...patch });

describe("the roster at tick 0", () => {
  it("is the hero live and twelve dormant spawns, thirteen rows, one stage block", () => {
    const s = createState(data);
    expect(s.fighters.length).toBe(13);
    expect(s.fighters.map((f) => f.active)).toEqual([1, ...Array(12).fill(0)]);
    expect(st(s)).toEqual({ wave: 0, wphase: 0, waveT: 0, camX: 0, coins: 0, xp: 0, level: 1 });
    expect(s.pickups).toEqual([]);
  });
});

describe("spawning", () => {
  it("wakes a row on its delay tick, at the camera's edge plus the spawn pad, facing in, in a lane inside the spawn band", () => {
    const [first, second] = rowsOf(0);
    const c = data.cast[first];
    expect(c.delayTicks).toBe(18);
    const before = run(createState(data), 17);
    expect(before.fighters[first].active).toBe(0);
    const s = step(before, idle, data);
    const f = s.fighters[first];
    expect(f.active).toBe(1);
    expect(f.x).toBe(0 + W + stage.screen.spawnPad);
    expect(f.face).toBe(-c.side);
    expect(f.z).toBeGreaterThanOrEqual(stage.spawn.zMin * FP);
    expect(f.z).toBeLessThanOrEqual(stage.spawn.zMax * FP);
    expect(f.z % FP).toBe(0);
    expect(f.hp).toBe(data.fighters[c.fighter].hp);
    // the control: the second row's delay has not passed, so it stays dormant
    expect(data.cast[second].delayTicks).toBeGreaterThan(18);
    expect(s.fighters[second].active).toBe(0);
  });

  it("spawns from the LEFT edge when the side is -1", () => {
    const left = rowsOf(0).find((i) => data.cast[i].side === -1)!;
    const s = run(createState(data), data.cast[left].delayTicks);
    expect(s.fighters[left].active).toBe(1);
    expect(s.fighters[left].x).toBe(0 - stage.screen.spawnPad);
    expect(s.fighters[left].face).toBe(1);
  });

  it("draws the lane from the sim's rng, so the same seed spawns the same lane twice", () => {
    const a = run(createState(data), 18), b = run(createState(data), 18);
    expect(a.fighters[rowsOf(0)[0]].z).toBe(b.fighters[rowsOf(0)[0]].z);
    expect(a.rng).toBe(b.rng);
    expect(a.rng).not.toBe(run(createState(data), 17).rng);
  });

  it("a wave 1 row never wakes during wave 0, however long it runs", () => {
    const s = run(createState(data), 400);
    for (const i of rowsOf(1)) expect(s.fighters[i].active).toBe(0);
    for (const i of rowsOf(0)) expect(s.fighters[i].active).not.toBe(0);
  });
});

describe("a dormant row is inert at every site", () => {
  const attack = stateIndex(data.fighters[data.cast[HERO].fighter], "attack");
  const activeTick = (() => { const cf = data.fighters[data.cast[HERO].fighter]; for (let t = 0; t < 60; t++) if (frameAt(cf, attack, t).itr.length) return t; throw new Error("no itr"); })();
  const target = rowsOf(0)[0];
  /** the hero mid-swing with row `target` standing in the punch, awake or not */
  const swing = (active: 0 | 1): FightState => {
    let s = createState(data);
    const hero = s.fighters[HERO];
    const hit = frameAt(data.fighters[data.cast[HERO].fighter], attack, activeTick).itr[0];
    s = withFighter(s, HERO, { st: attack, stT: activeTick, face: 1 });
    s = awake(s, target, hero.x + hit.box.x + 2 * FP, hero.z, { active, face: -1 });
    return s;
  };

  it("lands no hit; the same row awake takes the punch", () => {
    expect(step(swing(0), idle, data).events.filter((e) => e.kind === "hit")).toEqual([]);
    expect(step(swing(1), idle, data).events.filter((e) => e.kind === "hit").length).toBe(1);
  });

  it("pushes nobody; the same row awake pushes the hero apart", () => {
    let s = createState(data);
    const hero = s.fighters[HERO];
    const dormantAtHero = awake(s, target, hero.x + 2 * FP, hero.z, { active: 0 });
    expect(step(dormantAtHero, idle, data).fighters[HERO].x).toBe(hero.x);
    const awakeAtHero = awake(s, target, hero.x + 2 * FP, hero.z, { active: 1 });
    expect(step(awakeAtHero, idle, data).fighters[HERO].x).not.toBe(hero.x);
  });

  it("takes no input: its ai state and position do not move over 17 ticks; an awake row walks", () => {
    const s0 = createState(data);
    const s = run(s0, 17);
    for (const i of rowsOf(0)) expect(s.fighters[i]).toEqual(s0.fighters[i]);
    const woke = awake(s0, target, 400 * FP, s0.fighters[HERO].z, { active: 1 });
    expect(run(woke, 17).fighters[target].x).not.toBe(400 * FP);
  });

  it("is not drawn: the plan holds one sprite per awake row", () => {
    const s0 = createState(data);
    expect(viewOf(s0, s0, 0, data).sprites.map((o) => o.who)).toEqual([HERO]);
    const s = run(s0, 18);
    expect(viewOf(s, s, 0, data).sprites.map((o) => o.who).sort()).toEqual([HERO, rowsOf(0)[0]].sort());
    expect(s.fighters.filter((f) => !dormant(f)).length).toBe(2);
  });
});

describe("the screen holds the fighters", () => {
  /** the wave's clock parked far back, so no spawn wakes to stand in the hero's way */
  const noSpawns = () => withStage(createState(data), { waveT: -100000 });

  it("the hero cannot walk off the right edge while the camera is locked", () => {
    const right: InputFrame[] = idle.map((f, i) => (i === HERO ? { mx: 1, mz: 0, attack: false } : f));
    // 120 -> 620 px at the robot's 1.6 px per tick is 313 ticks; 400 leaves it pressed on the pad
    const s = run(noSpawns(), 400, right);
    expect(st(s).camX).toBe(0);
    expect(s.fighters[HERO].x).toBe(W - stage.screen.heroPad);
  });

  it("nor off the left edge", () => {
    const left: InputFrame[] = idle.map((f, i) => (i === HERO ? { mx: -1, mz: 0, attack: false } : f));
    const s = run(noSpawns(), 300, left);
    expect(s.fighters[HERO].x).toBe(stage.screen.heroPad);
  });

  it("an enemy that has come inside is held inside (active 2); one still outside may sit in the outside pad", () => {
    let s = createState(data);
    const i = rowsOf(0)[0];
    s = awake(s, i, W + stage.screen.spawnPad, 260 * FP);
    const one = step(s, idle, data);
    expect(one.fighters[i].active).toBe(1);
    expect(one.fighters[i].x).toBeLessThanOrEqual(W + stage.screen.outsidePad);
    const inside = step(awake(s, i, W - 100 * FP, 260 * FP), idle, data);
    expect(inside.fighters[i].active).toBe(2);
    const pushedOut = step(awake(s, i, W - 100 * FP, 260 * FP, { active: 2, x: W + 40 * FP }), idle, data);
    expect(pushedOut.fighters[i].x).toBeLessThanOrEqual(W - stage.screen.enemyPad);
  });
});

/** wave `w`'s rows all awake and all dead */
function waveCleared(s: FightState, w: number): FightState {
  for (const i of rowsOf(w)) s = awake(s, i, (w * 640 + 300) * FP, 260 * FP, { hp: 0 });
  return s;
}

describe("the phases", () => {
  it("fight -> go only when the queue is spent AND nothing is alive", () => {
    const s = withStage(createState(data), { wave: 0, wphase: 0, waveT: 500 });
    expect(st(step(waveCleared(s, 0), idle, data)).wphase).toBe(1);
    // control 1: one row still dormant -> stays in fight
    const oneDormant = withFighter(waveCleared(s, 0), rowsOf(0)[3], { active: 0, hp: 20 });
    expect(st(step(withStage(oneDormant, { waveT: 5 }), idle, data)).wphase).toBe(0);
    // control 2: one row alive -> stays in fight
    const oneAlive = withFighter(waveCleared(s, 0), rowsOf(0)[3], { hp: 1 });
    expect(st(step(oneAlive, idle, data)).wphase).toBe(0);
  });

  it("go: the camera unlocks to the next screen, arrives exactly, and the next wave's fight begins", () => {
    let s = waveCleared(withStage(createState(data), { wave: 0, wphase: 0, waveT: 500 }), 0);
    s = withFighter(s, HERO, { x: (W - stage.screen.heroPad) });
    s = step(s, idle, data);
    expect(st(s).wphase).toBe(1);
    expect(s.events).toContainEqual({ kind: "wave", wave: 0, wphase: 1 });
    const right: InputFrame[] = idle.map((f, i) => (i === HERO ? { mx: 1, mz: 0, attack: false } : f));
    const cams: number[] = [];
    for (let t = 0; t < 400 && st(s).wave === 0; t++) { s = step(s, right, data); cams.push(st(s).camX); }
    expect(st(s)).toMatchObject({ wave: 1, wphase: 0, waveT: 0, camX: W });
    expect(s.events).toContainEqual({ kind: "wave", wave: 1, wphase: 0 });
    // the camera only ever moved forward and never past the next screen. It is bounded by the
    // hero, who must walk from the right pad to lead px past the next screen's left edge at
    // the robot's speed; measured 222 ticks here, so the bound below is the hero's walk plus
    // a second of camera lag, not a tuning number
    for (let i = 1; i < cams.length; i++) expect(cams[i]).toBeGreaterThanOrEqual(cams[i - 1]);
    expect(Math.max(...cams)).toBe(W);
    const heroWalk = Math.ceil((W + stage.camera.lead - (W - stage.screen.heroPad)) / data.fighters[data.cast[HERO].fighter].speed);
    expect(cams.length).toBeLessThan(heroWalk + 60);
    // the hero rode inside the screen the whole way
    expect(s.fighters[HERO].x).toBeLessThanOrEqual(2 * W - stage.screen.heroPad);
  });

  it("the camera never goes below the wave's own screen", () => {
    let s = withStage(createState(data), { wave: 1, camX: W });
    s = withFighter(s, HERO, { x: W + stage.screen.heroPad });
    const left: InputFrame[] = idle.map((f, i) => (i === HERO ? { mx: -1, mz: 0, attack: false } : f));
    s = run(s, 60, left);
    expect(st(s).camX).toBe(W);
    expect(s.fighters[HERO].x).toBe(W + stage.screen.heroPad);
  });

  it("the last wave cleared goes to clear, not go", () => {
    const last = stage.waves - 1;
    let s = withStage(createState(data), { wave: last, camX: last * W, waveT: 500 });
    s = withFighter(s, HERO, { x: last * W + 300 * FP });
    s = step(waveCleared(s, last), idle, data);
    expect(st(s).wphase).toBe(2);
    expect(s.events).toContainEqual({ kind: "wave", wave: last, wphase: 2 });
  });
});

describe("the hero going down restarts the wave and keeps what was earned", () => {
  it("fades for koFadeTicks, then this wave restarts: full hp at the wave's start, its rows dormant, coins/xp/level intact", () => {
    let s = withStage(createState(data), { wave: 1, camX: W, waveT: 200, coins: 7, xp: 5, level: 2 });
    s = withFighter(s, HERO, { x: W + 400 * FP, hp: 0, st: data.fighters[data.cast[HERO].fighter].ko });
    s = awake(s, rowsOf(1)[0], W + 300 * FP, 260 * FP);
    s = { ...s, pickups: [{ x: W + 200 * FP, z: 260 * FP, h: 0, vx: 0, vh: 0, age: 3 }] };
    s = step(s, idle, data);
    expect(st(s)).toMatchObject({ wphase: 3, waveT: 0, wave: 1 });
    expect(s.events).toContainEqual({ kind: "wave", wave: 1, wphase: 3 });
    s = run(s, data.match.koFadeTicks - 1);
    expect(st(s).wphase).toBe(3);
    s = step(s, idle, data);
    expect(st(s)).toEqual({ wave: 1, wphase: 0, waveT: 0, camX: W, coins: 7, xp: 5, level: 2 });
    const hero = s.fighters[HERO];
    expect(hero.hp).toBe(heroMaxHp(data, 2));
    expect(hero.hp).toBe(data.fighters[data.cast[HERO].fighter].hp + stage.levelUp.hp);
    expect(hero.x).toBe(data.cast[HERO].x + W);
    expect(hero.z).toBe(data.cast[HERO].z);
    for (const i of rowsOf(1)) expect(s.fighters[i].active).toBe(0);
    expect(s.pickups).toEqual([]);
    expect(s.events).toContainEqual({ kind: "wave", wave: 1, wphase: 0 });
  });

  it("does not touch the rows of the waves already cleared", () => {
    let s = withStage(createState(data), { wave: 1, camX: W });
    s = waveCleared(s, 0);
    s = withFighter(s, HERO, { hp: 0, st: data.fighters[data.cast[HERO].fighter].ko });
    s = run(s, data.match.koFadeTicks + 1);
    expect(st(s).wphase).toBe(0);
    for (const i of rowsOf(0)) expect(s.fighters[i]).toMatchObject({ active: 1, hp: 0 });
  });
});

describe("Versus is untouched by any of this", () => {
  it("runs with no stage block and no camera, and the golden test pins the rest", () => {
    const v = compileFight(loadMode("versus"));
    const s = step(createState(v), [NO_INPUT, NO_INPUT], v);
    expect(s.stage).toBeNull();
    expect(viewOf(s, s, 128, v).camX).toBe(0);
    expect(v.stage).toBeNull();
  });
});
