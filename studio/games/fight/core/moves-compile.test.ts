// compile.ts against the REAL exported robot and teddy, not a fixture.
//
// A fixture would prove the arithmetic and nothing about the pipeline, and the
// pipeline is where this breaks: a pivot read from the wrong file, a scale
// applied twice, a knock vector that forgot knockScale. So this loads the two
// sprite sets the studio actually exported and the five data files beside them,
// compiles them, and checks the numbers that come out against arithmetic
// written here BY HAND from the files.
//
// The hand-written numbers are the point. Re-deriving them with the same
// helpers compile.ts uses would agree with any unit slip, including the slip
// that makes every fighter move five times too fast - the whole class this
// FP/scale layer exists to make impossible.

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { floorDiv } from "./fixed";
import { FP } from "./types";
import type { CFighter, CState, FightData } from "./types";

const input = loadMode("versus");
const data: FightData = compileFight(input);

const byId = (id: string): CFighter => {
  const f = data.fighters.find((x) => x.id === id);
  if (!f) throw new Error(`no compiled fighter "${id}"`);
  return f;
};
const state = (f: CFighter, name: string): CState => {
  const s = f.states.find((x) => x.name === name);
  if (!s) throw new Error(`fighter "${f.id}" has no state "${name}"`);
  return s;
};

/** every number in the tree, with where it was, and how many were seen */
function numbers(v: unknown, path = "$", seen: string[] = [], bad: string[] = []): { seen: string[]; bad: string[] } {
  if (typeof v === "number") {
    seen.push(path);
    if (!Number.isInteger(v)) bad.push(`${path} = ${v}`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => numbers(x, `${path}[${i}]`, seen, bad));
  } else if (v !== null && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) numbers(x, `${path}.${k}`, seen, bad);
  }
  return { seen, bad };
}

describe("the compiled fight is integers, all the way down", () => {
  it("visits a real population and finds no fraction in it", () => {
    const { seen, bad } = numbers(data);
    // the population, printed first: a walk that visited nothing would pass
    // every assertion under it and report a clean sweep over an empty tree.
    expect(seen.length).toBeGreaterThan(500);
    expect(bad).toEqual([]);
  });

  it("freezes the whole table, so nothing can write to it between two ticks", () => {
    expect(() => {
      data.seed = 1;
    }).toThrow(TypeError);
    expect(() => {
      byId("robot").hp = 1;
    }).toThrow(TypeError);
    expect(() => {
      state(byId("robot"), "idle").frames[0].bdy.push({ x: 0, y: 0, w: 1, h: 1 });
    }).toThrow(TypeError);
  });
});

describe("states, sorted, with every index resolved", () => {
  it("sorts each fighter's states by name", () => {
    for (const f of data.fighters) {
      const names = f.states.map((s) => s.name);
      expect(names).toEqual([...names].sort());
      expect(names).toEqual(["attack", "hurt", "idle", "ko", "walk"]);
    }
  });

  it("points initial, next, hurt and ko at the right rows", () => {
    for (const f of data.fighters) {
      expect(f.states[f.initial].name).toBe("idle");
      expect(f.states[f.hurt].name).toBe("hurt");
      expect(f.states[f.ko].name).toBe("ko");

      const attack = state(f, "attack");
      expect(f.states[attack.next].name).toBe("idle");
      expect(attack.cancelFrom).toBe(4);

      const idle = state(f, "idle");
      expect(f.states[idle.onMove].name).toBe("walk");
      expect(f.states[idle.onAttack].name).toBe("attack");
      expect(idle.onStop).toBe(-1);
      expect(idle.next).toBe(-1);
      expect(idle.cancelFrom).toBe(-1);
    }
  });

  it("takes fps, loop, frame names and total off the manifest's clip", () => {
    const robot = byId("robot");
    // robot--snes16.manifest.json: idle 6 fps loop 4 frames, attack 12 fps one-shot 6 frames
    expect(state(robot, "idle")).toMatchObject({ clip: "idle", fps: 6, loop: true, starts: [], total: 40 });
    expect(state(robot, "attack")).toMatchObject({ clip: "attack", fps: 12, loop: false, starts: [], total: 30 });
    expect(state(robot, "walk").total).toBe(36); // 6 frames at 10 fps
    expect(state(robot, "hurt").total).toBe(18); // 3 frames at 10 fps
    expect(state(robot, "ko").total).toBe(45); //  6 frames at  8 fps
    expect(state(robot, "idle").frameNames).toEqual([
      "robot_idle_0000",
      "robot_idle_0001",
      "robot_idle_0002",
      "robot_idle_0003",
    ]);
  });
});

