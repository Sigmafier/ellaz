// The wave machine of a stage mode, replacing tickMatch for the modes that
// name a stage file: wake the spawns whose delay has passed, follow the hero
// with the camera, hold everyone inside the screen, advance fight -> go ->
// clear, and restart the wave when the hero is down. Every number is from
// the stage file the mode names; every draw is from the sim's own rng.
//
// The roster is FIXED: every enemy of every wave is a cast row from tick 0,
// dormant (active 0) until its wave and delay, and a wave restart puts its
// rows back to dormant rather than removing anything. That is what keeps
// the hash over a fixed field list and the hit mask over a fixed bit per row.

import { freshAi } from "./ai";
import { spawnFighter } from "./fighter";
import { abs, clamp, floorDiv, toFP } from "./fixed";
import { rngRange } from "./rng";
import type { CStage, FightData, FighterState, FightEvent, FightState, StageState, WavePhase } from "./types";

/** the first player-controlled roster row: the one the camera follows and the waves are fought by */
export function heroIndex(data: FightData): number {
  const i = data.cast.findIndex((c) => c.control === "player");
  if (i < 0) throw new Error("fight/stage: the cast has no player-controlled row");
  return i;
}

/** a hero's max hp grows with its level; a Versus fighter (no stage) is at its file's hp */
export function heroMaxHp(data: FightData, level: number): number {
  const cf = data.fighters[data.cast[heroIndex(data)].fighter];
  return data.stage ? cf.hp + (level - 1) * data.stage.levelUp.hp : cf.hp;
}

/** a wave's rows: the roster rows that spawn in it */
function rowsOfWave(data: FightData, wave: number): number[] {
  return data.cast.map((c, i) => (c.wave === wave ? i : -1)).filter((i) => i >= 0);
}

/** wake every row of the current wave whose delay has passed: at the screen's edge, in a random lane, facing in */
function spawnDue(s: FightState, data: FightData, stage: CStage): FightState {
  const st = s.stage as StageState;
  let rng = s.rng;
  const fighters = s.fighters.slice();
  for (const i of rowsOfWave(data, st.wave)) {
    const c = data.cast[i];
    if (fighters[i].active !== 0 || st.waveT < c.delayTicks) continue;
    const x = c.side > 0 ? st.camX + data.arena.viewW + stage.screen.spawnPad : st.camX - stage.screen.spawnPad;
    let zPx: number;
    [rng, zPx] = rngRange(rng, stage.spawn.zMin, stage.spawn.zMax);
    fighters[i] = spawnFighter(data.fighters[c.fighter], x, toFP(zPx), c.face, freshAi(), 1);
  }
  return { ...s, rng, fighters };
}

/** the camera wants the hero `lead` px in from its left edge, inside the bounds the phase allows, and closes 1/divisor of the gap each tick */
function followCamera(s: FightState, data: FightData, stage: CStage, hero: FighterState): StageState {
  const st = s.stage as StageState;
  const lo = st.wave * data.arena.viewW;
  const hi = st.wphase === 1 ? lo + data.arena.viewW : lo;
  const want = clamp(hero.x - stage.camera.lead, lo, hi);
  const gap = want - st.camX;
  const camX = abs(gap) <= stage.camera.snap ? want : st.camX + floorDiv(gap, stage.camera.divisor);
  return { ...st, camX };
}

/** the hero never leaves the screen; an enemy that has come in (active 2) never leaves it either, and one still walking in stays near it */
function holdToScreen(s: FightState, data: FightData, stage: CStage, heroI: number): FighterState[] {
  const camX = (s.stage as StageState).camX;
  const right = camX + data.arena.viewW;
  return s.fighters.map((f, i) => {
    if (i === heroI) return { ...f, x: clamp(f.x, camX + stage.screen.heroPad, right - stage.screen.heroPad) };
    if (f.active === 0) return f;
    const inside = f.x > camX + stage.screen.enemyPad && f.x < right - stage.screen.enemyPad;
    const active = f.active === 2 || inside ? 2 : 1;
    const x = active === 2
      ? clamp(f.x, camX + stage.screen.enemyPad, right - stage.screen.enemyPad)
      : clamp(f.x, camX - stage.screen.outsidePad, right + stage.screen.outsidePad);
    return x === f.x && active === f.active ? f : { ...f, x, active };
  });
}

function toWavePhase(st: StageState, wphase: WavePhase, events: FightEvent[], wave = st.wave): StageState {
  events.push({ kind: "wave", wave, wphase });
  return { ...st, wave, wphase, waveT: 0 };
}

/** the hero back at full hp at this wave's start, this wave's enemies dormant again, the coins on the floor gone; coins, xp and level KEPT */
function restartWave(s: FightState, data: FightData, heroI: number, events: FightEvent[]): FightState {
  const st = s.stage as StageState;
  const camX = st.wave * data.arena.viewW;
  const fighters = s.fighters.slice();
  const c = data.cast[heroI];
  fighters[heroI] = { ...spawnFighter(data.fighters[c.fighter], c.x + camX, c.z, c.face, null, 1), hp: heroMaxHp(data, st.level) };
  for (const i of rowsOfWave(data, st.wave)) {
    const r = data.cast[i];
    fighters[i] = spawnFighter(data.fighters[r.fighter], r.x, r.z, r.face, freshAi(), 0);
  }
  return { ...s, fighters, pickups: [], freeze: 0, shake: 0, stage: toWavePhase({ ...st, camX }, 0, events) };
}

/** fight -> go when the wave's queue is spent and nothing of it is alive; go -> the next wave's fight once the camera arrives; the last wave -> clear; the hero down -> fade -> restart */
function advancePhase(s: FightState, data: FightData, heroI: number, events: FightEvent[]): FightState {
  const st = s.stage as StageState;
  const hero = s.fighters[heroI];
  if (st.wphase === 3) return st.waveT >= data.match.koFadeTicks ? restartWave(s, data, heroI, events) : s;
  if (hero.hp <= 0) return { ...s, stage: toWavePhase(st, 3, events) };
  if (st.wphase === 0) {
    const rows = rowsOfWave(data, st.wave).map((i) => s.fighters[i]);
    const spent = rows.every((f) => f.active !== 0);
    const alive = rows.some((f) => f.active !== 0 && f.hp > 0);
    if (!spent || alive) return s;
    return { ...s, stage: toWavePhase(st, st.wave === (data.stage as CStage).waves - 1 ? 2 : 1, events) };
  }
  if (st.wphase === 1 && st.camX >= (st.wave + 1) * data.arena.viewW) return { ...s, stage: toWavePhase(st, 0, events, st.wave + 1) };
  return s;
}

/** after the fighters have ticked: spawn, camera, the screen, the phase */
export function tickStage(s: FightState, data: FightData): FightState {
  const stage = data.stage;
  if (!stage || !s.stage) throw new Error("fight/stage: tickStage on a state or data with no stage");
  const events = [...s.events];
  const heroI = heroIndex(data);
  let next: FightState = { ...s, stage: { ...s.stage, waveT: s.stage.waveT + 1 } };
  next = spawnDue(next, data, stage);
  next = { ...next, stage: followCamera(next, data, stage, next.fighters[heroI]) };
  next = { ...next, fighters: holdToScreen(next, data, stage, heroI) };
  next = advancePhase(next, data, heroI, events);
  return { ...next, events };
}
