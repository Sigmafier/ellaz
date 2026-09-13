// The slime and the bat on the crypt's real data, each isolated by putting
// the others out of the room: what wakes them, how they close, when they
// bite or swoop, and how ground foes keep apart.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { separate } from "./foes";
import { dist } from "./grid";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { NO_DUNGEON_INPUT, ST_ATTACK, ST_FLY, ST_GONE, ST_IDLE, ST_RETREAT, ST_SWOOP, ST_WALK, TILE } from "./types";
import type { DungeonState } from "./types";

const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const HERO = 0, SLIME1 = 1, SLIME3 = 3, BAT5 = 5, BAT6 = 6;
const sl = data.actors[1].slime!, bt = data.actors[2].bat!;

function run(s: DungeonState, ticks: number, watch?: (s: DungeonState) => void): DungeonState {
  for (let t = 0; t < ticks; t++) { s = stepDungeon(s, [NO_DUNGEON_INPUT], data); watch?.(s); }
  return s;
}
/** the room with only the named foes left in it */
function only(...keep: number[]): DungeonState {
  const s = createState(data);
  for (let i = 1; i < s.actors.length; i++) if (!keep.includes(i)) s.actors[i].state = ST_GONE;
  return s;
}
const gap = (s: DungeonState, i: number): number => dist(s.actors[i].x - s.actors[HERO].x, s.actors[i].y - s.actors[HERO].y);

describe("a slime", () => {
  it("outside aggro idles where it spawned", () => {
    const s0 = only(SLIME1);
    expect(gap(s0, SLIME1)).toBeGreaterThan(sl.aggro);
    const s = run(s0, 200);
    expect(s.actors[SLIME1].state).toBe(ST_IDLE);
    expect([s.actors[SLIME1].x, s.actors[SLIME1].y]).toEqual([s0.actors[SLIME1].x, s0.actors[SLIME1].y]);
  });

  it("inside aggro walks at the knight once the grace has passed, hopping: it moves on the airborne frames and holds on the others", () => {
    const s0 = only(SLIME3);
    expect(gap(s0, SLIME3)).toBeLessThan(sl.aggro);
    let s = run(s0, data.rules.aggroStartTicks - 1);
    expect(s.actors[SLIME3].state).toBe(ST_IDLE);
    s = run(s, 1);
    expect(s.actors[SLIME3].state).toBe(ST_WALK);
    const walk = data.actors[1].clips[1];
    let held = 0, moved = 0, prev = s;
    s = run(s, 60, (n) => {
      const a = n.actors[SLIME3], p = prev.actors[SLIME3];
      if (a.state === ST_WALK && p.state === ST_WALK) {
        const frame = Math.floor(p.stateT / walk.ticksPerFrame);
        const step = a.x !== p.x || a.y !== p.y;
        if (frame >= sl.hopFrom && frame <= sl.hopTo) { if (step) moved += 1; } else if (!step) held += 1;
      }
      prev = n;
    });
    expect(s.actors[SLIME3].state).toBe(ST_WALK);
    expect(moved).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
    expect(gap(s, SLIME3)).toBeLessThan(gap(s0, SLIME3));
  });

  it("bites within biteAt on cd 0 for dmg, on the strike frame, and then waits its cooldown", () => {
    const s0 = only(SLIME3);
    s0.actors[SLIME3].x = s0.actors[HERO].x + 200;
    s0.actors[SLIME3].y = s0.actors[HERO].y;
    s0.actors[SLIME3].cd = 0;
    s0.tick = data.rules.aggroStartTicks;
    let s = stepDungeon(s0, [NO_DUNGEON_INPUT], data);
    expect(s.actors[SLIME3].state).toBe(ST_ATTACK);
    const tpf = data.actors[1].clips[2].ticksPerFrame;
    s = run(s, sl.strikeFrame * tpf - 1);
    expect(s.actors[HERO].hp).toBe(100);
    s = run(s, 1);
    expect(s.actors[HERO].hp).toBe(100 - sl.dmg);
    expect(s.events.some((e) => e.kind === "hit" && e.attacker === SLIME3 && e.target === HERO)).toBe(true);
    expect(s.actors[SLIME3].cd).toBe(sl.cooldownTicks);
    // no second bite while the cooldown runs
    s = run(s, sl.cooldownTicks - 10);
    expect(s.actors[HERO].hp).toBe(100 - sl.dmg);
  });

  it("a bite that starts in range but misses the strike frame's reach lands nothing", () => {
    const s0 = only(SLIME3);
    s0.actors[SLIME3].x = s0.actors[HERO].x + 200;
    s0.actors[SLIME3].y = s0.actors[HERO].y;
    s0.actors[SLIME3].cd = 0;
    s0.tick = data.rules.aggroStartTicks;
    let s = stepDungeon(s0, [NO_DUNGEON_INPUT], data);
    // the knight steps AWAY before the strike frame (the slime is on his +x side; its lunge follows him a little)
    s.actors[HERO].x -= sl.biteReach;
    s = run(s, 40);
    expect(s.actors[HERO].hp).toBe(100);
  });
});

