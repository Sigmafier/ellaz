// The one seam the campaign layer asks of the sim: createState(data, carry?)
// seeds a stage's purse (coins, xp, level) and the hero's hp from a carry,
// and WITHOUT one is byte-identical to the create every golden was recorded
// through. The identity is the claim that matters - it is what lets the six
// older goldens print unchanged - so it is asserted as a deep-equal over
// every stage mode on disk, and the population is pinned by name so a walk
// that finds nothing cannot pass over nothing. A tape may carry one too, and
// readTape refuses a carry a sim could not seed from.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GAMES, gameDir, loadMode, readModeKind } from "../data/load";
import { compileFight } from "./compile";
import { createState, spawnAll } from "./match";
import { seedRng } from "./rng";
import { heroIndex, heroMaxHp } from "./stage";
import { step } from "./step";
import { readTape } from "./tape";
import { NO_INPUT } from "./types";
import type { Carry, FightData, FightState } from "./types";

/**
 * The fresh state composed from the sim's own primitives, as match.ts built it before
 * a carry existed (2026-09-13). NOT `createState(data, undefined)` beside `createState(data)`:
 * those are one call twice, so a planted change to the carry-less path moves both sides
 * and the deep-equal stays green - measured, the first version of this cell survived
 * exactly that mutation. This composition does not share the path.
 */
function freshState(data: FightData): FightState {
  return {
    tick: 0, rng: seedRng(data.seed), phase: 1, phaseT: 0, freeze: 0, shake: 0, winner: -1,
    stage: data.stage ? { wave: 0, wphase: 0, waveT: 0, camX: 0, coins: 0, xp: 0, level: 1 } : null,
    pickups: [], fighters: spawnAll(data), events: [{ kind: "phase", phase: 1 }],
  };
}

/** every (game, mode) whose mode names a stage file - the same walk stage-completes makes */
function stageModes(): { game: string; mode: string }[] {
  const out: { game: string; mode: string }[] = [];
  for (const g of readdirSync(GAMES).sort()) {
    const modes = join(GAMES, g, "data", "modes");
    if (!existsSync(modes)) continue;
    for (const f of readdirSync(modes).filter((x) => x.endsWith(".json")).sort()) {
      const id = f.replace(/\.json$/, "");
      if (readModeKind(id, gameDir(g)) !== "fight") continue;
      if (loadMode(id, gameDir(g)).stage) out.push({ game: g, mode: id });
    }
  }
  return out;
}

const MODES = stageModes();
const FIGHT = gameDir("fight");

describe("createState without a carry", () => {
  it("walks the crypt's stage and the fight's six, so the identity below is asserted over something", () => {
    expect(MODES).toEqual([
      { game: "crypt", mode: "crypt" },
      { game: "fight", mode: "shelf-1" }, { game: "fight", mode: "shelf-2" }, { game: "fight", mode: "shelf-boss" },
      { game: "fight", mode: "stage" }, { game: "fight", mode: "toybox-2" }, { game: "fight", mode: "toybox-3" },
    ]);
  });

  for (const { game, mode } of MODES) {
    it(`${game}/${mode}: createState(data) and createState(data, undefined) are the fresh state composed by hand`, () => {
      const data = compileFight(loadMode(mode, gameDir(game)));
      expect(createState(data)).toEqual(freshState(data));
      expect(createState(data, undefined)).toEqual(freshState(data));
    });
  }

  it("and on Versus, which has no stage block, the same identity holds", () => {
    const data = compileFight(loadMode("versus", FIGHT));
    expect(createState(data)).toEqual(freshState(data));
    expect(createState(data, undefined)).toEqual(freshState(data));
  });
});

