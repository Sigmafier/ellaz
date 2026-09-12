// A landed swing chains; a whiff pays. match.landedCooldownTicks is what the
// attacker's recovery becomes the tick its hit lands - 0 hands the next swing
// straight to the moves file's cancelFrom. attackCooldownTicks (60) still
// governs a swing that touches nothing, which is why a robot standing still
// and mashing at a teddy that holds outside its reach stays refuted
// (ai-holds.test.ts keeps that measurement).
//
// Measured before this rule, 2026-09-12: every gap between two landed swings
// of a mashing robot was >= 60 ticks, at every cooldown 15..60 the mash matrix
// tried, because the recovery ran whether the fist hit or not.

import { gameDir, loadMode } from "../data/load";
import { compileFight } from "./compile";
import { createState } from "./match";
import { step } from "./step";
import { NO_INPUT } from "./types";
import type { FightData, FightState, InputFrame } from "./types";

const loaded = loadMode("versus", gameDir("fight"));

/** the Versus data with the teddy walking straight in (hold 0) and the landed recovery set to `landed` */
function withLanded(landed: number, hold = 0): FightData {
  const j = JSON.parse(JSON.stringify(loaded));
  j.match.landedCooldownTicks = landed;
  j.ais[0].holdWhenTargetAttacks = hold;
  return compileFight(j);
}

const mash: InputFrame[] = [{ mx: 0, mz: 0, attack: true }, NO_INPUT];

/** the ticks at which the robot's swings LAND, mashing in place for `ticks` */
function landedTicks(d: FightData, ticks: number): number[] {
  let s = createState(d);
  const out: number[] = [];
  for (let t = 0; t < ticks; t++) {
    s = step(s, mash, d);
    if (s.events.some((e) => e.kind === "hit" && e.attacker === 0)) out.push(s.tick);
  }
  return out;
}

function gaps(ts: number[]): number[] {
  return ts.slice(1).map((t, i) => t - ts[i]);
}

describe("landedCooldownTicks", () => {
  it("is in the match file, and the file says 0: a landed swing hands the next one to cancelFrom", () => {
    expect(loaded.match.landedCooldownTicks).toBe(0);
  });

  it("the tick a swing lands, the attacker's recovery drops to the landed value; a whiff keeps the full one", () => {
    const d = withLanded(0);
    let s: FightState = createState(d);
    let landedAt = -1, whiffCool = -1;
    for (let t = 0; t < 2000 && landedAt < 0; t++) {
      s = step(s, mash, d);
      const robot = s.fighters[0];
      // the first swing starts at tick 1 into empty air: its recovery is the full 60, and it stays armed while nothing lands
      if (s.tick === 2) whiffCool = robot.cool;
      if (s.events.some((e) => e.kind === "hit" && e.attacker === 0)) landedAt = s.tick;
    }
    expect(whiffCool).toBe(d.match.attackCooldownTicks - 1);
    expect(landedAt).toBeGreaterThan(0);
    expect(s.fighters[0].cool).toBe(0);
  });

  it("a mashing robot lands its second swing inside 60 ticks of the first - and cannot when the landed value is 60 (the control)", () => {
    const chained = gaps(landedTicks(withLanded(0), 2400));
    const control = gaps(landedTicks(withLanded(60), 2400));
    console.log(`chain: gaps between landed swings, landed 0: ${chained.slice(0, 8).join("/")}; landed 60: ${control.slice(0, 8).join("/")}`);
    expect(chained.length).toBeGreaterThan(2);
    expect(Math.min(...chained)).toBeLessThan(60);
    expect(control.length).toBeGreaterThan(1);
    expect(Math.min(...control)).toBeGreaterThanOrEqual(60);
  });

  it("the standing mash against a teddy that holds (200) is still refuted: it whiffs, so nothing refunds", () => {
    const d = withLanded(0, 200);
    let s = createState(d);
    let taken = 0, landed = 0;
    for (let t = 0; t < 6000; t++) {
      s = step(s, mash, d);
      for (const e of s.events) if (e.kind === "hit") { if (e.target === 0) taken += 1; else landed += 1; }
    }
    console.log(`chain: standing mash vs hold 200 over 6,000 ticks - taken ${taken}, landed ${landed}`);
    expect(taken).toBeGreaterThanOrEqual(1);
  });
});
