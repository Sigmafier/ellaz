import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../art/characters";
import { buildManifest, frameGeometry, layoutAtlas } from "./pack";
import schema from "./manifest.schema.json";

const built = { commit: "abc1234", dirty: false, at: "2026-09-05T00:00:00Z" };

describe("frame geometry", () => {
  for (const c of CHARACTERS) {
    it(`${c.id}: every frame fits, pivot sits on the centre column, feet inside`, () => {
      const clips = c.clips();
      const g = frameGeometry(clips, 2);
      expect(g.pivot.x * 2).toBe(g.w);
      expect(g.pivot.y).toBeLessThan(g.h);
      expect(g.pivot.y).toBeGreaterThan(g.h * 0.5);
      // the tallest frame at scale 2 fits above the pivot with the pad
      expect(-g.body[1] * 2 + 4).toBeLessThanOrEqual(g.pivot.y);
    });
  }
  it("refuses a character with no ops", () => expect(() => frameGeometry([{ id: "idle", fps: 1, loop: true, frames: [{ name: "x_idle_0000", clip: "idle", index: 0, ops: [], pivot: { x: 0, y: 0 }, sockets: {} }] }], 1)).toThrow(/no frames/));
});

describe("atlas layout", () => {
  const robot = CHARACTERS[0];
  const clips = robot.clips();
  const geo = frameGeometry(clips, 2);
  const { atlas, cells } = layoutAtlas(clips, geo, "robot--snes16.png");
  const names = clips.flatMap((c) => c.frames.map((f) => f.name));
  it("one atlas frame per baked frame, same names", () => {
    expect(Object.keys(atlas.frames).sort()).toEqual([...names].sort());
    expect(cells).toHaveLength(names.length);
  });
  it("no two frames overlap and every frame is inside the sheet", () => {
    const rects = Object.values(atlas.frames).map((f) => f.frame);
    for (const r of rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(r.y + r.h).toBeLessThanOrEqual(atlas.meta.size.h);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(apart, `${i} vs ${j}`).toBe(true);
    }
  });
  it("is TexturePacker-shaped: untrimmed, unrotated, normalised pivot, meta.image", () => {
    const f = atlas.frames[names[0]];
    expect(f.rotated).toBe(false);
    expect(f.trimmed).toBe(false);
    expect(f.pivot.x).toBeCloseTo(0.5);
    expect(atlas.meta.image).toBe("robot--snes16.png");
    expect(atlas.meta.format).toBe("RGBA8888");
  });
  it("refuses duplicate frame names", () => {
    const dup = [clips[0], clips[0]];
    expect(() => layoutAtlas(dup, geo, "x.png")).toThrow(/duplicate/);
  });
});

describe("manifest", () => {
  const knight = CHARACTERS[1];
  const clips = knight.clips();
  const geo = frameGeometry(clips, 2);
  const m = buildManifest("knight", "flat", 2, clips, geo, knight.rig!.hitbox, "atlas.json", built);
  it("names the five animations with fps, loop and frame lists in order", () => {
    expect(Object.keys(m.animations)).toEqual(["idle", "walk", "attack", "hurt", "ko"]);
    expect(m.animations.walk.loop).toBe(true);
    expect(m.animations.attack.loop).toBe(false);
    expect(m.animations.idle.frames[0]).toBe("knight_idle_0000");
  });
  it("puts sockets and the hitbox in frame pixels, inside the frame", () => {
    const hand = m.sockets.hand["knight_attack_0002"];
    expect(hand.x).toBeGreaterThan(0);
    expect(hand.x).toBeLessThan(m.frameSize.w);
    expect(m.hitbox.y + m.hitbox.h).toBeCloseTo(m.pivot.y, 5);
    expect(m.hitbox.x).toBeGreaterThanOrEqual(0);
  });
  it("carries every required top-level key of the schema and no others", () => {
    expect(Object.keys(m).sort()).toEqual([...(schema.required as string[])].sort());
  });
});
