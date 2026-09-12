// The draw plan, against the real fight rather than a fixture. Everything a
// cell is allowed to know about a frame comes out of viewOf, so these are the
// assertions that keep seven engines drawing one picture: the frame NAME, the
// depth ORDER, which way a fighter faces, where its shadow lands, and what one
// tick of interpolation is worth in pixels.
//
// The last test is the control. Two states differing by exactly one view pixel
// must differ by exactly one pixel at full alpha and by none at zero - if the
// arithmetic drifts, every other assertion here still passes, because they all
// read a single state where alpha cannot be observed at all.

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { toPx } from "./fixed";
import { createState } from "./match";
import { step } from "./step";
import { FP, NO_INPUT } from "./types";
import type { FightState, FighterState, InputFrame } from "./types";
import { lerp256, viewOf } from "./view";

const data = compileFight(loadMode("versus"));
const robot = data.fighters[data.cast[0].fighter];
const teddy = data.fighters[data.cast[1].fighter];

/** the spawn state with fighter `i` overridden - every test below starts from a real createState */
function withFighter(i: number, patch: Partial<FighterState>, from: FightState = createState(data)): FightState {
  return { ...from, fighters: from.fighters.map((f, k) => (k === i ? { ...f, ...patch } : f)) };
}

function spriteOf(plan: ReturnType<typeof viewOf>, who: number) {
  const s = plan.sprites.find((op) => op.who === who);
  if (!s) throw new Error(`no sprite for fighter ${who}`);
  return s;
}

function shadowOf(plan: ReturnType<typeof viewOf>, who: number) {
  // shadows are emitted in fighter order and then sorted by the same key the
  // sprites are, so a shadow is matched by the sprite it sits under
  const sprite = spriteOf(plan, who);
  const sh = plan.shadows.find((op) => op.depth === sprite.depth - 1 && op.x === sprite.x);
  if (!sh) throw new Error(`no shadow under fighter ${who}`);
  return sh;
}

describe("lerp256", () => {
  it("is exact at both ends", () => {
    expect(lerp256(1000, 9000, 0)).toBe(1000);
    expect(lerp256(1000, 9000, 256)).toBe(9000);
    expect(lerp256(-4000, 4000, 0)).toBe(-4000);
    expect(lerp256(-4000, 4000, 256)).toBe(4000);
  });

  it("floors in between, downward, on both signs", () => {
    // half of 1 is 0.5 and floors to 0, not to 1
    expect(lerp256(0, 1, 128)).toBe(0);
    expect(lerp256(0, 3, 128)).toBe(1);
    expect(lerp256(0, 100, 64)).toBe(25);
    // and downward means DOWN for a negative step: Math.trunc would give 0 here
    expect(lerp256(0, -1, 128)).toBe(-1);
    expect(lerp256(0, -3, 128)).toBe(-2);
  });
});

