// Hits come from the moves file: an itr box on an attack frame against a bdy
// box, inside the z band, once per target per swing. Damage, stun and fall
// are the file's numbers; stagger / knockdown / ko are the match file's.

import { gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { applyHit, findHits } from "./hits";
import { spawnAll } from "./match";
import { frameAt, stateIndex } from "./moves";
import { FP } from "./types";
import type { FightState } from "./types";

const data = compileFight(loadMode("versus", gameDir("fight")));
const robot = data.fighters[data.cast[0].fighter];
const teddy = data.fighters[data.cast[1].fighter];
const attack = stateIndex(robot, "attack");
const activeTick = (() => { for (let t = 0; t < 60; t++) if (frameAt(robot, attack, t).itr.length) return t; throw new Error("robot attack has no itr"); })();

/** robot swinging at tick `activeTick`, teddy standing `gapPx` in front */
function scene(gapPx: number, dz = 0): FightState {
  const [r, t] = spawnAll(data);
  const rr = { ...r, st: attack, stT: activeTick, face: 1 as const };
  const hit = frameAt(robot, attack, activeTick).itr[0];
  const tt = { ...t, x: rr.x + hit.box.x + gapPx * FP, z: rr.z + dz * FP, face: -1 as const };
  return { tick: 0, rng: 0, phase: 1, phaseT: 0, freeze: 0, shake: 0, winner: -1, stage: null, pickups: [], fighters: [rr, tt], events: [] };
}

describe("hits", () => {
  it("an itr over a bdy in the z band lands once", () => {
    const s = scene(0);
    const landed = findHits(s, data.fighters, data.cast, data.match);
    expect(landed.map((l) => [l.attacker, l.target])).toEqual([[0, 1]]);
    expect(landed[0].hit.damage).toBe(10);
  });

  it("out of the z band, out of reach, invulnerable, or already hit: nothing lands", () => {
    expect(findHits(scene(0, data.match.hitZBand + 1), data.fighters, data.cast, data.match)).toEqual([]);
    expect(findHits(scene(400), data.fighters, data.cast, data.match)).toEqual([]);
    const inv = scene(0); inv.fighters[1] = { ...inv.fighters[1], inv: 5 };
    expect(findHits(inv, data.fighters, data.cast, data.match)).toEqual([]);
    const masked = scene(0); masked.fighters[0] = { ...masked.fighters[0], hitMask: 1 << 1 };
    expect(findHits(masked, data.fighters, data.cast, data.match)).toEqual([]);
  });

  it("applyHit takes the file's damage and stun and enters hurt, facing the attacker", () => {
    const s = scene(0);
    const hit = frameAt(robot, attack, activeTick).itr[0];
    const struck = applyHit(s.fighters[1], teddy, hit, 1, data.match);
    expect(struck.hp).toBe(s.fighters[1].hp - hit.damage);
    expect(struck.stun).toBe(hit.stun);
    expect(struck.st).toBe(teddy.hurt);
    expect(struck.face).toBe(-1);
    expect(struck.vx).toBe(hit.knockX);
    expect(struck.vh).toBe(-hit.knockY);
  });

  it("hitsToKnockdown hits inside the window knock down; hp at zero is a ko", () => {
    const s = scene(0);
    const hit = frameAt(robot, attack, activeTick).itr[0];
    let t = s.fighters[1];
    for (let i = 0; i < data.match.hitsToKnockdown - 1; i++) { t = applyHit(t, teddy, hit, 1, data.match); expect(t.st).toBe(teddy.hurt); }
    t = applyHit(t, teddy, hit, 1, data.match);
    expect(t.st).toBe(teddy.ko);
    expect(t.hp).toBeGreaterThan(0);
    const dying = { ...s.fighters[1], hp: hit.damage };
    expect(applyHit(dying, teddy, hit, 1, data.match).st).toBe(teddy.ko);
    expect(applyHit(dying, teddy, hit, 1, data.match).hp).toBe(0);
  });
});
