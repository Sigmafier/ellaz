// Coins, XP and levels against the real toybox quest: a KO drops exactly one
// coin at the corpse and pays the file's xp; a coin settles under gravity,
// flies to the hero only once the stage is clear, and is collected inside
// the pickup box and not one FP outside it; a level-up raises the max,
// heals up to it, and adds to the hero's damage and to nobody else's.

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { freshAi } from "./ai";
import { spawnFighter } from "./fighter";
import { createState } from "./match";
import { frameAt, stateIndex } from "./moves";
import { tickPickups, xpToNext } from "./pickups";
import { heroIndex, heroMaxHp } from "./stage";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FighterState, FightState, PickupState, StageState } from "./types";

const data = compileFight(loadMode("stage"));
const stage = data.stage!;
const HERO = heroIndex(data);
const heroCf = data.fighters[data.cast[HERO].fighter];
const idle = data.fighters.map(() => NO_INPUT);
const st = (s: FightState) => s.stage as StageState;
const withStage = (s: FightState, patch: Partial<StageState>): FightState => ({ ...s, stage: { ...st(s), ...patch } });
const withHero = (s: FightState, patch: Partial<FighterState>): FightState => {
  const fighters = s.fighters.slice(); fighters[HERO] = { ...fighters[HERO], ...patch }; return { ...s, fighters };
};
const run = (s: FightState, n: number) => { for (let i = 0; i < n; i++) s = step(s, idle, data); return s; };
/** a quiet stage: no spawn due, the hero parked away from every lane */
const quiet = () => withStage(withHero(createState(data), { x: 300 * FP, z: 260 * FP }), { waveT: -100000 });
const coin = (over: Partial<PickupState>): PickupState => ({ x: 300 * FP, z: 260 * FP, h: 0, vx: 0, vh: 0, age: 0, ...over });

/** the slime of wave 0 awake in front of the hero with `hp`, the hero mid-swing on its active frame */
function swingAt(hp: number): FightState {
  const attack = stateIndex(heroCf, "attack");
  let t = 0; while (!frameAt(heroCf, attack, t).itr.length) t++;
  const hit = frameAt(heroCf, attack, t).itr[0];
  let s = quiet();
  const hero = s.fighters[HERO];
  s = withHero(s, { st: attack, stT: t, face: 1 });
  const target = data.cast.findIndex((c) => c.wave === 0 && data.fighters[c.fighter].id === "slime");
  const fighters = s.fighters.slice();
  fighters[target] = { ...spawnFighter(data.fighters[data.cast[target].fighter], hero.x + hit.box.x + 2 * FP, hero.z, -1, freshAi(), 1), hp };
  return { ...s, fighters };
}

describe("a KO pays", () => {
  it("exactly one coin at the corpse, launched upward, and the file's xp", () => {
    const s = step(swingAt(1), idle, data);
    expect(s.events.filter((e) => e.kind === "ko").length).toBe(1);
    expect(s.pickups.length).toBe(1);
    const target = s.fighters.findIndex((f) => f.hp <= 0 && f.active !== 0);
    expect(target).toBeGreaterThan(0);
    expect(s.pickups[0]).toMatchObject({ z: s.fighters[target].z, vh: stage.coin.launchVh - stage.coin.gravity, age: 1 });
    expect(s.pickups[0].h).toBeGreaterThan(0);
    expect(st(s).xp).toBe(data.fighters[data.cast[target].fighter].xp);
  });

  it("a hit that does not kill pays nothing", () => {
    const s = step(swingAt(50), idle, data);
    expect(s.events.filter((e) => e.kind === "hit").length).toBe(1);
    expect(s.pickups).toEqual([]);
    expect(st(s).xp).toBe(0);
  });

  it("the hero's own KO pays nothing", () => {
    let s = withHero(quiet(), { hp: 0, st: heroCf.ko });
    s = { ...s, events: [{ kind: "ko", target: HERO }] };
    const out = tickPickups(s, data);
    expect(out.pickups).toEqual([]);
    expect(st(out).xp).toBe(0);
  });
});

