// The big map, pinned by behaviour. Operator ruling 2026-09-14: a world three
// views wide and tall, a camera that follows the robot, walls at the far edges.
import { describe, expect, it } from "vitest";
import { ARENA, ARENA_WIDE, KINDS, newRun, rngFor, step, type EnemyKind, type RunState } from "./logic";
import { WALL, WORLD_SCALE, cameraOf, inView, isLeftBehind, spawnPoint, worldFor } from "./world";

const STILL = { dx: 0, dy: 0 };

function immortal(arena = ARENA): RunState {
  const s = newRun("normal", arena);
  s.hp = 9_999;
  s.maxHp = 9_999;
  s.dashCd = 9_999_999;
  return s;
}

function place(s: RunState, kind: EnemyKind, x: number, y: number) {
  const e = { id: s.nextId++, kind, x, y, hp: KINDS[kind].hp, flash: 0 };
  s.enemies.push(e);
  return e;
}

describe("the world is three views, built from the view the run was given", () => {
  it("is WORLD_SCALE times the view on both axes, for both shapes", () => {
    expect(WORLD_SCALE).toBe(3);
    for (const view of [ARENA, ARENA_WIDE]) {
      const s = newRun("normal", view);
      expect(s.world).toEqual({ w: view.w * 3, h: view.h * 3 });
      expect(s.world).toEqual(worldFor(view));
    }
  });

  it("starts the robot in the middle of the world, with the camera centred on it", () => {
    const s = newRun("normal");
    expect(s.x).toBe(s.world.w / 2);
    expect(s.y).toBe(s.world.h / 2);
    const c = cameraOf(s);
    expect(c.x + s.arena.w / 2).toBe(s.x);
    expect(c.y + s.arena.h / 2).toBe(s.y);
  });
});

describe("the camera follows, and stops at the walls", () => {
  it("moves with the robot in the open", () => {
    const s = immortal();
    const before = cameraOf(s);
    for (let i = 0; i < 60; i++) step(s, 16, { dx: 1, dy: 0 }, () => 0.5);
    const after = cameraOf(s);
    expect(after.x).toBeGreaterThan(before.x + 100);
    expect(after.y).toBe(before.y);
  });

  it("never shows past the world: clamped at a wall, and the robot walks off-centre", () => {
    const s = immortal();
    // 900 frames is 2,131 units - further than the world is wide.
    for (let i = 0; i < 900; i++) step(s, 16, { dx: -1, dy: -1 }, () => 0.5);
    const c = cameraOf(s);
    expect(c).toEqual({ x: 0, y: 0 });
    // Pressed against the wall, not past it.
    expect(s.x).toBeGreaterThanOrEqual(WALL);
    expect(s.x).toBeLessThan(WALL + 20);
    expect(s.y).toBeLessThan(WALL + 20);
    // THE CONTROL: off-centre is what proves the clamp, a centred robot would
    // read the same camera numbers only if the clamp did nothing.
    expect(s.x).toBeLessThan(s.arena.w / 2);
  });

  it("holds the far corner too", () => {
    const s = immortal();
    for (let i = 0; i < 900; i++) step(s, 16, { dx: 1, dy: 1 }, () => 0.5);
    const c = cameraOf(s);
    expect(c.x).toBe(s.world.w - s.arena.w);
    expect(c.y).toBe(s.world.h - s.arena.h);
    expect(s.x).toBeLessThanOrEqual(s.world.w - WALL);
    expect(s.y).toBeLessThanOrEqual(s.world.h - WALL);
  });
});

describe("shapes enter just outside the VIEW, never on screen and never past a wall", () => {
  it("in the open, 400 draws: every point off-screen, inside the world, and near the view", () => {
    const s = newRun("normal");
    const rng = rngFor(11);
    for (let i = 0; i < 400; i++) {
      const p = spawnPoint(rng, s);
      expect(inView(s, p.x, p.y)).toBe(false);
      expect(inView(s, p.x, p.y, 30)).toBe(true);
    }
  });

  it("pressed into a corner, the edges with no world behind them are skipped", () => {
    const s = newRun("normal");
    s.x = WALL + 12;
    s.y = WALL + 12;
    const rng = rngFor(12);
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const p = spawnPoint(rng, s);
      expect(p.x).toBeGreaterThanOrEqual(WALL);
      expect(p.y).toBeGreaterThanOrEqual(WALL);
      if (!inView(s, p.x, p.y)) n++;
    }
    // Two of the four edges are walls here; with four attempts per draw the
    // chance a draw finds no open edge is (1/2)^4. Most must be off-screen.
    expect(n).toBeGreaterThan(300);
  });

  it("a run's spawns really come from the view, not the world's far edges", () => {
    const s = immortal();
    const rng = rngFor(3);
    const c = cameraOf(s);
    const seen = new Set<number>();
    let spawns = 0;
    for (let i = 0; i < 1500; i++) {
      step(s, 16, STILL, rng);
      for (const e of s.enemies) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        spawns++;
        // One frame of walking is at most ~1 unit, so 30 is a generous margin.
        expect(e.x).toBeGreaterThan(c.x - 30);
        expect(e.x).toBeLessThan(c.x + s.arena.w + 30);
      }
    }
    expect(spawns).toBeGreaterThan(20);
  });
});

describe("a shape left a whole view behind is walked back in", () => {
  it("is recycled to just outside the view", () => {
    const s = immortal();
    s.slots.length = 0;
    const far = place(s, "runner", s.x + s.arena.w * 2.5, s.y);
    expect(isLeftBehind(s, far.x, far.y)).toBe(true);
    step(s, 16, STILL, rngFor(5));
    expect(isLeftBehind(s, far.x, far.y)).toBe(false);
    expect(inView(s, far.x, far.y, 30)).toBe(true);
  });

  it("THE CONTROL: a shape just off-screen keeps walking where it is", () => {
    const s = immortal();
    s.slots.length = 0;
    const near = place(s, "runner", s.x + s.arena.w * 0.75, s.y);
    const x0 = near.x;
    step(s, 16, STILL, rngFor(5));
    expect(near.x).toBeLessThan(x0);
    expect(near.x).toBeGreaterThan(x0 - 2);
  });

  it("never teleports the golem", () => {
    const s = immortal();
    s.slots.length = 0;
    const g = place(s, "golem", s.x + s.arena.w * 2.5, s.y);
    s.boss = g.id;
    const x0 = g.x;
    step(s, 16, STILL, rngFor(5));
    expect(g.x).toBeLessThan(x0);
    expect(g.x).toBeGreaterThan(x0 - 2);
  });
});
