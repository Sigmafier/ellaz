import { describe, expect, it } from "vitest";
import { P, R } from "../scene-ops";
import { multiply, rotate, scale, transformOp, translate } from "../rig/transform";
import { bakeAll, poseAt } from "../rig/rig";
import type { Rig } from "../rig/types";
import { cutGrid, reachOf, scaleClipTranslations, shapePixelPose, snapOps, subCellTilts } from "./pixel-parts";
import { standardClips } from "../characters/clips";

const PAL = { a: "#ff0000", b: "#00ff00" };

describe("cutGrid", () => {
  it("cuts a region into merged unit rects around the pivot", () => {
    const rows = ["aab", ".bb"];
    const ops = cutGrid(rows, PAL, [[0, 1, 0, 2]], 1, 1, 5);
    expect(ops).toEqual([R(-5, -5, 10, 5, "#ff0000"), R(5, -5, 5, 5, "#00ff00"), R(0, 0, 10, 5, "#00ff00")]);
  });
  it("ignores cells outside the region and unknown characters", () => {
    expect(cutGrid(["a?a"], PAL, [[0, 0, 0, 0]], 0, 0, 1)).toEqual([R(0, 0, 1, 1, "#ff0000")]);
    expect(cutGrid(["a?a"], PAL, [[0, 0, 0, 2]], 0, 0, 1)).toHaveLength(2);
  });
});

describe("snapOps", () => {
  it("leaves grid-aligned rects as they are", () => {
    const ops = [R(0, 0, 10, 5, "#ff0000"), R(10, 0, 5, 5, "#00ff00", false)];
    expect(snapOps(ops, 5)).toEqual(ops.map((o) => ({ ...o, own: true })));
  });
  it("a quarter turn of a rect snaps back to exact cells", () => {
    const m = multiply(translate(0, 0), rotate(Math.PI / 2));
    const turned = transformOp(R(0, 0, 15, 5, "#ff0000"), m);
    expect(turned.k).toBe("p");
    const cells = snapOps([turned], 5).flatMap((o) => (o.k === "r" ? [[o.x, o.y, o.w, o.h]] : []));
    // x' = -y, y' = x: the 15x5 bar now stands 5 wide (x in [-5,0)) and 15 tall (y in [0,15))
    expect(cells).toEqual([[-5, 0, 5, 5], [-5, 5, 5, 5], [-5, 10, 5, 5]]);
  });
  it("the topmost shape wins a cell, and fg is carried", () => {
    const ops = [R(0, 0, 10, 5, "#ff0000", false), P([[5, -1], [11, -1], [11, 6], [5, 6]], "#00ff00")];
    const out = snapOps(ops, 5);
    expect(out).toEqual([{ ...R(0, 0, 5, 5, "#ff0000", false), own: true }, { ...R(5, 0, 5, 5, "#00ff00", true), own: true }]);
  });
  it("marks every snapped cell as carrying its own edge, so a style adds no ring", () => {
    for (const o of snapOps([R(0, 0, 10, 5, "#ff0000")], 5)) expect(o.own).toBe(true);
  });
  it("never invents a colour: a rotated multi-colour part snaps to its own palette", () => {
    const part = [R(0, -20, 4, 20, "#ff0000"), R(0, -10, 4, 5, "#00ff00")];
    const m = rotate(0.45);
    const out = snapOps(part.map((o) => transformOp(o, m)), 1);
    expect(new Set(out.map((o) => o.f))).toEqual(new Set(["#ff0000", "#00ff00"]));
    for (const o of out) if (o.k === "r") { expect(o.h).toBe(1); expect(Number.isInteger(o.x) && Number.isInteger(o.y)).toBe(true); }
  });
});

describe("snapOps under a squash", () => {
  it("leaves no hole through a body whose rows were scaled to a fraction of a cell", () => {
    // 20 rows of 1x40 rects, squashed to 45% height: the rows become thin
    // polygons that tile with hairline seams; every cell inside must be filled
    const rows = Array.from({ length: 20 }, (_, i) => R(-20, -20 + i, 40, 1, i % 2 ? "#ff0000" : "#00ff00"));
    const m = multiply(translate(0, 0), scale(1.8, 0.45));
    const out = snapOps(rows.map((o) => transformOp(o, m)), 1);
    const cells = new Set(out.flatMap((o) => (o.k === "r" ? Array.from({ length: o.w }, (_, k) => `${o.x + k},${o.y}`) : [])));
    for (let y = -9; y < 0; y++) for (let x = -36; x < 36; x++) expect(cells.has(`${x},${y}`), `hole at ${x},${y}`).toBe(true);
  });
});

