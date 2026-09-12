// A KO'd enemy stays where it fell and leaves on a timer. Before this file
// (2026-09-12, the operator's first Stage play) holdToScreen clamped every
// woken fighter, hp 0 included, so a body slid along with the camera, and
// nothing ever removed one: a finished ko clip held its frame forever.
//
// The timer needs no new hashed field: a held ko clip's stT keeps counting
// past the clip's end, and stage.corpseTicks later the row goes `active 3` -
// gone - which dormant() treats like 0 (not drawn, not hit, pushes nobody)
// while spawnDue and the wave phase treat it as spent, not as not-yet.

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { freshAi } from "./ai";
import { dormant, spawnFighter } from "./fighter";
import { createState } from "./match";
import { stateIndex } from "./moves";
import { heroIndex } from "./stage";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FighterState, FightState, StageState } from "./types";
import { viewOf } from "./view";

const data = compileFight(loadMode("stage"));
const stage = data.stage!;
const HERO = heroIndex(data);
const idle = data.fighters.map(() => NO_INPUT);
const run = (s: FightState, n: number) => { for (let i = 0; i < n; i++) s = step(s, idle, data); return s; };
const rowsOf = (wave: number) => data.cast.map((c, i) => (c.wave === wave ? i : -1)).filter((i) => i >= 0);
const st = (s: FightState) => s.stage as StageState;

/** row i awake at (x, z) view px; `patch` on top */
function awake(s: FightState, i: number, x: number, z: number, patch: Partial<FighterState> = {}): FightState {
  const fighters = s.fighters.slice();
  fighters[i] = { ...spawnFighter(data.fighters[data.cast[i].fighter], x * FP, z * FP, data.cast[i].face, freshAi(), 2), ...patch };
  return { ...s, fighters };
}

/** row i as a corpse whose ko clip has just finished */
function corpse(s: FightState, i: number, x: number, z: number, extra: Partial<FighterState> = {}): FightState {
  const cf = data.fighters[data.cast[i].fighter];
  const ko = stateIndex(cf, "ko");
  const total = cf.states[ko].total;
  return awake(s, i, x, z, { hp: 0, st: ko, stT: total, frame: cf.states[ko].frames.length - 1, ai: null, ...extra });
}

/** all of wave 0's rows parked so nothing else spawns during a test */
function parked(): FightState {
  const s = createState(data);
  return { ...s, stage: { ...st(s), waveT: -100000 } };
}

const drawnWho = (s: FightState) => viewOf(s, s, 255, data).sprites.map((o) => o.who);

describe("a corpse and the screen", () => {
  it("is left where it fell while the camera clamps a living enemy at the same spot - the control", () => {
    // both past the screen's right edge (camX 0, screen 640 wide) but inside the arena, in different lanes so push-apart is not in the picture
    const [a, b] = rowsOf(0);
    const s0 = corpse(awake(parked(), b, 700, 300), a, 700, 260);
    const s = step(s0, idle, data);
    expect(s.fighters[a].hp).toBeLessThanOrEqual(0);
    expect(s.fighters[a].x).toBe(700 * FP);
    // the living one is pulled inside the screen's enemy pad after one tick
    expect(s.fighters[b].x).toBe(data.arena.viewW - stage.screen.enemyPad);
  });
});

describe("a corpse and the clock", () => {
  it("counts stT past the ko clip's end, is drawn until corpseTicks have passed, then goes active 3 and vanishes - not one tick early", () => {
    const [a] = rowsOf(0);
    const cf = data.fighters[data.cast[a].fighter];
    const total = cf.states[stateIndex(cf, "ko")].total;
    expect(stage.corpseTicks).toBeGreaterThan(0);
    const s0 = corpse(parked(), a, 300, 260);
    const early = run(s0, stage.corpseTicks - 1);
    expect(early.fighters[a].active).toBe(2);
    expect(early.fighters[a].stT).toBe(total + stage.corpseTicks - 1);
    expect(early.fighters[a].frame).toBe(cf.states[stateIndex(cf, "ko")].frames.length - 1);
    expect(drawnWho(early)).toContain(a);
    const gone = step(early, idle, data);
    expect(gone.fighters[a].active).toBe(3);
    expect(dormant(gone.fighters[a])).toBe(true);
    expect(drawnWho(gone)).not.toContain(a);
    // and it stays gone: nothing respawns it while its delay is long past
    const later = run({ ...gone, stage: { ...st(gone), waveT: 100000 } }, 5);
    expect(later.fighters[a].active).toBe(3);
  });

  it("a LIVING fighter knocked into the same ko clip never counts past it: it lies for downTicks and stands up (the control for the counting rule)", () => {
    const [a] = rowsOf(0);
    const cf = data.fighters[data.cast[a].fighter];
    const ko = stateIndex(cf, "ko");
    const total = cf.states[ko].total;
    let s = corpse(parked(), a, 300, 260, { hp: 5, stT: total - 1, frame: 0 });
    let maxStT = 0, stoodUp = false;
    for (let t = 0; t < data.match.downTicks + 20; t++) {
      s = step(s, idle, data);
      const f = s.fighters[a];
      if (f.st === ko) maxStT = Math.max(maxStT, f.stT);
      if (f.st !== ko) stoodUp = true;
    }
    expect(maxStT).toBe(total);
    expect(stoodUp).toBe(true);
    expect(s.fighters[a].active).toBe(2);
  });
});

describe("a corpse and the wave", () => {
  it("a wave whose every row is a corpse still turns fight -> go once they have gone (gone is spent, not not-yet)", () => {
    let s = parked();
    for (const i of rowsOf(0)) s = corpse(s, i, 300 + i * 20, 260);
    s = { ...s, stage: { ...st(s), waveT: 100000 } };
    expect(st(s).wphase).toBe(0);
    const after = run(s, stage.corpseTicks + 2);
    expect(rowsOf(0).map((i) => after.fighters[i].active)).toEqual(rowsOf(0).map(() => 3));
    expect(st(after).wphase).toBe(1);
  });

  it("the hero never despawns: a downed hero fades and the wave restarts instead", () => {
    const s0 = corpse(parked(), HERO, 100, 260);
    const s = run(s0, data.match.koFadeTicks + stage.corpseTicks + 5);
    expect(s.fighters[HERO].active).toBe(1);
    expect(s.fighters[HERO].hp).toBeGreaterThan(0);
  });
});