describe("a coin in flight", () => {
  it("falls under gravity, bounces once above the threshold, and settles on the floor", () => {
    // away from the hero, so nothing collects it mid-flight
    let s = { ...quiet(), pickups: [coin({ x: 500 * FP, z: 320 * FP, vh: stage.coin.launchVh, vx: 0 })] };
    const hs: number[] = [];
    let bounces = 0;
    for (let t = 0; t < 240; t++) {
      const prev = s.pickups[0];
      s = step(s, idle, data);
      const p = s.pickups[0];
      hs.push(p.h);
      if (prev.h > 0 && p.h === 0 && p.vh > 0) bounces += 1;
    }
    // the pop: v^2 / 2g at the file's 170 px/s and 900 px/s^2 is 16 px; the integer sim lands at 14.6 (3751 FP), measured
    expect(Math.max(...hs)).toBeGreaterThan(12 * FP);
    expect(Math.max(...hs)).toBeLessThan(18 * FP);
    // the apex sits where the launch speed has been eaten by gravity, within a tick of the sample index
    expect(Math.abs(hs.indexOf(Math.max(...hs)) - Math.floor(stage.coin.launchVh / stage.coin.gravity))).toBeLessThanOrEqual(1);
    expect(bounces).toBeGreaterThanOrEqual(1);
    expect(s.pickups[0]).toMatchObject({ h: 0, vh: 0 });
    for (let t = 0; t < 240; t++) expect(hs[t] % 1).toBe(0);
  });

  it("stays inside the screen sideways", () => {
    let s = { ...quiet(), pickups: [coin({ x: 630 * FP, vh: stage.coin.launchVh, vx: 200 })] };
    s = run(s, 120);
    expect(s.pickups[0].x).toBeLessThanOrEqual(data.arena.viewW - stage.screen.enemyPad);
  });

  it("is pulled to the hero only in the clear phase", () => {
    const far = coin({ x: 500 * FP, z: 300 * FP });
    const fight = run({ ...quiet(), pickups: [far] }, 30);
    expect(fight.pickups[0]).toMatchObject({ x: 500 * FP, z: 300 * FP });
    const clear = run(withStage({ ...quiet(), pickups: [far] }, { wphase: 2 }), 120);
    expect(clear.pickups).toEqual([]);
    expect(st(clear).coins).toBe(1);
  });
});

describe("collecting", () => {
  const hero = () => quiet().fighters[HERO];

  it("takes a coin inside the pickup box and leaves one a single FP outside on each axis", () => {
    const h = hero();
    // a coin in the air falls by one gravity step inside the tick; the box is judged where it lands
    const g = stage.coin.gravity;
    const inside = tickPickups({ ...quiet(), pickups: [coin({ x: h.x + stage.coin.pickupX, z: h.z - stage.coin.pickupZ, h: stage.coin.pickupH + g })] }, data);
    expect(inside.pickups).toEqual([]);
    expect(st(inside).coins).toBe(1);
    expect(inside.events).toContainEqual({ kind: "coin", x: h.x + stage.coin.pickupX, z: h.z - stage.coin.pickupZ, coins: 1 });
    for (const over of [{ x: h.x + stage.coin.pickupX + 1 }, { z: h.z - stage.coin.pickupZ - 1 }, { h: stage.coin.pickupH + g + 1 }]) {
      const out = tickPickups({ ...quiet(), pickups: [coin({ x: h.x, z: h.z, h: 0, ...over })] }, data);
      // a resting coin does not move sideways, and the lifted one lands one FP too high: each miss is by exactly the FP planted
      expect(out.pickups.length).toBe(1);
      expect(st(out).coins).toBe(0);
    }
  });

  it("a coin still popping up is not taken; the same coin falling is", () => {
    const h = hero();
    const rising = tickPickups({ ...quiet(), pickups: [coin({ x: h.x, z: h.z, h: FP, vh: stage.coin.launchVh })] }, data);
    expect(rising.pickups.length).toBe(1);
    const falling = tickPickups({ ...quiet(), pickups: [coin({ x: h.x, z: h.z, h: FP, vh: -1 })] }, data);
    expect(falling.pickups.length).toBe(0);
  });

  it("a downed hero collects nothing", () => {
    const h = hero();
    const out = tickPickups(withHero({ ...quiet(), pickups: [coin({ x: h.x, z: h.z })] }, { hp: 0 }), data);
    expect(out.pickups.length).toBe(1);
  });
});