describe("a pixel part never rotates by less than a cell", () => {
  // a 5-unit grid: a torso 4 cells tall on a bottom pivot, a head 4 cells tall
  // on top of it, an arm 2 cells long off the torso's side
  const U = 5;
  const rig: Rig = {
    id: "t",
    bones: [
      { id: "root", parent: null, x: 0, y: 0 },
      { id: "torso", parent: "root", x: 0, y: 0 },
      { id: "head", parent: "torso", x: 0, y: -20 },
      { id: "arm", parent: "torso", x: 5, y: -15 },
    ],
    parts: [
      { id: "torso", bone: "torso", z: 1, ops: [R(-5, -20, 10, 20, "#ff0000")] },
      { id: "head", bone: "head", z: 2, ops: [R(-5, -20, 10, 20, "#00ff00")] },
      { id: "arm", bone: "arm", z: 3, ops: [R(0, 0, 10, 5, "#ff0000")] },
    ],
    sockets: {},
    hitbox: [-5, -40, 10, 40],
    clips: [{ id: "idle", frames: 4, fps: 6, loop: true, keys: [{ at: 0, pose: {} }, { at: 2, pose: { head: { rot: 0.03 }, arm: { rot: 0.6 } } }] }],
  };

  it("measures reach to the farthest corner of the bone's own parts and its children's", () => {
    // head: pivot at (0,-20), its far corners at (±5,-40) -> hypot(5,20)
    expect(reachOf(rig, "head")).toBeCloseTo(Math.hypot(5, 20), 6);
    // torso reaches THROUGH the head: (±5,-40) from (0,0)
    expect(reachOf(rig, "torso")).toBeCloseTo(Math.hypot(5, 40), 6);
    // arm: pivot (5,-15), far corner (15,-10) -> hypot(10,5)
    expect(reachOf(rig, "arm")).toBeCloseTo(Math.hypot(10, 5), 6);
    // root carries everything
    expect(reachOf(rig, "root")).toBeCloseTo(Math.hypot(5, 40), 6);
  });

  it("names the tilts the grid can only shear, and leaves real poses alone", () => {
    // head 0.03 rad x 20.6 reach = 0.62 units, well under a 5-unit cell; the arm at 0.6 rad x 11.2 = 6.7 units, over it
    expect(subCellTilts(rig, U, { head: { rot: 0.03 }, arm: { rot: 0.6 } })).toEqual(["head"]);
    // the exact boundary: the farthest cell moving one full cell is a rotation the grid can show
    const reach = reachOf(rig, "head");
    expect(subCellTilts(rig, U, { head: { rot: U / reach } })).toEqual([]);
    expect(subCellTilts(rig, U, { head: { rot: U / reach - 1e-9 } })).toEqual(["head"]);
    // no rotation is never a tilt, and a translation is not one either
    expect(subCellTilts(rig, U, { head: { dy: -5 }, torso: { rot: 0 } })).toEqual([]);
    // a small tilt on a bone with a long reach is a real move: the torso's 0.03 x 40.3 = 1.2 units at 1-unit cells
    expect(subCellTilts(rig, 1, { torso: { rot: 0.03 } })).toEqual([]);
  });

  it("the shaper zeroes exactly those rotations and nothing else, on the interpolated frames too", () => {
    const shape = shapePixelPose(rig, U);
    const at2 = shape(poseAt(rig.clips[0], 2));
    expect(at2.head.rot).toBe(0);
    expect(at2.arm.rot).toBeCloseTo(0.6, 9);
    // frame 1 is halfway there - the arm at 0.3 x 11.2 = 3.4 units is under a cell and drops too
    const at1 = shape(poseAt(rig.clips[0], 1));
    expect(at1.head.rot).toBe(0);
    expect(at1.arm.rot).toBe(0);
    // a pose with nothing to flatten comes back as the same object
    const rest = poseAt(rig.clips[0], 0);
    expect(shape(rest)).toBe(rest);
  });

  it("CONTROL: baked through the shaper the head stays one rect; baked raw it shears into a polygon", () => {
    const raw = bakeAll(rig)[0].frames[2].ops;
    const shaped = bakeAll(rig, shapePixelPose(rig, U))[0].frames[2].ops;
    // part order is z order: torso, head, arm
    expect(raw[1].k).toBe("p");
    expect(shaped[1].k).toBe("r");
    // and the arm's real swing survives the shaper
    expect(shaped[2].k).toBe("p");
  });
});

describe("scaleClipTranslations", () => {
  it("scales dx and dy, leaves rotation alone, and adds no keys", () => {
    const out = scaleClipTranslations(standardClips(), 3);
    const attack = out.find((c) => c.id === "attack")!;
    expect(attack.keys[1].pose.armR).toEqual({ rot: -0.15, dx: 21 });
    expect(attack.keys[0].pose.torso).toEqual({ rot: -0.12 });
    expect(out.map((c) => c.id)).toEqual(standardClips().map((c) => c.id));
  });
  it("with a unit, rounds every translation to a whole pixel and drops the head's own nod", () => {
    const out = scaleClipTranslations(standardClips(), 3.5, 5);
    const idle = out.find((c) => c.id === "idle")!;
    expect(idle.keys[1].pose.torso).toEqual({ dy: -5 });
    expect(idle.keys[1].pose.head).toEqual({ rot: 0.03 });
    const attack = out.find((c) => c.id === "attack")!;
    expect(attack.keys[1].pose.armR).toEqual({ rot: -0.15, dx: 25 });
  });
});
