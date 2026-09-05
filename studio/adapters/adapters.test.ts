import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../art/characters";
import { buildManifest, frameGeometry, layoutAtlas } from "../export/pack";
import type { Atlas, Manifest } from "./manifest";
import { parseFrameName } from "./manifest";
import { ClipPlayer } from "./canvas/player";
import { planDraw, socketAt } from "./canvas/draw-frame";
import { animKey, createStudioAnims, loadStudioAtlas, originFor } from "./phaser/load-atlas";
import { godotSpriteFrames } from "./godot/sprite-frames.stub";

// A real export, built in-process from the knight: the adapters are tested
// against the same packer output the exporter writes, not a hand-typed fixture.
const knight = CHARACTERS.find((c) => c.id === "knight")!;
const clips = knight.clips();
const geo = frameGeometry(clips, 2);
const { atlas } = layoutAtlas(clips, geo, "knight--flat.png");
const manifest = buildManifest("knight", "flat", 2, clips, geo, knight.rig!.hitbox, "knight--flat.atlas.json", { commit: "abc1234", dirty: false, at: "now" }) as Manifest;
const A = atlas as unknown as Atlas;

describe("frame names", () => {
  it("parse and refuse", () => {
    expect(parseFrameName("knight_attack_0003")).toEqual({ character: "knight", clip: "attack", index: 3 });
    expect(parseFrameName("Knight-attack-3")).toBeNull();
  });
});

describe("ClipPlayer", () => {
  it("loops idle at its fps and holds ko on its last frame", () => {
    const p = new ClipPlayer(manifest);
    expect(p.frame).toBe("knight_idle_0000");
    p.advance(1 / 6 + 0.001);
    expect(p.frame).toBe("knight_idle_0001");
    p.advance(4 / 6);
    expect(p.index).toBe(1); // 5 frames elapsed of a 4-frame loop
    p.play("ko");
    expect(p.finished).toBe(false);
    p.advance(10);
    expect(p.frame).toBe("knight_ko_0005");
    expect(p.finished).toBe(true);
  });
  it("refuses unknown clips and negative time", () => {
    const p = new ClipPlayer(manifest);
    expect(() => p.play("dance")).toThrow(/no clip "dance"/);
    expect(() => p.advance(-1)).toThrow(/dt/);
    expect(() => new ClipPlayer(manifest, "nope")).toThrow(/no clip/);
  });
});

describe("canvas draw plan", () => {
  it("places the pivot at (x, y) and scales by zoom", () => {
    const d = planDraw(A, manifest, "knight_idle_0000", 100, 200, 2);
    expect(d.dst.x + manifest.pivot.x * 2).toBe(100);
    expect(d.dst.y + manifest.pivot.y * 2).toBe(200);
    expect(d.dst.w).toBe(manifest.frameSize.w * 2);
    expect(d.src).toEqual(A.frames.knight_idle_0000.frame);
  });
  it("sockets follow the pivot and mirror on flip", () => {
    const s = socketAt(manifest, "hand", "knight_attack_0002", 100, 200);
    const f = socketAt(manifest, "hand", "knight_attack_0002", 100, 200, 1, true);
    expect(s.y).toBe(f.y);
    expect(s.x - 100).toBeCloseTo(-(f.x - 100));
    expect(() => socketAt(manifest, "tail", "knight_idle_0000", 0, 0)).toThrow(/no socket "tail"/);
    expect(() => planDraw(A, manifest, "knight_idle_9999", 0, 0)).toThrow(/no frame/);
  });
});

describe("phaser adapter", () => {
  it("queues the two files and creates one animation per clip with the right prefix, range and repeat", () => {
    const calls: unknown[] = [];
    const scene = {
      load: { atlas: (...a: unknown[]) => calls.push(["atlas", ...a]) },
      anims: {
        generateFrameNames: (key: string, cfg: { prefix: string; start: number; end: number; zeroPad: number }) => {
          calls.push(["gen", key, cfg]);
          return Array.from({ length: cfg.end - cfg.start + 1 }, (_, i) => `${cfg.prefix}${String(i).padStart(cfg.zeroPad, "0")}`);
        },
        create: (cfg: { key: string; frames: unknown[]; frameRate: number; repeat: number }) => calls.push(["create", cfg]),
      },
    };
    loadStudioAtlas(scene, "knight", "assets/knight--flat");
    expect(calls[0]).toEqual(["atlas", "knight", "assets/knight--flat.png", "assets/knight--flat.atlas.json"]);
    const keys = createStudioAnims(scene, "knight", manifest);
    expect(keys).toEqual(["knight:idle", "knight:walk", "knight:attack", "knight:hurt", "knight:ko"]);
    const walkGen = calls.find((c) => Array.isArray(c) && c[0] === "gen" && (c[2] as { prefix: string }).prefix === "knight_walk_") as [string, string, { start: number; end: number; zeroPad: number }];
    expect(walkGen[2]).toMatchObject({ start: 0, end: 5, zeroPad: 4 });
    const create = calls.filter((c) => Array.isArray(c) && c[0] === "create").map((c) => (c as [string, { key: string; frames: string[]; frameRate: number; repeat: number }])[1]);
    expect(create.find((c) => c.key === animKey("knight", "walk"))).toMatchObject({ frameRate: 10, repeat: -1 });
    expect(create.find((c) => c.key === "knight:attack")).toMatchObject({ frameRate: 12, repeat: 0 });
    // every generated frame name exists in the atlas - the prefix + zeroPad really walks the export
    for (const c of create) for (const f of c.frames) expect(A.frames[f], f).toBeDefined();
    expect(originFor(manifest).x).toBeCloseTo(0.5);
  });
});

describe("godot stub", () => {
  it("emits one AtlasTexture per frame and one animation per clip, referencing the sheet", () => {
    const tres = godotSpriteFrames(manifest, A, "res://sprites/knight--flat.png");
    expect((tres.match(/\[sub_resource type="AtlasTexture"/g) ?? []).length).toBe(25);
    expect((tres.match(/"name": &"/g) ?? []).length).toBe(5);
    expect(tres).toContain('path="res://sprites/knight--flat.png"');
    expect(tres).toContain('"loop": true');
    expect(tres).toContain('"speed": 12.0');
  });
});
