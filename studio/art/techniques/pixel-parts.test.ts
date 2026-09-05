import { describe, expect, it } from "vitest";
import { P, R } from "../scene-ops";
import { multiply, rotate, scale, transformOp, translate } from "../rig/transform";
import { cutGrid, scaleClipTranslations, snapOps } from "./pixel-parts";
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