describe("levels", () => {
  it("cost base + level * perLevel, raise the max by levelHp, heal by levelHeal capped at the new max, and announce", () => {
    expect(xpToNext(stage, 1)).toBe(stage.xp.base + stage.xp.perLevel);
    let s = withHero(withStage(quiet(), { xp: xpToNext(stage, 1) - 1 }), { hp: 40 });
    s = { ...s, events: [] };
    expect(st(tickPickups(s, data)).level).toBe(1);
    const target = data.cast.findIndex((c) => c.wave === 0);
    const koed = { ...s, events: [{ kind: "ko" as const, target }] };
    const out = tickPickups(koed, data);
    expect(st(out).level).toBe(2);
    expect(st(out).xp).toBe(data.fighters[data.cast[target].fighter].xp - 1);
    expect(out.fighters[HERO].hp).toBe(40 + stage.levelUp.heal);
    expect(out.events).toContainEqual({ kind: "levelup", level: 2 });
    // the heal is capped at the new max
    const full = tickPickups(withHero(koed, { hp: heroCf.hp }), data);
    expect(full.fighters[HERO].hp).toBe(heroMaxHp(data, 2));
    expect(heroMaxHp(data, 2)).toBe(heroCf.hp + stage.levelUp.hp);
  });

  it("two levels in one payment when the xp allows it", () => {
    const need = xpToNext(stage, 1) + xpToNext(stage, 2);
    const s = withStage(quiet(), { xp: need - 5 });
    const target = data.cast.findIndex((c) => c.wave === 0);
    expect(data.fighters[data.cast[target].fighter].xp).toBeGreaterThanOrEqual(5);
    const out = tickPickups({ ...s, events: [{ kind: "ko", target }] }, data);
    expect(st(out).level).toBe(3);
    expect(out.events.filter((e) => e.kind === "levelup").map((e) => (e as { level: number }).level)).toEqual([2, 3]);
  });

  it("the hero's hits carry the level's damage bonus; an enemy's do not", () => {
    const base = step(swingAt(50), idle, data).events.find((e) => e.kind === "hit") as { damage: number };
    const lvl3 = step(withStage(swingAt(50), { level: 3 }), idle, data).events.find((e) => e.kind === "hit") as { damage: number };
    expect(lvl3.damage).toBe(base.damage + 2 * stage.levelUp.damage);
    // the same swing from the slime: its damage is its own file's, level or not
    const slimeCf = data.fighters.find((f) => f.id === "slime")!;
    const attack = stateIndex(slimeCf, "attack");
    let t = 0; while (!frameAt(slimeCf, attack, t).itr.length) t++;
    const hit = frameAt(slimeCf, attack, t).itr[0];
    let s = withStage(quiet(), { level: 3 });
    const hero = s.fighters[HERO];
    const target = data.cast.findIndex((c) => c.wave === 0 && data.fighters[c.fighter].id === "slime");
    const fighters = s.fighters.slice();
    fighters[target] = { ...spawnFighter(slimeCf, hero.x - hit.box.x - hit.box.w + 4 * FP, hero.z, 1, freshAi(), 1), st: attack, stT: t, face: 1, x: hero.x - hit.box.x - hit.box.w - 2 * FP + 4 * FP };
    s = { ...s, fighters };
    const out = step(s, idle, data);
    const landed = out.events.find((e) => e.kind === "hit") as { damage: number; attacker: number } | undefined;
    expect(landed?.attacker).toBe(target);
    expect(landed?.damage).toBe(hit.damage);
  });
});
