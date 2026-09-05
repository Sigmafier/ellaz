import { describe, expect, it } from "vitest";
import { C, R, bbox, bounds } from "../scene-ops";
import { apply, multiply, rotate, transformOp, translate } from "./transform";
import { bakeClip, frameName, interpolatePose, poseAt, validateRig, worldMatrices } from "./rig";
import type { Clip, Rig } from "./types";

const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

// A stick figure: root at the feet, torso up 20, arm off the torso, head above.
const rig: Rig = {
  id: "stick",
  bones: [
    { id: "root", parent: null, x: 0, y: 0 },
    { id: "torso", parent: "root", x: 0, y: -20 },
    { id: "arm", parent: "torso", x: 5, y: -8 },
    { id: "head", parent: "torso", x: 0, y: -12 },
  ],
  parts: [
    { id: "body", bone: "torso", ops: [R(-4, 0, 8, 12, "#f00")], z: 1 },
    { id: "armP", bone: "arm", ops: [R(0, -1, 10, 2, "#0f0")], z: 2 },
    { id: "headP", bone: "head", ops: [C(0, -4, 4, "#00f")], z: 0 },
  ],
  sockets: { hand: { bone: "arm", x: 10, y: 0 } },
  hitbox: [-6, -36, 12, 36],
  clips: [],
};

describe("transform", () => {
  it("translate then rotate composes like the canvas API", () => {
    const m = multiply(translate(10, 0), rotate(Math.PI / 2));
    const [x, y] = apply(m, 1, 0);
    near(x, 10); near(y, 1);
  });
  it("a rect under a rigid transform stays a rect; under rotation becomes a 4-point polygon of the same size", () => {
    const r = R(0, 0, 4, 2, "#000", true, 1);
    const moved = transformOp(r, translate(3, 3));
    expect(moved.k).toBe("r");
    expect(bbox(moved)).toEqual([3, 3, 4, 2]);
    const turned = transformOp(r, rotate(Math.PI / 2));
    expect(turned.k).toBe("p");
    const [bx, by, bw, bh] = bbox(turned);
    near(bw, 2); near(bh, 4); near(bx, -2); near(by, 0);
  });
  it("a circle stays a circle under rotation and uniform scale", () => {
    const c = transformOp(C(1, 0, 2, "#000"), multiply(rotate(Math.PI), [2, 0, 0, 2, 0, 0]));
    expect(c.k).toBe("c");
    if (c.k === "c") { near(c.x, -2); near(c.r, 4); }
  });
});

describe("worldMatrices", () => {
  it("rest pose stacks the offsets", () => {
    const m = worldMatrices(rig, {});
    const [hx, hy] = apply(m.head, 0, 0);
    expect([hx, hy]).toEqual([0, -32]);
    const [ax, ay] = apply(m.arm, 10, 0);
    expect([ax, ay]).toEqual([15, -28]);
  });
  it("rotating the torso carries the arm and head with it", () => {
    const m = worldMatrices(rig, { torso: { rot: Math.PI / 2 } });
    const [hx, hy] = apply(m.head, 0, 0);
    // head is 12 up the torso; torso rotated +90deg (clockwise on a y-down canvas) puts it 12 to the right of the torso pivot
    near(hx, 12); near(hy, -20);
    const [ax, ay] = apply(m.arm, 0, 0);
    near(ax, 8); near(ay, -15);
  });
});

describe("interpolatePose", () => {
  it("is the identity at t=0 and t=1 and halfway in between", () => {
    const a = { arm: { rot: 0, dx: 0 } }, b = { arm: { rot: 1, dx: 4 }, head: { dy: -2 } };
    expect(interpolatePose(a, b, 0).arm).toMatchObject({ rot: 0, dx: 0 });
    expect(interpolatePose(a, b, 1).arm).toMatchObject({ rot: 1, dx: 4 });
    expect(interpolatePose(a, b, 0.5).arm).toMatchObject({ rot: 0.5, dx: 2 });
    expect(interpolatePose(a, b, 0.5).head).toMatchObject({ dy: -1, sx: 1, sy: 1 });
  });
});