describe("createState with a carry", () => {
  const data = compileFight(loadMode("stage", FIGHT));
  const HERO = heroIndex(data);
  const carry: Carry = { coins: 7, xp: 25, level: 3 };

  it("seeds the stage block's purse from it and the hero's hp from its level", () => {
    const s = createState(data, carry);
    expect(s.stage).toEqual({ ...createState(data).stage, coins: 7, xp: 25, level: 3 });
    expect(s.fighters[HERO].hp).toBe(heroMaxHp(data, 3));
    expect(heroMaxHp(data, 3)).toBeGreaterThan(data.fighters[data.cast[HERO].fighter].hp);
  });

  it("control: a level-1 carry leaves the hero at the fighter file's hp, and every other row untouched", () => {
    const s = createState(data, { coins: 0, xp: 0, level: 1 });
    expect(s.fighters[HERO].hp).toBe(data.fighters[data.cast[HERO].fighter].hp);
    expect(s.fighters).toEqual(createState(data).fighters);
  });

  it("touches nothing but the purse and the hero's hp: the rng, the phase, the pickups and the events are the fresh create's", () => {
    const fresh = createState(data), carried = createState(data, carry);
    const { stage: _s1, fighters: _f1, ...restFresh } = fresh;
    const { stage: _s2, fighters: _f2, ...restCarried } = carried;
    expect(restCarried).toEqual(restFresh);
    const blankHero = (fs: typeof fresh.fighters) => fs.map((f, i) => (i === HERO ? { ...f, hp: 0 } : f));
    expect(blankHero(carried.fighters)).toEqual(blankHero(fresh.fighters));
  });

  it("edge: a level no xp could have reached still seeds - the hero at that level's hp, the machine stepping 600 ticks without a level lost or thrown", () => {
    let s = createState(data, { coins: 0, xp: 0, level: 9 });
    expect(s.fighters[HERO].hp).toBe(heroMaxHp(data, 9));
    for (let t = 0; t < 600; t++) s = step(s, data.fighters.map(() => NO_INPUT), data);
    expect(s.stage!.level).toBeGreaterThanOrEqual(9);
    expect(s.tick).toBe(600);
  });

  it("edge: the last foe and the hero down on one tick is a FADE, never a clear - the campaign's `until` (wphase 2) cannot fire on the tick the hero dies (stage.ts advancePhase reads the hero's hp before the wave's foes)", () => {
    const base = createState(data, carry);
    const lastWave = data.stage!.waves - 1;
    // every foe row awake and fallen, the queue spent; the hero down on the same tick
    const foes = base.fighters.map((f, i) => (i === HERO ? f : { ...f, active: 1 as const, hp: 0 }));
    const down = { ...base, stage: { ...base.stage!, wave: lastWave }, fighters: foes.map((f, i) => (i === HERO ? { ...f, hp: 0 } : f)) };
    const afterDown = step(down, data.fighters.map(() => NO_INPUT), data);
    expect(afterDown.stage!.wphase).toBe(3);
    // control: the hero standing, the same tick is the CLEAR
    const standing = { ...base, stage: { ...base.stage!, wave: lastWave }, fighters: foes };
    const afterStanding = step(standing, data.fighters.map(() => NO_INPUT), data);
    expect(afterStanding.stage!.wphase).toBe(2);
    // and the fade keeps the purse: the wave restarts with the carry's coins, xp and level
    expect(afterDown.stage!.coins).toBe(carry.coins);
    expect(afterDown.stage!.level).toBe(carry.level);
  });

  it("refuses a carry on a mode with no stage block, naming the hero it would have levelled", () => {
    const versus = compileFight(loadMode("versus", FIGHT));
    expect(() => createState(versus, carry)).toThrow(/carry.*no stage.*robot/);
  });
});

describe("a tape's carry", () => {
  const base = { mode: "stage", seed: 1, ticks: 10, frames: [[0, []]] };

  it("is accepted when absent, and when three non-negative integers with a level of at least 1", () => {
    expect(readTape(base).carry).toBeUndefined();
    expect(readTape({ ...base, carry: { coins: 0, xp: 0, level: 1 } }).carry).toEqual({ coins: 0, xp: 0, level: 1 });
    expect(readTape({ ...base, carry: { coins: 12, xp: 40, level: 4 } }).carry).toEqual({ coins: 12, xp: 40, level: 4 });
  });

  it.each([
    ["a float", { coins: 1.5, xp: 0, level: 1 }],
    ["a negative coin", { coins: -1, xp: 0, level: 1 }],
    ["level 0", { coins: 0, xp: 0, level: 0 }],
    ["a missing field", { coins: 0, level: 1 }],
    ["a string", "level 3"],
  ])("is refused when it carries %s", (_what, carry) => {
    expect(() => readTape({ ...base, carry })).toThrow(/carry/);
  });
});
