// Coins, XP and levels: what a stage pays for a KO. A KO drops one coin at
// the corpse and pays the fighter file's xp; the XP curve and the level-up
// bumps are the stage file's; a coin pops, bounces, slides to rest inside the
// screen, flies to the hero once the stage is clear, and is collected when
// the hero stands on it. Runs after tickStage; reads this tick's `ko` events
// rather than diffing hp, so a KO pays exactly once.

import { abs, clamp, floorDiv } from "./fixed";
import { rngRange } from "./rng";
import { heroIndex, heroMaxHp } from "./stage";
import type { CStage, FightData, FighterState, FightEvent, FightState, PickupState, StageState } from "./types";

/** the xp the NEXT level costs at `level` */
export function xpToNext(stage: CStage, level: number): number {
  return stage.xp.base + level * stage.xp.perLevel;
}

/** one coin launched from a corpse: up at launchVh, sideways by a draw in [-launchVx, launchVx] */
function launch(t: FighterState, stage: CStage, rng0: number): [number, PickupState] {
  const [rng, vx] = rngRange(rng0, -stage.coin.launchVx, stage.coin.launchVx);
  return [rng, { x: t.x, z: t.z, h: 0, vx, vh: stage.coin.launchVh, age: 0 }];
}

/** the KOs of this tick, on any row but the hero: a coin each, and the xp the file pays */
function payKos(s: FightState, data: FightData, stage: CStage, heroI: number): { pickups: PickupState[]; xp: number; rng: number } {
  const pickups = s.pickups.slice();
  let xp = 0, rng = s.rng;
  for (const e of s.events) {
    if (e.kind !== "ko" || e.target === heroI) continue;
    let coin: PickupState;
    [rng, coin] = launch(s.fighters[e.target], stage, rng);
    pickups.push(coin);
    xp += data.fighters[data.cast[e.target].fighter].xp;
  }
  return { pickups, xp, rng };
}

/**
 * spend xp on levels: each raises the max, heals up to it, and is announced. A hero
 * already down (the killing blow was a trade) keeps the level and stays down: healed
 * to 25 it stood back up mid-fade and the wave reset under it (deep-test 2026-09-12).
 */
function levelUp(st: StageState, hero: FighterState, data: FightData, stage: CStage, events: FightEvent[]): { st: StageState; hero: FighterState } {
  let { xp, level } = st;
  let hp = hero.hp;
  while (xp >= xpToNext(stage, level)) {
    xp -= xpToNext(stage, level);
    level += 1;
    if (hp > 0) hp = Math.min(heroMaxHp(data, level), hp + stage.levelUp.heal);
    events.push({ kind: "levelup", level });
  }
  return { st: { ...st, xp, level }, hero: hp === hero.hp ? hero : { ...hero, hp } };
}

/** gravity, the floor bounce, the slide, the screen's edges; then the magnet once the stage is clear */
function flyCoin(p: PickupState, st: StageState, hero: FighterState, data: FightData, stage: CStage): PickupState {
  let { x, z, h, vx, vh } = p;
  if (h > 0 || vh > 0) {
    vh -= stage.coin.gravity;
    h += vh;
    x += vx;
    if (h <= 0) {
      h = 0;
      vh = abs(vh) > stage.coin.bounceMinVh ? floorDiv(-vh * stage.coin.bounceKeep.num, stage.coin.bounceKeep.den) : 0;
      vx = floorDiv(vx * stage.coin.slideKeep.num, stage.coin.slideKeep.den);
    }
  }
  if (st.wphase === 2) {
    x += floorDiv(hero.x - x, stage.coin.magnetDivisor);
    z += floorDiv(hero.z - z, stage.coin.magnetDivisor);
  }
  x = clamp(x, st.camX + stage.screen.enemyPad, st.camX + data.arena.viewW - stage.screen.enemyPad);
  z = clamp(z, data.arena.zMin, data.arena.zMax);
  return { x, z, h, vx, vh, age: p.age + 1 };
}

/** a standing hero takes a coin inside the pickup box that is falling or at rest - never one still popping up from the corpse */
function withinReach(p: PickupState, hero: FighterState, stage: CStage): boolean {
  return hero.hp > 0 && p.vh <= 0 && abs(p.x - hero.x) <= stage.coin.pickupX && abs(p.z - hero.z) <= stage.coin.pickupZ && p.h <= stage.coin.pickupH;
}

/** after tickStage: pay this tick's KOs, level up, fly every coin, collect the ones the hero stands on */
export function tickPickups(s: FightState, data: FightData): FightState {
  const stage = data.stage;
  if (!stage || !s.stage) throw new Error("fight/pickups: tickPickups on a state or data with no stage");
  const events = [...s.events];
  const heroI = heroIndex(data);
  const paid = payKos(s, data, stage, heroI);
  const leveled = levelUp({ ...s.stage, xp: s.stage.xp + paid.xp }, s.fighters[heroI], data, stage, events);
  let st = leveled.st;
  const hero = leveled.hero;
  const kept: PickupState[] = [];
  for (const p of paid.pickups) {
    const flown = flyCoin(p, st, hero, data, stage);
    if (withinReach(flown, hero, stage)) {
      st = { ...st, coins: st.coins + 1 };
      events.push({ kind: "coin", x: flown.x, z: flown.z, coins: st.coins });
    } else {
      kept.push(flown);
    }
  }
  const fighters = hero === s.fighters[heroI] ? s.fighters : s.fighters.map((f, i) => (i === heroI ? hero : f));
  return { ...s, rng: paid.rng, stage: st, pickups: kept, fighters, events };
}