describe("viewOf", () => {
  it("sorts sprites by depth, far first", () => {
    // fighter 0 deliberately further from the camera than fighter 1, then swapped
    const near = withFighter(0, { z: 300 * FP });
    const front = viewOf(near, withFighter(1, { z: 200 * FP }, near), 256, data);
    expect(front.sprites.map((s) => s.who)).toEqual([1, 0]);

    const far = withFighter(0, { z: 200 * FP });
    const back = viewOf(far, withFighter(1, { z: 300 * FP }, far), 256, data);
    expect(back.sprites.map((s) => s.who)).toEqual([0, 1]);
    expect(back.shadows.map((s) => s.depth)).toEqual([...back.shadows.map((s) => s.depth)].sort((a, b) => a - b));
  });

  it("flips exactly when face is -1", () => {
    const s = createState(data);
    const plan = viewOf(s, s, 256, data);
    // the mode spawns robot facing right and teddy facing left
    expect(s.fighters.map((f) => f.face)).toEqual([1, -1]);
    expect(spriteOf(plan, 0).flip).toBe(false);
    expect(spriteOf(plan, 1).flip).toBe(true);

    const turned = withFighter(0, { face: -1 }, withFighter(1, { face: 1 }, s));
    const after = viewOf(turned, turned, 256, data);
    expect(spriteOf(after, 0).flip).toBe(true);
    expect(spriteOf(after, 1).flip).toBe(false);
  });

  it("names the manifest frame of the state the fighter is in", () => {
    const s = createState(data);
    const plan = viewOf(s, s, 256, data);
    expect(spriteOf(plan, 0).set).toBe("robot--snes16");
    expect(spriteOf(plan, 0).frame).toBe("robot_idle_0000");
    expect(spriteOf(plan, 1).frame).toBe("teddy_idle_0000");

    // and it tracks `frame`, not a clock of the view's own
    const f0 = s.fighters[0];
    const later = withFighter(0, { frame: 2 }, s);
    expect(spriteOf(viewOf(later, later, 256, data), 0).frame).toBe(robot.states[f0.st].frameNames[2]);
    expect(spriteOf(viewOf(s, s, 256, data), 1).frame).toBe(teddy.states[s.fighters[1].st].frameNames[0]);
  });

  it("puts the shadow on the floor line, one depth unit under the sprite", () => {
    const s = withFighter(0, { z: 268 * FP, h: 40 * FP });
    const plan = viewOf(s, s, 256, data);
    const sprite = spriteOf(plan, 0), shadow = shadowOf(plan, 0);
    // the sprite is lifted by h; the shadow stays at z, which is the floor
    expect(shadow.y).toBe(toPx(s.fighters[0].z));
    expect(shadow.y).toBe(268);
    expect(sprite.y).toBe(268 - 40);
    expect(shadow.depth).toBe(sprite.depth - 1);
    expect(sprite.depth).toBe(268);
    // and it shrinks as the fighter rises
    const grounded = viewOf(withFighter(0, { h: 0 }, s), withFighter(0, { h: 0 }, s), 256, data);
    expect(shadow.w).toBeLessThan(shadowOf(grounded, 0).w);
  });

  it("mirrors a flipped fighter's body box across its x", () => {
    const base = withFighter(0, { x: 300 * FP, z: 268 * FP, face: 1 });
    const flipped = withFighter(0, { face: -1 }, base);
    const plain = viewOf(base, base, 256, data, true).boxes.filter((b) => b.who === 0 && b.kind === "bdy");
    const mirror = viewOf(flipped, flipped, 256, data, true).boxes.filter((b) => b.who === 0 && b.kind === "bdy");
    expect(plain.length).toBeGreaterThan(0);
    expect(mirror.length).toBe(plain.length);

    const x = spriteOf(viewOf(base, base, 256, data), 0).x;
    for (let i = 0; i < plain.length; i++) {
      const a = plain[i], b = mirror[i];
      expect(b.w).toBe(a.w);
      expect(b.h).toBe(a.h);
      expect(b.y).toBe(a.y);
      // the flipped box's RIGHT edge is where the plain box's LEFT edge was,
      // measured from the pivot - that is what mirroring about x means
      expect(b.x + b.w - x).toBe(-(a.x - x));
      expect(b.x - x).toBe(-(a.x + a.w - x));
    }
    // a control: the box is genuinely off-centre, so the mirror is not the
    // identity dressed up as an assertion
    expect(plain[0].x - x).not.toBe(mirror[0].x - x);
  });

  it("clamps a dead fighter's hp at zero and reads maxHp from the fighter file", () => {
    const dead = withFighter(1, { hp: -37 });
    const hud = viewOf(dead, dead, 256, data).hud;
    expect(hud.hp).toEqual([100, 0]);
    expect(hud.maxHp).toEqual([100, 100]);
    expect(hud.maxHp[0]).toBe(robot.hp);
    expect(hud.names).toEqual(["robot", "teddy"]);
    expect(hud.tick).toBe(dead.tick);
    expect(hud.phase).toBe(1);
  });

  it("steps a real tick and keeps the plan in step with the state", () => {
    const walk: InputFrame = { mx: 1, mz: 0, attack: false };
    let s = createState(data);
    let prev = s;
    for (let i = 0; i < 8; i++) { prev = s; s = step(s, [walk, NO_INPUT], data); }
    expect(s.tick).toBe(8);
    const plan = viewOf(prev, s, 256, data);
    const f = s.fighters[0];
    // the plan carries the FRACTION of a game px; a cell rounds to its own grid
    expect(spriteOf(plan, 0).x).toBe(f.x / FP);
    expect(Math.floor(spriteOf(plan, 0).x)).toBe(toPx(f.x));
    expect(spriteOf(plan, 0).frame).toBe(robot.states[f.st].frameNames[f.frame]);
    expect(f.x).toBeGreaterThan(prev.fighters[0].x);
  });

  it("CONTROL: one view pixel of x is worth one pixel at alpha 256 and none at alpha 0", () => {
    const s = createState(data);
    const moved = withFighter(0, { x: s.fighters[0].x + FP }, s);
    // both states are in the same state, so viewOf interpolates rather than snapping
    expect(moved.fighters[0].st).toBe(s.fighters[0].st);

    const still256 = spriteOf(viewOf(s, s, 256, data), 0).x;
    const shift256 = spriteOf(viewOf(s, moved, 256, data), 0).x;
    expect(shift256 - still256).toBe(1);

    const still0 = spriteOf(viewOf(s, s, 0, data), 0).x;
    const shift0 = spriteOf(viewOf(s, moved, 0, data), 0).x;
    expect(shift0 - still0).toBe(0);

    // halfway is HALF A PIXEL, kept: the view no longer floors (2026-09-12) - on a 120 Hz display
    // that half pixel is the frame between two sim ticks, and the cell rounds it to its own grid
    // (a whole device pixel at an upscale of 2 or more; whole game px at 1)
    expect(spriteOf(viewOf(s, moved, 128, data), 0).x - still256).toBe(0.5);
    expect(spriteOf(viewOf(s, moved, 64, data), 0).x - still256).toBe(0.25);
    // and the fighter that did not move never moves, at any alpha
    for (const a of [0, 64, 128, 192, 256]) {
      expect(spriteOf(viewOf(s, moved, a, data), 1).x).toBe(spriteOf(viewOf(s, s, a, data), 1).x);
    }
  });
});
