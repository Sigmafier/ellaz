import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bounds, validate } from "../scene-ops";
import { SAMPLED, TECHNIQUES, TECHNIQUE_IDS } from "./index";
import { gridToOps } from "./pixel-strings";
import { svgToOps } from "./tool-svg";
import { maskToOps, ROBOT_MASK } from "./procedural-mask";
import { stack } from "./sprite-stacking";
import { box, projectVoxels } from "./voxel-model";

describe("the technique library", () => {
  it("eleven techniques, eight sampled, unique slug ids", () => {
    expect(TECHNIQUES).toHaveLength(11);
    expect(SAMPLED).toHaveLength(8);
    expect(new Set(TECHNIQUE_IDS).size).toBe(11);
    for (const id of TECHNIQUE_IDS) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
  it("every card-only technique says what it is blocked on", () => {
    for (const t of TECHNIQUES) if (!t.sample) expect(t.blockedOn, t.id).toBeTruthy();
  });
  for (const t of SAMPLED) {
    it(`${t.id} sample validates, stands on the origin, and is robot-sized`, () => {
      const ops = t.sample();
      expect(validate({ id: t.id, w: 200, h: 200, ops })).toEqual([]);
      const [x, y, w, h] = bounds(ops)!;
      expect(Math.abs(y + h), "feet on the line").toBeLessThan(0.01);
      expect(Math.abs(x + w / 2), "centred").toBeLessThan(12);
      expect(h).toBeGreaterThan(45);
      expect(h).toBeLessThan(90);
    });
  }
  it("docs/techniques.md lists exactly the library, one row per technique, both directions", () => {
    const md = readFileSync(new URL("../../docs/techniques.md", import.meta.url), "utf8");
    const rows = [...md.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
    expect([...rows].sort()).toEqual([...TECHNIQUE_IDS].sort());
    for (const t of TECHNIQUES) expect(md, t.id).toContain(t.sample ? `| \`${t.id}\` | ${t.name} |` : `| \`${t.id}\` | ${t.name} |`);
  });
});

describe("pixel strings", () => {
  it("merges runs and skips dots, feet on the line", () => {
    const ops = gridToOps(["..aa..", ".aabb.", "......"], { a: "#111", b: "#222" }, 2);
    expect(ops).toHaveLength(3);
    expect(bounds(ops)).toEqual([-4, -4, 8, 4]);
  });
});

describe("svg parser", () => {
  it("reads the four shapes and the bg marker, refuses a fill-less shape", () => {
    const ops = svgToOps('<svg><rect x="1" y="2" width="3" height="4" rx="1" fill="#aaa" data-bg="true"/><circle cx="0" cy="0" r="2" fill="#bbb"/><ellipse cx="1" cy="1" rx="2" ry="3" fill="#ccc"/><polygon points="0,0 4,0 2,3" fill="#ddd"/><path d="M0 0" fill="#eee"/></svg>');
    expect(ops.map((o) => o.k)).toEqual(["r", "c", "e", "p"]);
    expect(ops[0].fg).toBe(false);
    expect(ops[1].fg).toBe(true);
    expect(() => svgToOps('<svg><rect x="0" y="0" width="1" height="1"/></svg>')).toThrow(/no fill/);
  });
});

describe("procedural mask", () => {
  it("is mirrored and deterministic for a seed", () => {
    const a = maskToOps(ROBOT_MASK), b = maskToOps(ROBOT_MASK);
    expect(a).toEqual(b);
    const [x, , w] = bounds(a)!;
    expect(Math.abs(x + w / 2)).toBeLessThan(0.01);
    expect(maskToOps({ ...ROBOT_MASK, seed: "other" })).not.toEqual(a);
  });
});

describe("voxels and stacks", () => {
  it("a lone cube shows three faces; a solid 3x3x3 shows 27; hollowing its centre exposes exactly three more", () => {
    expect(projectVoxels(box(0, 0, 0, 1, 1, 1, "#ff0000"))).toHaveLength(3);
    const solid = box(0, 0, 0, 3, 3, 3, "#ff0000");
    expect(projectVoxels(solid)).toHaveLength(27);
    // the projector draws every exposed face and lets painter order hide the inner ones
    expect(projectVoxels(solid.filter((v) => !(v.x === 1 && v.y === 1 && v.z === 1)))).toHaveLength(30);
  });
  it("a stack rises one unit per layer and rotates every slice", () => {
    const ops = stack([{ ops: [{ k: "r", x: -2, y: -1, w: 4, h: 2, f: "#000", fg: true, rx: 0 }], height: 3 }], 0);
    expect(ops).toHaveLength(3);
    expect(bounds(ops)).toEqual([-2, -3, 4, 4]);
    expect(stack([{ ops: [{ k: "r", x: -2, y: -1, w: 4, h: 2, f: "#000", fg: true, rx: 0 }], height: 1 }], Math.PI / 2)[0].k).toBe("p");
  });
});
