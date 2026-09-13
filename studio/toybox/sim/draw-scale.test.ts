// A boss drawn big is HIT big: a fighter file's `drawScale` multiplies its
// picture (the view's sprite `size`) and its body and strike boxes by the same
// whole number, so a punch lands where the boss is drawn. Its knockback and
// impulses do not grow - a big boss is struck where it stands, not flung
// further. Without the key a fighter compiles exactly as before, which is why
// no golden moved when the key arrived (2026-09-13).

import { gameDir, loadMode } from "../data/load";
import { compileFight, MAX_DRAW_SCALE } from "./compile";
import type { CompileInput } from "./compile";
import type { FightData } from "./types";
import { createState } from "./match";
import { viewOf } from "./view";

const base = (): CompileInput => loadMode("stage", gameDir("fight"));

/** the stage mode with the teddy-boss file asking for `size` */
function withSize(size: number | undefined): FightData {
  const loaded = base();
  loaded.fighters = loaded.fighters.map((f) => (f.id === "teddy-boss" ? { ...f, drawScale: size, boss: true } : f));
  return compileFight(loaded);
}

const teddy = (d: FightData) => d.fighters.find((f) => f.id === "teddy-boss")!;
const firstBody = (d: FightData) => teddy(d).states.flatMap((s) => s.frames).find((fr) => fr.bdy.length > 0)!.bdy[0];
const firstStrike = (d: FightData) => teddy(d).states.flatMap((s) => s.frames).find((fr) => fr.itr.length > 0)!.itr[0];

describe("a fighter drawn big", () => {
  it("control: without the key the fighter compiles to size 1 with the boxes it always had", () => {
    expect(teddy(withSize(undefined)).size).toBe(1);
    expect(firstBody(withSize(undefined))).toEqual(firstBody(compileFight(base())));
  });

  it("drawScale 2 doubles its body and strike boxes (within one FP of floor rounding)", () => {
    const one = withSize(undefined), two = withSize(2);
    expect(Math.abs(firstBody(two).w - 2 * firstBody(one).w)).toBeLessThanOrEqual(1);
    expect(Math.abs(firstBody(two).h - 2 * firstBody(one).h)).toBeLessThanOrEqual(1);
    expect(Math.abs(firstStrike(two).box.w - 2 * firstStrike(one).box.w)).toBeLessThanOrEqual(1);
  });

  it("its knockback does not grow", () => {
    expect(firstStrike(withSize(2)).knockX).toBe(firstStrike(withSize(undefined)).knockX);
    expect(firstStrike(withSize(2)).knockY).toBe(firstStrike(withSize(undefined)).knockY);
  });

  it("a size outside 1..MAX is refused naming the fighter", () => {
    expect(() => withSize(MAX_DRAW_SCALE + 1)).toThrow(/teddy-boss.*outside 1\.\.4/);
    expect(() => withSize(0)).toThrow(/teddy-boss/);
  });

  it("the view draws a big fighter's sprite with its size, and the boss bar only while a boss is awake", () => {
    const d = withSize(2);
    const s = createState(d);
    const plan = viewOf(s, s, 0, d);
    expect(plan.sprites.every((sp) => sp.size === undefined)).toBe(true);
    expect(plan.hud.boss).toBeUndefined();
    const i = d.cast.findIndex((c) => d.fighters[c.fighter].id === "teddy-boss");
    const awake = { ...s, fighters: s.fighters.map((f, j) => (j === i ? { ...f, active: 1 } : f)) };
    const woke = viewOf(awake, awake, 0, d);
    expect(woke.sprites.find((sp) => sp.who === i)?.size).toBe(2);
    expect(woke.hud.boss).toEqual({ name: "TEDDY BOSS", hp: teddy(d).hp, maxHp: teddy(d).hp });
  });
});