describe("the unit conversions, computed here by hand from the files", () => {
  // robot--snes16.moves.json  idle frame 0 bdy[0] = { x: 410, y: 20, w: 170, h: 480 }
  // robot--snes16.manifest.json pivot = { x: 490, y: 500 }
  // arena/playroom.json scale = 1/5 ; core/types.ts FP = 256
  //
  //   x  floor((410 - 490) * 256 * 1 / 5) = floor(-20480 / 5)  =  -4096
  //   y  floor(( 20 - 500) * 256 * 1 / 5) = floor(-122880 / 5) = -24576
  //   w  floor( 170        * 256 * 1 / 5) = floor(43520 / 5)   =   8704
  //   h  floor( 480        * 256 * 1 / 5) = floor(122880 / 5)  =  24576
  it("turns a frame-pixel box into a pivot-relative FP box", () => {
    expect(state(byId("robot"), "idle").frames[0].bdy[0]).toEqual({ x: -4096, y: -24576, w: 8704, h: 24576 });
  });

  // knock { dx: 60, dy: -20 } ; match knockScale = 10 for x, liftScale = 60 for y ; TICK_RATE = 60
  //   knockX  floor(60 * 256 * 1 * 10 / (5 * 60)) = floor(153600 / 300)  =   512
  //   knockY  floor(-20 * 256 * 1 * 60 / 300)     = floor(-307200 / 300) = -1024
  //   (the y multiplier is separate because gravity, 64 FP per tick^2, ate a x10 lift in two ticks -
  //    an apex of 0.9 view px, measured 2026-09-12 - while the slide at x10 was a visible 16 px)
  it("turns a knock vector into FP per tick, x by knockScale and y by liftScale", () => {
    const hit = state(byId("robot"), "attack").frames[2].itr[0];
    expect(hit.knockX).toBe(512);
    expect(hit.knockY).toBe(-1024);
  });

  // a NEGATIVE odd conversion must floor toward -inf, not truncate: dy -20 at liftScale 61
  //   floor(-20 * 256 * 61 / 300) = floor(-1041.06) = -1042, trunc would give -1041
  it("floors a negative conversion toward -inf (the trap trunc would miss)", () => {
    const raw = loadMode("versus");
    const odd = compileFight({ ...raw, match: { ...raw.match, liftScale: 61 } });
    const robot = odd.fighters.find((f) => f.id === "robot")!;
    const hit = robot.states.find((s) => s.name === "attack")!.frames[2].itr[0];
    expect(hit.knockY).toBe(-1042);
  });

  // impulse: same conversion. attack frame 2 dx 20 -> floor(51200 / 300) = 170
  //          hurt frame 0 dx -30 -> floor(-76800 / 300) = -256
  //          ko   frame 0 { dx: -60, dy: -40 } -> -512, floor(-40 * 256 * 60 / 300) = -2048
  it("turns an impulse the same way, and leaves a frame without one at zero", () => {
    const robot = byId("robot");
    expect(state(robot, "attack").frames[2]).toMatchObject({ impulseX: 170, impulseY: 0 });
    expect(state(robot, "attack").frames[3]).toMatchObject({ impulseX: 0, impulseY: 0 });
    expect(state(robot, "hurt").frames[0]).toMatchObject({ impulseX: -256, impulseY: 0 });
    expect(state(robot, "ko").frames[0]).toMatchObject({ impulseX: -512, impulseY: -2048 });
  });

  // view px per second -> FP per tick: floor(v * 256 / 60)
  //   robot speed 96 -> floor(24576 / 60) = 409      zSpeed 62 -> floor(15872 / 60) = 264
  //   teddy speed 66 -> floor(16896 / 60) = 281      zSpeed 44 -> floor(11264 / 60) = 187
  it("turns a fighter's speed into FP per tick", () => {
    expect(byId("robot")).toMatchObject({ set: "robot--snes16", hp: 100, speed: 409, zSpeed: 264 });
    expect(byId("teddy")).toMatchObject({ set: "teddy--snes16", hp: 100, speed: 281, zSpeed: 187 });
  });

  // arena sim is view px -> FP; gravity is view px/s^2 -> floor(900 * 256 / 3600) = 64;
  // the playroom names no `world`, so the world is one screen wide
  it("turns the arena bounds and gravity", () => {
    expect(data.arena).toEqual({
      xMin: 44 * 256,
      xMax: 596 * 256,
      zMin: 186 * 256,
      zMax: 344 * 256,
      gravity: 64,
      viewW: 640 * 256,
      worldW: 640 * 256,
    });
  });

  it("turns the cast's spawn points and resolves its rows to indices; a fixed row is wave -1", () => {
    expect(data.seed).toBe(20260912);
    expect(data.cast[0]).toEqual({
      fighter: data.fighters.findIndex((f) => f.id === "robot"),
      control: "player",
      ai: -1,
      team: 0,
      x: 190 * 256,
      z: 268 * 256,
      face: 1,
      wave: -1,
      delayTicks: 0,
      side: 0,
    });
    expect(data.cast[1]).toMatchObject({
      fighter: data.fighters.findIndex((f) => f.id === "teddy"),
      control: "ai",
      ai: data.ais.findIndex((a) => a.id === "teddy-cpu"),
      face: -1,
    });
  });
});

