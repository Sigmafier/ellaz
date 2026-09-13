// The completability KPI: a scripted knight - click the nearest live foe,
// let the chase strike it, and once the room is clear click a threshold tile
// - clears the crypt and walks out inside 4,000 ticks on the real data, and
// prints the tick the door opened and the tick the room was won. No human,
// no tape: if the room's numbers make it unwinnable, this is where it shows.
// The control: a knight who never clicks or swings stands where he began
// and the room is lost.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { centre, dist, tileI, tileJ } from "./grid";
import { alive } from "./hits";
import { groundOf } from "./knight";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { ACT_INPUT_CLICK, NO_DUNGEON_INPUT, PHASE_DOOR, PHASE_LOST, PHASE_WON, ST_ATTACK } from "./types";
import type { DungeonData, DungeonInput, DungeonState } from "./types";

const BUDGET = 4000;
const HERO = 0;

/** click the nearest live foe when the knight is neither striking nor already after one; the door when none stands */
function policy(data: DungeonData): (s: DungeonState) => DungeonInput[] {
  return (s) => {
    const k = s.actors[HERO];
    if (k.state === ST_ATTACK) return [NO_DUNGEON_INPUT];
    let best = -1, bestD = 0;
    for (let i = 1; i < s.actors.length; i++) {
      if (!alive(s.actors[i])) continue;
      const d = dist(s.actors[i].x - k.x, s.actors[i].y - k.y);
      if (best < 0 || d < bestD) { best = i; bestD = d; }
    }
    if (best >= 0) {
      if (k.target === best) return [NO_DUNGEON_INPUT];
      const g = groundOf(s.actors[best], data.room);
      return [{ ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: g.x, y: g.y }];
    }
    if (s.phase === PHASE_DOOR && k.path.length === 0) {
      const door = data.room.door[1];
      return [{ ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: centre(tileI(data.room.n, door)), y: centre(tileJ(data.room.n, door)) }];
    }
    return [NO_DUNGEON_INPUT];
  };
}

describe("the crypt can be won", () => {
  const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));

  it("a scripted knight clears the six foes, the door opens, and he walks out within the budget", () => {
    const at = policy(data);
    let s = createState(data), doorAt = -1, wonAt = -1, coins = 0;
    for (let t = 0; t < BUDGET && wonAt < 0; t++) {
      s = stepDungeon(s, at(s), data);
      for (const e of s.events) {
        if (e.kind === "phase" && e.phase === PHASE_DOOR) doorAt = s.tick;
        if (e.kind === "phase" && e.phase === PHASE_WON) wonAt = s.tick;
        if (e.kind === "coin") coins += e.coins;
      }
      expect(s.phase).not.toBe(PHASE_LOST);
    }
    console.log(`room-completes: the crypt - DOOR at tick ${doorAt}, WON at tick ${wonAt}, ${coins} coins taken, knight hp ${s.actors[HERO].hp}`);
    expect(doorAt).toBeGreaterThan(0);
    expect(wonAt).toBeGreaterThan(doorAt);
    expect(s.phase).toBe(PHASE_WON);
    expect(s.actors.slice(1).every((a) => !alive(a))).toBe(true);
  });

  it("the control: a knight who never acts is bitten where he stands and the room is lost", () => {
    let s = createState(data), lostAt = -1;
    for (let t = 0; t < BUDGET && lostAt < 0; t++) {
      s = stepDungeon(s, [NO_DUNGEON_INPUT], data);
      if (s.phase === PHASE_LOST) lostAt = s.tick;
    }
    console.log(`room-completes: the control - LOST at tick ${lostAt}`);
    expect(lostAt).toBeGreaterThan(0);
    expect(s.phase).toBe(PHASE_LOST);
    expect(s.actors.slice(1).some((a) => alive(a))).toBe(true);
  });
});