describe("a bat", () => {
  it("hovers where it spawned, at its hover height, while the knight is out of aggro", () => {
    const s0 = only(BAT5);
    expect(gap(s0, BAT5)).toBeGreaterThanOrEqual(bt.aggro);
    const s = run(s0, 300);
    expect(s.actors[BAT5].state).toBe(ST_FLY);
    expect([s.actors[BAT5].x, s.actors[BAT5].y, s.actors[BAT5].alt]).toEqual([s0.actors[BAT5].x, s0.actors[BAT5].y, data.actors[2].hover]);
  });

  it("aggroed, flies straight at the knight, swoops when its timer allows, bites, and retreats", () => {
    const s0 = only(BAT6);
    expect(gap(s0, BAT6)).toBeLessThan(bt.aggro);
    const seen = new Set<number>();
    let bit = false;
    const s = run(s0, 600, (n) => { seen.add(n.actors[BAT6].state); if (n.events.some((e) => e.kind === "hit" && e.attacker === BAT6)) bit = true; });
    expect(seen.has(ST_SWOOP)).toBe(true);
    expect(seen.has(ST_RETREAT)).toBe(true);
    expect(bit).toBe(true);
    expect(s.actors[HERO].hp).toBeLessThan(100);
    expect(s.actors[HERO].hp).toBeGreaterThanOrEqual(100 - 3 * bt.dmg);
  });

  it("closes the gap before its first swoop, slowing as it nears", () => {
    const s0 = only(BAT6);
    s0.actors[BAT6].swoopT = 10000;
    const s = run(s0, data.rules.aggroStartTicks + 90);
    expect(s.actors[BAT6].state).toBe(ST_FLY);
    expect(gap(s, BAT6)).toBeLessThan(gap(s0, BAT6));
    expect(gap(s, BAT6)).toBeGreaterThan(0);
  });

  it("never leaves the room: a bat thrown at the wall stops edgePad short of it", () => {
    const s0 = only(BAT6);
    s0.actors[BAT6].vx = -5000;
    s0.actors[BAT6].vy = -5000;
    const s = run(s0, 1);
    expect(s.actors[BAT6].x).toBe(bt.edgePad);
    expect(s.actors[BAT6].y).toBe(bt.edgePad);
  });
});

describe("separate", () => {
  it("pushes two slimes on one spot apart, and a slime off the knight's toes; a bat is left alone", () => {
    const s = only(SLIME1, SLIME3, BAT6);
    s.actors[SLIME3].x = s.actors[SLIME1].x + 1;
    s.actors[SLIME3].y = s.actors[SLIME1].y;
    const before = dist(s.actors[SLIME3].x - s.actors[SLIME1].x, s.actors[SLIME3].y - s.actors[SLIME1].y);
    separate(s, data);
    expect(dist(s.actors[SLIME3].x - s.actors[SLIME1].x, s.actors[SLIME3].y - s.actors[SLIME1].y)).toBeGreaterThan(before);
    const t = only(SLIME1, BAT6);
    t.actors[SLIME1].x = t.actors[HERO].x + 100;
    t.actors[SLIME1].y = t.actors[HERO].y;
    t.actors[BAT6].x = t.actors[HERO].x + 100;
    t.actors[BAT6].y = t.actors[HERO].y;
    separate(t, data);
    expect(t.actors[SLIME1].x).toBeGreaterThan(t.actors[HERO].x + 100);
    expect(t.actors[BAT6].x).toBe(t.actors[HERO].x + 100);
  });

  it("does nothing to two slimes farther apart than sepFoes", () => {
    const s = only(SLIME1, SLIME3);
    const a = { ...s.actors[SLIME1] }, b = { ...s.actors[SLIME3] };
    expect(dist(b.x - a.x, b.y - a.y)).toBeGreaterThan(data.rules.sepFoes);
    separate(s, data);
    expect([s.actors[SLIME1].x, s.actors[SLIME3].x]).toEqual([a.x, b.x]);
  });
});

describe("a fallen foe", () => {
  it("plays its ko clip, drops once, fades over fadeTicks, and is gone; a bat sinks to the floor", () => {
    const s0 = only(BAT6);
    const ko = data.actors[2].clips[4], total = ko.frames.length * ko.ticksPerFrame;
    s0.actors[BAT6].hp = 0; s0.actors[BAT6].state = 4; s0.actors[BAT6].stateT = 0;
    // the clip is done when the state clock reads `total`, which the cosmetics reach at the end of tick `total`; the fall reads it on tick total + 1
    let s = run(s0, total);
    expect(s.drops.length).toBe(0);
    s = run(s, 1);
    expect(s.drops.length).toBe(1);
    expect(s.actors[BAT6].dropped).toBe(1);
    expect(s.actors[BAT6].alt).toBeLessThan(data.actors[2].hover);
    s = run(s, data.rules.fadeTicks + 1);
    expect(s.actors[BAT6].state).toBe(ST_GONE);
    expect(s.drops.length).toBe(1);
    expect(s.actors[BAT6].alt).toBe(0);
  });
});

describe("TILE and the room", () => {
  it("the six foes begin where the room file puts them, in FP", () => {
    const s = createState(data);
    expect(s.actors.slice(1).map((a) => [a.x / TILE, a.y / TILE])).toEqual([[2.5, 3], [9.5, 6.5], [6.5, 10.5], [10.5, 9.5], [5.5, 2.5], [2.5, 8.5]]);
  });
});