const walk: Clip = { id: "walk", frames: 4, fps: 8, loop: true, keys: [{ at: 0, pose: { arm: { rot: -0.5 } } }, { at: 2, pose: { arm: { rot: 0.5 } } }] };
const attack: Clip = { id: "attack", frames: 3, fps: 12, loop: false, keys: [{ at: 0, pose: {} }, { at: 2, pose: { arm: { rot: 1 } } }] };

describe("poseAt", () => {
  it("hits keyframes exactly and interpolates between them", () => {
    near(poseAt(walk, 0).arm.rot!, -0.5);
    near(poseAt(walk, 1).arm.rot!, 0);
    near(poseAt(walk, 2).arm.rot!, 0.5);
  });
  it("a looping clip wraps toward its first key after the last", () => {
    // frame 3 is halfway between key at 2 (0.5) and key at 0 of the next cycle (-0.5)
    near(poseAt(walk, 3).arm.rot!, 0);
  });
  it("a non-looping clip holds its last key", () => {
    near(poseAt({ ...attack, frames: 5 }, 4).arm.rot!, 1);
  });
});

describe("bakeClip", () => {
  const baked = bakeClip(rig, walk);
  it("bakes one frame per clip frame, named by the grammar", () => {
    expect(baked.frames.map((f) => f.name)).toEqual(["stick_walk_0000", "stick_walk_0001", "stick_walk_0002", "stick_walk_0003"]);
    expect(frameName("robot", "ko", 12)).toBe("robot_ko_0012");
  });
  it("keeps the pivot at the origin on every frame, whatever the pose", () => {
    for (const f of baked.frames) expect(f.pivot).toEqual({ x: 0, y: 0 });
  });
  it("draws parts in z order", () => {
    expect(baked.frames[0].ops.map((o) => o.f)).toEqual(["#00f", "#f00", "#0f0"]);
  });
  it("moves the hand socket with the arm", () => {
    const h0 = baked.frames[0].sockets.hand, h2 = baked.frames[2].sockets.hand;
    expect(h0.y).not.toBeCloseTo(h2.y);
    near(Math.hypot(h0.x - 5, h0.y + 28), 10); // always 10 from the shoulder
  });
  it("the feet stay on the ground line across a walk", () => {
    for (const f of baked.frames) {
      const [, y, , h] = bounds(f.ops)!;
      expect(y + h).toBeLessThanOrEqual(0.0001);
    }
  });
  it("swaps replace a part's ops for that clip only", () => {
    const hurt: Clip = { id: "hurt", frames: 1, fps: 1, loop: false, keys: [{ at: 0, pose: {} }], swaps: { headP: [C(0, -4, 4, "#f0f")] } };
    expect(bakeClip(rig, hurt).frames[0].ops[0].f).toBe("#f0f");
    expect(bakeClip(rig, walk).frames[0].ops[0].f).toBe("#00f");
  });
});

describe("validateRig", () => {
  it("accepts the stick figure", () => expect(validateRig({ ...rig, clips: [walk, attack] })).toEqual([]));
  it("names two roots, an orphan bone, a part on a missing bone, a keyframe past the end, a swap of an unknown part", () => {
    const bad: Rig = {
      ...rig,
      bones: [...rig.bones, { id: "extra", parent: null, x: 0, y: 0 }, { id: "orphan", parent: "nope", x: 0, y: 0 }],
      parts: [...rig.parts, { id: "ghost", bone: "missing", ops: [], z: 0 }],
      clips: [{ ...attack, keys: [{ at: 7, pose: { zzz: {} } }], swaps: { nothing: [] } }],
    };
    const out = validateRig(bad);
    expect(out).toContainEqual(expect.stringContaining("2 root bones"));
    expect(out).toContainEqual(expect.stringContaining("bone orphan parent nope"));
    expect(out).toContainEqual(expect.stringContaining("part ghost on unknown bone missing"));
    expect(out).toContainEqual(expect.stringContaining("keyframe at 7 outside 0..2"));
    expect(out).toContainEqual(expect.stringContaining("unknown bone zzz"));
    expect(out).toContainEqual(expect.stringContaining("swap names unknown part nothing"));
  });
});