describe("the attack that both fighters own", () => {
  it("carries the robot's itr on frames 2 and 3 and nowhere else", () => {
    const attack = state(byId("robot"), "attack");
    const armed = attack.frames.map((f, i) => (f.itr.length > 0 ? i : -1)).filter((i) => i >= 0);
    expect(armed).toEqual([2, 3]);
    for (const i of armed) {
      const hit = attack.frames[i].itr[0];
      expect(hit).toMatchObject({ kind: "hit", damage: 10, stun: 8, fall: 20, effect: "star" });
      expect(hit.knockX).toBeGreaterThan(0);
      expect(hit.knockY).toBeLessThan(0); // y is down, so a lift is negative
    }
  });

  it("defaults a hit's optional fields rather than leaving them undefined", () => {
    for (const f of data.fighters) {
      for (const st of f.states) {
        for (const fr of st.frames) {
          for (const hit of fr.itr) {
            expect(typeof hit.stun).toBe("number");
            expect(typeof hit.fall).toBe("number");
            expect(["none", "spark", "dust", "star"]).toContain(hit.effect);
          }
          expect(fr.push === null || typeof fr.push.x === "number").toBe(true);
        }
      }
    }
  });
});

describe("every box lands inside the frame it was drawn on", () => {
  it("keeps bdy, itr and push within the FP bounds of the sprite frame", () => {
    const scale = input.arena.scale;
    const fp = (px: number) => floorDiv(px * FP * scale.num, scale.den);
    let checked = 0;
    for (const f of data.fighters) {
      const manifest = input.sets[f.set].manifest;
      const left = fp(0 - manifest.pivot.x);
      const right = fp(manifest.frameSize.w - manifest.pivot.x);
      const top = fp(0 - manifest.pivot.y);
      const bottom = fp(manifest.frameSize.h - manifest.pivot.y);
      for (const st of f.states) {
        for (const [i, fr] of st.frames.entries()) {
          const boxes = [...fr.bdy, ...fr.itr.map((h) => h.box)];
          if (fr.push) boxes.push(fr.push);
          for (const b of boxes) {
            const where = `${f.id}.${st.name}[${i}]`;
            expect({ where, in: b.x >= left && b.x + b.w <= right && b.y >= top && b.y + b.h <= bottom }).toEqual({
              where,
              in: true,
            });
            checked++;
          }
        }
      }
    }
    // the population: 49 boxes per fighter across five states, twice over
    expect(checked).toBe(98);
  });
});

describe("a name that does not resolve throws, naming the thing", () => {
  it("refuses a state pointing at a clip the manifest does not have", () => {
    const bad = structuredClone(input);
    bad.sets["robot--snes16"].moves.states.idle.clip = "nosuchclip";
    expect(() => compileFight(bad)).toThrow(/state "idle".*"nosuchclip"/);
  });

  it("refuses a transition to a state the moves file does not define", () => {
    const bad = structuredClone(input);
    bad.sets["robot--snes16"].moves.states.attack.next = "nowhere";
    expect(() => compileFight(bad)).toThrow(/"nowhere"/);
  });

  it("refuses a fighter naming a sprite set that was not loaded", () => {
    const bad = structuredClone(input);
    bad.fighters[0].sprites = "ghost--snes16";
    expect(() => compileFight(bad)).toThrow(/ghost--snes16/);
  });

  it("refuses a mode naming an ai that was not loaded", () => {
    const bad = structuredClone(input);
    bad.mode.cast[1].ai = "nobody-cpu";
    expect(() => compileFight(bad)).toThrow(/nobody-cpu/);
  });

  it("refuses a mode naming a fighter that was not loaded", () => {
    const bad = structuredClone(input);
    bad.mode.cast[0].fighter = "nobody";
    expect(() => compileFight(bad)).toThrow(/"nobody"/);
  });

  it("refuses a mode whose arena is not the arena it was handed", () => {
    const bad = structuredClone(input);
    bad.mode.arena = "somewhere-else";
    expect(() => compileFight(bad)).toThrow(/somewhere-else/);
  });

  // the positive control: with nothing planted, the same call must SUCCEED, so
  // a compileFight that threw on everything could not pass the six above.
  it("compiles the untouched input without throwing", () => {
    expect(() => compileFight(structuredClone(input))).not.toThrow();
  });
});
