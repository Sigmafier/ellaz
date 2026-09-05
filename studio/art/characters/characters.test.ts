import { describe, expect, it } from "vitest";
import { bounds, place, validate } from "../scene-ops";
import { bakeAll, bakePose, validateRig } from "../rig/rig";
import { CLIP_IDS } from "../rig/types";
import { CHARACTERS, RIGGED } from "./index";
import type { Character } from "./index";

const rectsOf = (ops: ReturnType<typeof bakePose>) => ops.filter((o) => o.k !== "p").map((o) => `${o.k}:${o.f}:${[...Object.values(o)].filter((v) => typeof v === "number").map((v) => Math.round(v * 10) / 10).join(",")}`).sort();

describe("the cast", () => {
  it("four characters, two of each side, unique ids", () => {
    expect(CHARACTERS).toHaveLength(4);
    expect(CHARACTERS.filter((c) => c.side === "hero")).toHaveLength(2);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(4);
  });
  it("every static pose validates as a scene fragment", () => {
    for (const c of CHARACTERS) expect(validate({ id: c.id, w: 200, h: 200, ops: c.staticOps() }), c.id).toEqual([]);
  });
});

const HAND_RIGGED = RIGGED.filter((c) => c.technique === "parts-rig");

for (const c of HAND_RIGGED) {
  describe(`${c.id} rig`, () => {
    const rig = c.rig;
    it("validates", () => expect(validateRig(rig)).toEqual([]));
    it("carries the five standard clips, in order", () => expect(rig.clips.map((k) => k.id)).toEqual([...CLIP_IDS]));
    it("uses the conventional bone names", () => {
      for (const b of ["root", "torso", "head", "armL", "armR", "legL", "legR"]) expect(rig.bones.some((x) => x.id === b), b).toBe(true);
    });
    it("at rest, reproduces the static pose's rects and circles exactly, feet on the origin", () => {
      const rest = bakePose(rig, {});
      const solid = (ops: ReturnType<typeof bakePose>) => ops.filter((o) => o.k !== "p");
      const [rx, ry, , rh] = bounds(solid(rest))!;
      const [sx, sy] = bounds(solid(c.staticOps()))!;
      expect(rectsOf(rest)).toEqual(rectsOf(place(c.staticOps(), rx - sx, ry - sy)));
      const [, ay, , ah] = bounds(rest)!;
      expect(Math.abs(ay + ah)).toBeLessThan(0.01);
      expect(rh).toBeGreaterThan(50);
    });
    it("the hitbox lies inside the rest silhouette and reaches the feet", () => {
      const [x, y, w, h] = bounds(bakePose(rig, {}))!;
      const [hx, hy, hw, hh] = rig.hitbox;
      expect(hx).toBeGreaterThanOrEqual(x - 0.01);
      expect(hy).toBeGreaterThanOrEqual(y - 0.01);
      expect(hx + hw).toBeLessThanOrEqual(x + w + 0.01);
      expect(Math.abs(hy + hh - (y + h))).toBeLessThan(0.01);
    });
    it("bakes every clip with the right frame count and a fixed pivot", () => {
      for (const b of bakeAll(rig)) {
        const src = rig.clips.find((k) => k.id === b.id)!;
        expect(b.frames).toHaveLength(src.frames);
        for (const f of b.frames) {
          expect(f.pivot).toEqual({ x: 0, y: 0 });
          expect(f.name).toMatch(new RegExp(`^${c.id}_${b.id}_\\d{4}$`));
        }
      }
    });
    it("feet stay on the ground line in idle and walk; ko ends lying down", () => {
      const baked = bakeAll(rig);
      for (const id of ["idle", "walk"]) {
        for (const f of baked.find((b) => b.id === id)!.frames) {
          const [, y, , h] = bounds(f.ops)!;
          // a leg rotating about the hip lifts its heel and dips its toe by a unit or two
          expect(Math.abs(y + h), `${id} ${f.name}`).toBeLessThan(3);
        }
      }
      const ko = baked.find((b) => b.id === "ko")!.frames.at(-1)!;
      const [, , w, h] = bounds(ko.ops)!;
      expect(w).toBeGreaterThan(h);
    });
    it("attack shows something idle does not (the strike effect)", () => {
      const baked = bakeAll(rig);
      const idle = baked.find((b) => b.id === "idle")!.frames[0].ops.length;
      const attack = baked.find((b) => b.id === "attack")!.frames[2].ops.length;
      expect(attack).toBeGreaterThan(idle);
    });
  });
}

for (const c of CHARACTERS) {
  describe(`${c.id} clips (${c.technique})`, () => {
    const clips = c.clips();
    it("carries the five standard clips, in order, with frames", () => {
      expect(clips.map((k) => k.id)).toEqual([...CLIP_IDS]);
      for (const k of clips) expect(k.frames.length, k.id).toBeGreaterThan(0);
    });
    it("every frame is named by the grammar, pivots at the origin, and validates", () => {
      for (const k of clips) {
        k.frames.forEach((f, i) => {
          expect(f.name).toBe(`${c.id}_${k.id}_${String(i).padStart(4, "0")}`);
          expect(f.pivot).toEqual({ x: 0, y: 0 });
          expect(validate({ id: f.name, w: 200, h: 200, ops: f.ops })).toEqual([]);
        });
      }
    });
    it("idle and walk loop, attack/hurt/ko do not, and idle keeps its feet near the line", () => {
      const by = Object.fromEntries(clips.map((k) => [k.id, k]));
      expect(by.idle.loop && by.walk.loop).toBe(true);
      expect(by.attack.loop || by.hurt.loop || by.ko.loop).toBe(false);
      for (const f of by.idle.frames) {
        const [, y, , h] = bounds(f.ops)!;
        expect(Math.abs(y + h), f.name).toBeLessThan(3);
      }
    });
    it("ko's last frame is wider than it is tall (lying down or splatted)", () => {
      const last = clips.find((k) => k.id === "ko")!.frames.at(-1)!;
      const [, , w, h] = bounds(last.ops)!;
      expect(w).toBeGreaterThan(h);
    });
  });
}

describe("the parametric teddy", () => {
  it("is a valid rig with the conventional bones and is roughly three heads tall", () => {
    const t = CHARACTERS.find((c) => c.id === "teddy")! as Character & { rig: NonNullable<Character["rig"]> };
    expect(validateRig(t.rig)).toEqual([]);
    const [, y, , h] = bounds(bakePose(t.rig, {}))!;
    expect(Math.abs(y + h)).toBeLessThan(0.01);
    expect(h).toBeGreaterThan(55);
    expect(h).toBeLessThan(75);
  });
});
