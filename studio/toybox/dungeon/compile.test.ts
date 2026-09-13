// The compiler on the crypt's real files: the units come out as the plan
// measured them (2.8 tiles/s is 12 FP a tick, rounded, not 11), the cast is
// the hero then the six spawns, and each refusal names what is wrong.

import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { CLIP_ATTACK, CLIP_KO, FACE_DOWN, KIND_BAT, KIND_KNIGHT, KIND_SLIME, TILE } from "./types";
import type { LoadedDungeon } from "./types";

const load = (): LoadedDungeon => JSON.parse(JSON.stringify(loadDungeonMode("crypt", gameDir("hollow"))));
const data = compileDungeon(load());

describe("compileDungeon on the crypt", () => {
  it("the room: 12 x 12, five blocked tiles, three door tiles on the right wall, the start at (5.5, 7.5) facing down", () => {
    expect(data.room.n).toBe(12);
    expect(data.room.blocked.filter(Boolean).length).toBe(5);
    expect(data.room.door).toEqual([5 * 12, 6 * 12, 7 * 12]);
    expect(data.room.startX).toBe(5 * TILE + 128);
    expect(data.room.startY).toBe(7 * TILE + 128);
    expect(data.room.startFace).toBe(FACE_DOWN);
    expect({ ox: data.room.ox, oy: data.room.oy, tileW: data.room.tileW, tileH: data.room.tileH }).toEqual({ ox: 320, oy: 108, tileW: 48, tileH: 24 });
  });

  it("the actors: knight, slime, bat, each of its kind, with their units converted once", () => {
    expect(data.actors.map((a) => [a.id, a.kind])).toEqual([["knight", KIND_KNIGHT], ["slime", KIND_SLIME], ["bat", KIND_BAT]]);
    const [knight, slime, bat] = data.actors;
    expect(knight.speed).toBe(12);
    expect(knight.radius).toBe(66);
    expect(knight.knight!.reach).toBe(396);
    expect(knight.knight!.cone).toBe(25);
    expect(knight.knockSpeed).toBe(13);
    expect({ num: knight.knockNum, den: knight.knockDen }).toEqual({ num: 82, den: 100 });
    expect(knight.faceClips!.length).toBe(6);
    expect(knight.clips[CLIP_ATTACK]).toEqual({ frames: expect.any(Array), ticksPerFrame: 5, loop: false });
    expect(knight.faceClips![4].ticksPerFrame).toBe(5);
    expect(knight.faceClips![4].frames.length).toBe(3);
    expect(slime.slime!.speed).toBe(10);
    expect(slime.slime!.lungeSpeed).toBe(7);
    expect(slime.slime!.aggro).toBe(1024);
    expect(slime.coins).toBe(3);
    expect(slime.faceClips).toBeNull();
    expect(bat.flying).toBe(true);
    expect(bat.hover).toBe(30 * TILE);
    expect(bat.bat!.swoopSpeed).toBe(22);
    expect(bat.bat!.retreatSpeed).toBe(13);
    expect(bat.bat!.speed).toBe(10);
    expect(bat.bat!.swoopAlt).toBe(10 * TILE);
    expect(bat.clips[CLIP_KO].frames.length).toBe(6);
  });

  it("the cast: the hero first, then the six spawns at the sketch's positions with their waits", () => {
    expect(data.cast.length).toBe(7);
    expect(data.cast[0]).toEqual({ actor: 0, x: data.room.startX, y: data.room.startY, wait: 0 });
    expect(data.cast.slice(1).map((c) => c.actor)).toEqual([1, 1, 1, 1, 2, 2]);
    expect(data.cast[1]).toEqual({ actor: 1, x: 640, y: 768, wait: 36 });
    expect(data.cast[5]).toEqual({ actor: 2, x: 1408, y: 640, wait: 148 });
  });

  it("the rules: every distance in FP, every timing as it was written", () => {
    expect(data.rules.swingSeek).toBe(435);
    expect(data.rules.clickRadius).toBe(179);
    expect(data.rules.lineStep).toBe(25);
    expect(data.rules.pickup).toBe(140);
    expect(data.rules.doorBannerTicks).toBe(90);
    expect(data.rules.aggroStartTicks).toBe(72);
  });

  it("is frozen and all integers", () => {
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.actors[0])).toBe(true);
    const walk = (v: unknown, path: string, out: string[]): string[] => {
      if (typeof v === "number") { if (!Number.isInteger(v)) out.push(`${path}=${v}`); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`, out);
      return out;
    };
    expect(walk(data, "$", [])).toEqual([]);
  });
});

describe("compileDungeon refuses wrong data, naming it", () => {
  it("a spawn on a blocked tile", () => {
    const l = load(); l.room.spawns[0] = { ...l.room.spawns[0], x: 350, y: 750 };
    expect(() => compileDungeon(l)).toThrow(/spawn 0 \(slime\) at \(350, 750\) stands on blocked tile \(3, 7\)/);
  });

  it("a door tile that is not against a wall, and one off the grid", () => {
    const l = load(); l.room.door[1] = { i: 6, j: 6 };
    expect(() => compileDungeon(l)).toThrow(/door 1 \(6, 6\) is not against a wall/);
    const m = load(); m.room.door[0] = { i: 12, j: 0 };
    expect(() => compileDungeon(m)).toThrow(/door 0 \(12, 0\) is off the grid/);
  });

  it("a start on a blocked tile", () => {
    const l = load(); l.room.start = { ...l.room.start, x: 750, y: 350 };
    expect(() => compileDungeon(l)).toThrow(/starts the hero on blocked tile \(7, 3\)/);
  });

  it("an actor missing a clip the rules need, and a knight whose facings set lacks one", () => {
    const l = load(); delete (l.sets["slime--snes16"].manifest.animations as Record<string, unknown>).hurt;
    expect(() => compileDungeon(l)).toThrow(/set "slime--snes16" \(actor "slime"\) has no "hurt" clip/);
    const m = load(); delete (m.sets["knight-facings"].manifest.animations as Record<string, unknown>).attack_up;
    expect(() => compileDungeon(m)).toThrow(/set "knight-facings" \(actor "knight"\) has no "attack_up" clip/);
  });

  it("two behaviour blocks, a spawn naming the knight, a start naming a slime, and a grounded hover", () => {
    const l = load(); l.actors[1].bat = l.actors[2].bat;
    expect(() => compileDungeon(l)).toThrow(/actor "slime" carries 2 behaviour blocks/);
    const m = load(); m.room.spawns[0] = { ...m.room.spawns[0], actor: "knight" };
    expect(() => compileDungeon(m)).toThrow(/spawn 0 is a knight/);
    const n = load(); n.room.start = { ...n.room.start, actor: "slime" };
    expect(() => compileDungeon(n)).toThrow(/starts "slime", which is not a knight/);
    const o = load(); o.actors[1].hover = 30;
    expect(() => compileDungeon(o)).toThrow(/"slime" has a hover height but does not fly/);
  });
});
