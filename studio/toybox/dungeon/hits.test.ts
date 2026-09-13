// The strike's geometry, the roll, the knockback and the fall, on the crypt's
// real numbers.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { alive, hurt, inCone, rollDamage, strike } from "./hits";
import { tickKnockback } from "./knight";
import { createState } from "./room";
import { FACE_DOWN, ST_GONE, ST_HURT, ST_IDLE, ST_KO, TILE } from "./types";
import type { DungeonState } from "./types";

const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const HERO = 0, SLIME3 = 3;
const kr = data.actors[0].knight!;

/** the knight alone facing down, with slime 3 alive at (dx, dy) from him */
function foeAt(dx: number, dy: number): DungeonState {
  const s = createState(data);
  for (let i = 1; i < s.actors.length; i++) s.actors[i].state = ST_GONE;
  s.actors[SLIME3].state = ST_IDLE;
  s.actors[HERO].face = FACE_DOWN;
  s.actors[SLIME3].x = s.actors[HERO].x + dx;
  s.actors[SLIME3].y = s.actors[HERO].y + dy;
  return s;
}

describe("the strike", () => {
  it("lands within reach in the cone: a foe down-right of a knight facing down", () => {
    const s = foeAt(200, 200);
    strike(s, data, HERO);
    expect(s.actors[SLIME3].hp).toBeLessThan(30);
    expect(s.events.filter((e) => e.kind === "hit").length).toBe(1);
  });

  it("misses a foe behind the knight, and one out of reach in front", () => {
    const behind = foeAt(-200, -200);
    strike(behind, data, HERO);
    expect(behind.actors[SLIME3].hp).toBe(30);
    const far = foeAt(300, 300);
    strike(far, data, HERO);
    expect(far.actors[SLIME3].hp).toBe(30);
  });

  it("lands point-blank whatever the side", () => {
    const s = foeAt(-30, 0);
    strike(s, data, HERO);
    expect(s.actors[SLIME3].hp).toBeLessThan(30);
  });

  it("inCone: straight ahead is in, straight behind is out, the edge sits at cone / 100", () => {
    expect(inCone(100, 100, 141, FACE_DOWN, kr.cone)).toBe(true);
    expect(inCone(-100, -100, 141, FACE_DOWN, kr.cone)).toBe(false);
    // dot with (1, 1) over d * sqrt 2: (100, -60) -> 40 / (117 * 1.414) = 0.24, just under 0.25
    expect(inCone(100, -60, 117, FACE_DOWN, kr.cone)).toBe(false);
    expect(inCone(100, -50, 112, FACE_DOWN, kr.cone)).toBe(true);
  });
});

describe("the roll", () => {
  it("stays in [dmgMin, dmgMax] over 200 draws, uses the whole range, and moves with the seed", () => {
    const s = createState(data);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const v = rollDamage(s, kr.dmgMin, kr.dmgMax);
      expect(v).toBeGreaterThanOrEqual(kr.dmgMin);
      expect(v).toBeLessThanOrEqual(kr.dmgMax);
      seen.add(v);
    }
    expect(seen.size).toBe(kr.dmgMax - kr.dmgMin + 1);
    const a = createState(data), b = createState(data);
    b.rng = 7;
    const ra = Array.from({ length: 20 }, () => rollDamage(a, kr.dmgMin, kr.dmgMax));
    const rb = Array.from({ length: 20 }, () => rollDamage(b, kr.dmgMin, kr.dmgMax));
    expect(ra).not.toEqual(rb);
    expect(a.rng).not.toBe(createState(data).rng);
  });
});

describe("a hit", () => {
  it("throws the body away from the hitter, and the throw decays to exactly 0 from either sign", () => {
    const s = foeAt(200, -100);
    hurt(s, data, HERO, SLIME3, 5, s.actors[HERO].x, s.actors[HERO].y);
    const a = s.actors[SLIME3];
    expect(a.vx).toBeGreaterThan(0);
    expect(a.vy).toBeLessThan(0);
    expect(a.state).toBe(ST_HURT);
    expect(a.since).toBe(0);
    expect(a.flash).toBe(data.rules.flashTicks);
    expect(s.floats.length).toBe(1);
    const x0 = a.x;
    for (let t = 0; t < 120; t++) tickKnockback(data, a, data.actors[1]);
    expect(a.vx).toBe(0);
    expect(a.vy).toBe(0);
    expect(a.x).toBeGreaterThan(x0);
  });

  it("at 0 hp the foe falls, a ko event fires once, and a fallen foe is never hurt again", () => {
    const s = foeAt(200, 200);
    hurt(s, data, HERO, SLIME3, 30, s.actors[HERO].x, s.actors[HERO].y);
    expect(s.actors[SLIME3].hp).toBe(0);
    expect(s.actors[SLIME3].state).toBe(ST_KO);
    expect(alive(s.actors[SLIME3])).toBe(false);
    expect(s.events.filter((e) => e.kind === "ko")).toEqual([{ kind: "ko", target: SLIME3 }]);
    const n = s.events.length;
    hurt(s, data, HERO, SLIME3, 30, s.actors[HERO].x, s.actors[HERO].y);
    expect(s.events.length).toBe(n);
    expect(s.actors[SLIME3].hp).toBe(0);
  });

  it("the knight has no hurt clip: a hit flashes and throws him and leaves his state alone", () => {
    const s = foeAt(200, 200);
    hurt(s, data, SLIME3, HERO, 4, s.actors[SLIME3].x, s.actors[SLIME3].y);
    expect(s.actors[HERO].hp).toBe(96);
    expect(s.actors[HERO].state).toBe(ST_IDLE);
    expect(s.actors[HERO].vx).toBeLessThan(0);
  });

  it("hp floors at 0 and a hit of more than the hp left still kills", () => {
    const s = foeAt(200, 200);
    s.actors[SLIME3].hp = 3;
    hurt(s, data, HERO, SLIME3, 15, s.actors[HERO].x, s.actors[HERO].y);
    expect(s.actors[SLIME3].hp).toBe(0);
  });
});

describe("edge: a swing on the tick a foe dies", () => {
  it("a foe felled mid-bite never lands the bite, and a strike on a body that just fell hits nothing", () => {
    const s = foeAt(200, 0);
    const slime = s.actors[SLIME3];
    slime.state = 2; slime.stateT = 14; slime.struck = 0; slime.hp = 1; // the bite lands next tick
    // the knight's strike this tick fells it first
    strike(s, data, HERO);
    expect(slime.hp).toBe(0);
    expect(slime.state).toBe(ST_KO);
    const n = s.events.length;
    strike(s, data, HERO);
    expect(s.events.length).toBe(n);
    expect(s.actors[HERO].hp).toBe(100);
  });
});

describe("TILE", () => {
  it("is the fight's FP, 256, so one tile is one fight px times 256", () => {
    expect(TILE).toBe(256);
  });
});
