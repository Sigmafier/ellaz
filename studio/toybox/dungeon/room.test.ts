// The room's own rules on the crypt's real data: a body's coins land beyond
// it and never in a prop, the knight takes a coin within reach and not one FP
// past it, the last fall opens the door, the threshold wins, 0 hp loses, and
// a restart is the room again from any phase.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { centre, dist, isBlocked, tileOf } from "./grid";
import { hurt } from "./hits";
import { anyFoeAlive, createState } from "./room";
import { stepDungeon } from "./step";
import { ACT_INPUT_RESTART, BANNER_DEFEAT, BANNER_DOOR, BANNER_VICTORY, NO_DUNGEON_INPUT, PHASE_DOOR, PHASE_FIGHT, PHASE_LOST, PHASE_WON, ST_GONE, ST_IDLE } from "./types";
import type { DungeonState } from "./types";

const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const HERO = 0, SLIME3 = 3;
const koTotal = data.actors[1].clips[4].frames.length * data.actors[1].clips[4].ticksPerFrame;

function run(s: DungeonState, ticks: number): DungeonState {
  for (let t = 0; t < ticks; t++) s = stepDungeon(s, [NO_DUNGEON_INPUT], data);
  return s;
}
function only(...keep: number[]): DungeonState {
  const s = createState(data);
  for (let i = 1; i < s.actors.length; i++) if (!keep.includes(i)) s.actors[i].state = ST_GONE;
  return s;
}

describe("coins", () => {
  it("a fallen foe drops exactly one coin pile, beyond its body away from the knight, worth its coins", () => {
    const s0 = only(SLIME3);
    const k = s0.actors[HERO], f = s0.actors[SLIME3];
    hurt(s0, data, HERO, SLIME3, 30, k.x, k.y);
    let s = run(s0, koTotal + 1);
    expect(s.drops.length).toBe(1);
    const d = s.drops[0];
    expect(d.value).toBe(3);
    expect(dist(d.x - k.x, d.y - k.y)).toBeGreaterThan(dist(f.x - k.x, f.y - k.y));
    s = run(s, 100);
    expect(s.drops.length).toBe(1);
  });

  it("never lands inside a prop: a body against the pillar drops its coins on the open side", () => {
    const s0 = only(SLIME3);
    // the slime just below the pillar at (3, 7), the knight farther below: away from him is into the pillar
    s0.actors[SLIME3].x = centre(3); s0.actors[SLIME3].y = 8 * 256 + 60;
    s0.actors[HERO].x = centre(3); s0.actors[HERO].y = centre(10);
    hurt(s0, data, HERO, SLIME3, 30, s0.actors[HERO].x, s0.actors[HERO].y);
    const s = run(s0, koTotal + 1);
    expect(s.drops.length).toBe(1);
    expect(isBlocked(data.room, tileOf(s.drops[0].x), tileOf(s.drops[0].y))).toBe(false);
  });

  it("the knight takes a coin within pickup once it has lain pickupDelayTicks, and not one FP past pickup", () => {
    const near = only();
    near.drops.push({ x: near.actors[HERO].x + data.rules.pickup - 1, y: near.actors[HERO].y, value: 3, t: data.rules.pickupDelayTicks });
    let s = run(near, 1);
    expect(s.coins).toBe(3);
    expect(s.drops).toEqual([]);
    expect(s.events.filter((e) => e.kind === "coin")).toEqual([{ kind: "coin", x: near.drops[0].x, z: near.drops[0].y, coins: 3 }]);
    const far = only();
    far.drops.push({ x: far.actors[HERO].x + data.rules.pickup, y: far.actors[HERO].y, value: 3, t: data.rules.pickupDelayTicks });
    s = run(far, 1);
    expect(s.coins).toBe(0);
    expect(s.drops.length).toBe(1);
    const fresh = only();
    fresh.drops.push({ x: fresh.actors[HERO].x, y: fresh.actors[HERO].y, value: 3, t: 0 });
    s = run(fresh, data.rules.pickupDelayTicks);
    expect(s.coins).toBe(0);
    s = run(s, 1);
    expect(s.coins).toBe(3);
  });
});

describe("the phases", () => {
  it("the last fall opens the door: the banner shows for doorBannerTicks, and one foe standing keeps the fight", () => {
    const two = only(SLIME3, 4);
    hurt(two, data, HERO, SLIME3, 30, two.actors[HERO].x, two.actors[HERO].y);
    let s = run(two, 1);
    expect(s.phase).toBe(PHASE_FIGHT);
    expect(anyFoeAlive(s)).toBe(true);
    const one = only(SLIME3);
    hurt(one, data, HERO, SLIME3, 30, one.actors[HERO].x, one.actors[HERO].y);
    s = run(one, 1);
    expect(s.phase).toBe(PHASE_DOOR);
    expect(s.banner).toBe(BANNER_DOOR);
    expect(s.events.some((e) => e.kind === "phase" && e.phase === PHASE_DOOR)).toBe(true);
    s = run(s, data.rules.doorBannerTicks);
    expect(s.bannerT).toBe(0);
    expect(s.phase).toBe(PHASE_DOOR);
  });

  it("the knight on a threshold tile wins once the door is open, and not while a foe stands", () => {
    const open = only();
    open.phase = PHASE_DOOR;
    open.actors[HERO].x = centre(6); open.actors[HERO].y = centre(0);
    let s = run(open, 1);
    expect(s.phase).toBe(PHASE_WON);
    expect(s.banner).toBe(BANNER_VICTORY);
    const shut = only(SLIME3);
    shut.actors[HERO].x = centre(6); shut.actors[HERO].y = centre(0);
    s = run(shut, 1);
    expect(s.phase).toBe(PHASE_FIGHT);
  });

  it("the knight's hp at 0 loses the room, from the fight or with the door open", () => {
    const s0 = only(SLIME3);
    hurt(s0, data, SLIME3, HERO, 100, s0.actors[SLIME3].x, s0.actors[SLIME3].y);
    let s = run(s0, 1);
    expect(s.phase).toBe(PHASE_LOST);
    expect(s.banner).toBe(BANNER_DEFEAT);
    const d0 = only();
    d0.phase = PHASE_DOOR;
    hurt(d0, data, 1, HERO, 100, d0.actors[HERO].x + 100, d0.actors[HERO].y);
    s = run(d0, 1);
    expect(s.phase).toBe(PHASE_LOST);
  });

  it("once won or lost only the cosmetics move: the actors stay, the events stop", () => {
    const s0 = only();
    s0.phase = PHASE_WON;
    const s = run(s0, 30);
    expect(s.actors[HERO].x).toBe(s0.actors[HERO].x);
    expect(s.actors[HERO].stateT).toBe(30);
    expect(s.events).toEqual([]);
  });

  it("a restart from any phase is the room again, with the tick kept", () => {
    for (const phase of [PHASE_FIGHT, PHASE_DOOR, PHASE_WON, PHASE_LOST]) {
      const s0 = run(createState(data), 50);
      s0.phase = phase; s0.coins = 9;
      const s = stepDungeon(s0, [{ ...NO_DUNGEON_INPUT, act: ACT_INPUT_RESTART }], data);
      expect(s).toEqual({ ...createState(data), tick: 51 });
      expect(s.actors[SLIME3].state).toBe(ST_IDLE);
    }
  });
});
