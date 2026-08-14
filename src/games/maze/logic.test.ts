import { describe, expect, it } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  DIFFICULTIES,
  LEVELS,
  carve,
  distances,
  isOpen,
  isSolved,
  newMaze,
  openNeighbours,
  optimalRoute,
  pathBetween,
  scoreReport,
  stepMove,
  stepTarget,
  tap,
  type Difficulty,
  type MazeState,
} from "./logic";

const seeded = (label: string) => mulberry32(seedFrom(label));

describe("stepMove - one square at a time", () => {
  it("walks into an open neighbour and blocks on a hedge or an edge", () => {
    for (const level of DIFFICULTIES) {
      for (let s = 0; s < 40; s++) {
        const m = newMaze(level, 0, seeded(`step-${level}-${s}`));
        const open = openNeighbours(m.walls, m.size, m.at);
        for (const dir of ["up", "right", "down", "left"] as const) {
          const target = stepTarget(m.size, m.at, dir);
          const { state, outcome } = stepMove(m, dir);
          if (target !== null && isOpen(m.walls, m.size, m.at, target)) {
            expect(outcome.kind).toBe("moved");
            expect(state.at).toBe(target);
            expect(state.steps).toBe(1);
            expect(open).toContain(target);
          } else {
            expect(outcome.kind).toBe("blocked");
            expect(state.at).toBe(m.at); // did not move
            expect(state).toBe(m); // and returned the same state
          }
        }
      }
    }
  });

  it("finishing in exactly par by single steps keeps the streak", () => {
    const m = newMaze("easy", 3, seeded("par-walk"));
    const route = optimalRoute(m.walls, m.size, m.at, m.cheese, m.home);
    const waypoints = [m.at, ...route.order, m.home];
    const dirOf = (from: number, to: number): "up" | "down" | "left" | "right" => {
      const diff = to - from;
      if (diff === -m.size) return "up";
      if (diff === m.size) return "down";
      return diff === 1 ? "right" : "left";
    };
    let cur = m;
    for (let w = 1; w < waypoints.length; w++) {
      const seg = pathBetween(m.walls, m.size, waypoints[w - 1], waypoints[w]) ?? [];
      for (const cell of seg) {
        const r = stepMove(cur, dirOf(cur.at, cell));
        expect(r.outcome.kind).toBe("moved");
        cur = r.state;
      }
    }
    expect(isSolved(cur)).toBe(true);
    expect(cur.steps).toBe(m.par);
    expect(cur.streak).toBe(4); // 3 + this perfect one
  });
});

/** Deal a maze from a named seed, so a failure is reproducible from its message. */
function deal(level: Difficulty, label: string, streak = 0): MazeState {
  return newMaze(level, streak, seeded(label));
}

/** Walk the whole optimal route through the SHIPPED reducer, tap by tap. */
function walkOptimal(start: MazeState): MazeState {
  const route = optimalRoute(start.walls, start.size, start.at, start.cheese, start.home);
  let state = start;
  for (const target of [...route.order, start.home]) {
    state = tap(state, target).state;
  }
  return state;
}

describe("the maze itself", () => {
  it("carves a maze every cell can be reached from", () => {
    // The one property that cannot be allowed to fail: an unreachable cheese is
    // a puzzle a child cannot finish, and nothing on screen would say why.
    for (const level of DIFFICULTIES) {
      const { size, braid } = LEVELS[level];
      for (let s = 0; s < 40; s++) {
        const walls = carve(size, braid, seeded(`${level}-${s}`));
        const d = distances(walls, size, 0);
        expect(d.filter((x) => x < 0), `${level} seed ${s} left cells walled off`).toEqual([]);
      }
    }
  });

  it("keeps the two wall arrays one per cell", () => {
    const walls = carve(6, 0, seeded("shape"));
    expect(walls.right).toHaveLength(36);
    expect(walls.down).toHaveLength(36);
  });

  it("never opens a wall through the edge of the board", () => {
    // A right-hand wall on the last column and a bottom wall on the last row
    // join nothing. If `isOpen` ever answered true for those, a path could wrap
    // from one row onto the next and the mouse would walk through the frame.
    const size = 5;
    const walls = carve(size, 1, seeded("edge"));
    for (let r = 0; r < size; r++) {
      const last = r * size + (size - 1);
      expect(isOpen(walls, size, last, last + 1), `row ${r} wrapped`).toBe(false);
    }
    for (let c = 0; c < size; c++) {
      const bottom = (size - 1) * size + c;
      expect(isOpen(walls, size, bottom, bottom + size), `col ${c} fell off`).toBe(false);
    }
  });

  it("only calls two cells open when they are neighbours", () => {
    const walls = carve(5, 1, seeded("adjacency"));
    expect(isOpen(walls, 5, 0, 7)).toBe(false);
    expect(isOpen(walls, 5, 0, 0)).toBe(false);
  });

  it("braiding opens the maze up rather than closing it down", () => {
    // The kind lever. A perfect maze has exactly one route between any two
    // cells, which is a lot of backtracking for a four-year-old; braiding
    // removes dead ends. Measured as total openness, since counting dead ends
    // alone would pass on a maze that gained one somewhere else.
    const open = (braid: number) => {
      let total = 0;
      for (let s = 0; s < 30; s++) {
        const walls = carve(7, braid, seeded(`braid-${braid}-${s}`));
        for (let i = 0; i < 49; i++) total += openNeighbours(walls, 7, i).length;
      }
      return total;
    };
    expect(open(0.9)).toBeGreaterThan(open(0));
  });
});

describe("shortest paths", () => {
  it("returns a step-by-step route that never jumps", () => {
    const state = deal("hard", "path");
    const path = pathBetween(state.walls, state.size, state.at, state.home)!;
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toBe(state.home);
    let from = state.at;
    for (const step of path) {
      expect(isOpen(state.walls, state.size, from, step), `blocked hop ${from}->${step}`).toBe(
        true,
      );
      from = step;
    }
  });

  it("is as long as the distance map says", () => {
    const state = deal("medium", "agree");
    const d = distances(state.walls, state.size, state.at);
    for (let i = 0; i < state.size * state.size; i++) {
      if (i === state.at) continue;
      expect(pathBetween(state.walls, state.size, state.at, i)!).toHaveLength(d[i]);
    }
  });

  it("has nothing to walk when asked for the cell you are on", () => {
    const state = deal("easy", "self");
    expect(pathBetween(state.walls, state.size, state.at, state.at)).toEqual([]);
  });
});

describe("dealing a maze", () => {
  it("puts the mouse, the home and every crumb somewhere different", () => {
    for (const level of DIFFICULTIES) {
      for (let s = 0; s < 30; s++) {
        const state = deal(level, `${level}-deal-${s}`);
        expect(state.cheese).toHaveLength(LEVELS[level].cheese);
        expect(new Set(state.cheese).size).toBe(state.cheese.length);
        expect(state.cheese).not.toContain(state.at);
        expect(state.cheese).not.toContain(state.home);
        expect(state.home).not.toBe(state.at);
      }
    }
  });

  it("puts home as far from the mouse as the maze allows", () => {
    // Not decoration: a home next door would make most deals a single tap, and
    // the run would be over before the child had looked at it.
    const state = deal("medium", "far");
    const d = distances(state.walls, state.size, state.at);
    expect(d[state.home]).toBe(Math.max(...d));
  });

  it("replays the same maze from the same seed", () => {
    const a = deal("hard", "same");
    const b = deal("hard", "same");
    expect(b).toEqual(a);
  });

  it("deals a different one from a different seed", () => {
    expect(deal("hard", "one")).not.toEqual(deal("hard", "two"));
  });

  it("carries the run's streak into the next maze", () => {
    expect(deal("easy", "carry", 4).streak).toBe(4);
  });

  it("opens with nothing walked and nothing finished", () => {
    const state = deal("easy", "fresh");
    expect(state.steps).toBe(0);
    expect(isSolved(state)).toBe(false);
  });
});

describe("par - the number a perfect run has to match", () => {
  it("is reachable: walking the optimal order lands exactly on it", () => {
    // The same trade `sort` makes with its deal plan. `par` is computed by one
    // function and spent by another, and a par nobody can actually reach would
    // mean no child ever sees a perfect run - silently, since the game would
    // still be perfectly playable.
    for (const level of DIFFICULTIES) {
      for (let s = 0; s < 25; s++) {
        const start = deal(level, `${level}-par-${s}`);
        const end = walkOptimal(start);
        expect(isSolved(end), `${level} seed ${s} did not finish`).toBe(true);
        expect(end.steps, `${level} seed ${s}`).toBe(start.par);
      }
    }
  });

  it("cannot be beaten, however the crumbs are visited", () => {
    // Every tap walks a shortest path, so a player's total is a walk over the
    // same metric - and par is the shortest such walk there is. If a random
    // order ever came in UNDER par, par would be wrong and "perfect" would be
    // unreachable for everyone.
    for (let s = 0; s < 60; s++) {
      const start = deal("hard", `beat-${s}`);
      const rng = seeded(`order-${s}`);
      let state = start;
      let guard = 0;
      while (!isSolved(state) && guard++ < 40) {
        const targets = state.cheese.length ? state.cheese : [state.home];
        state = tap(state, targets[Math.floor(rng() * targets.length)]).state;
      }
      expect(isSolved(state)).toBe(true);
      expect(state.steps, `seed ${s} came in under par`).toBeGreaterThanOrEqual(start.par);
    }
  });

  it("is the length of the order it hands back", () => {
    const state = deal("medium", "route");
    const route = optimalRoute(state.walls, state.size, state.at, state.cheese, state.home);
    expect([...route.order].sort((a, b) => a - b)).toEqual(state.cheese);
    let total = 0;
    let from = state.at;
    for (const target of [...route.order, state.home]) {
      total += pathBetween(state.walls, state.size, from, target)!.length;
      from = target;
    }
    expect(total).toBe(route.steps);
    expect(route.steps).toBe(state.par);
  });
});

describe("tapping", () => {
  it("walks to the tapped square and counts every step", () => {
    const state = deal("medium", "walk");
    const target = state.cheese[0];
    const expected = pathBetween(state.walls, state.size, state.at, target)!.length;
    const { state: next, outcome } = tap(state, target);
    expect(outcome.kind).toBe("moved");
    expect(next.at).toBe(target);
    expect(next.steps).toBe(expected);
  });

  it("picks up every crumb the route passes over, not only the one aimed at", () => {
    // A child taps the far crumb and walks over a near one on the way. Leaving
    // it behind would look like the game had missed it.
    let found = false;
    for (let s = 0; s < 60 && !found; s++) {
      const state = deal("hard", `sweep-${s}`);
      for (const target of state.cheese) {
        const path = pathBetween(state.walls, state.size, state.at, target)!;
        const passed = path.filter((c) => state.cheese.includes(c));
        if (passed.length < 2) continue;
        const { state: next, outcome } = tap(state, target);
        expect(outcome.kind === "moved" && outcome.collected).toEqual(passed);
        expect(next.cheese).toEqual(state.cheese.filter((c) => !passed.includes(c)));
        found = true;
        break;
      }
    }
    expect(found, "no seed produced a route over two crumbs").toBe(true);
  });

  it("says nothing when the tap changes nothing", () => {
    const state = deal("easy", "noop");
    expect(tap(state, state.at).outcome).toEqual({ kind: "ignored" });
    expect(tap(state, -1).outcome).toEqual({ kind: "ignored" });
    expect(tap(state, state.size * state.size).outcome).toEqual({ kind: "ignored" });
    expect(tap(state, 1.5).outcome).toEqual({ kind: "ignored" });
  });

  it("leaves the state untouched on a tap it ignores", () => {
    const state = deal("easy", "untouched");
    expect(tap(state, -1).state).toBe(state);
  });

  it("is over when the last crumb is gone AND the mouse is home", () => {
    const state = deal("easy", "order");
    const toHome = tap(state, state.home).state;
    // Reaching home early is a legal walk, never a win: the crumbs still count.
    if (toHome.cheese.length > 0) expect(isSolved(toHome)).toBe(false);
    expect(isSolved(walkOptimal(state))).toBe(true);
  });

  it("ignores taps once the maze is finished", () => {
    // The renderer deals the next maze a beat later. Anything tapped inside
    // that beat must not add steps to a run that is already scored.
    const done = walkOptimal(deal("easy", "after"));
    const { state: same, outcome } = tap(done, 0);
    expect(outcome).toEqual({ kind: "ignored" });
    expect(same).toBe(done);
  });
});

describe("the streak - what the record measures", () => {
  it("counts up on a perfect run", () => {
    const end = walkOptimal(deal("easy", "perfect"));
    expect(end.streak).toBe(1);
    expect(scoreReport(end, "easy")).toEqual({ value: 1, unit: "points", board: "easy" });
  });

  it("goes back to nothing after a wasted step, and never below it", () => {
    // Found by wandering: tap a crumb, tap back, then finish. The run is still
    // a win - there is no failure in this game - it simply is not perfect.
    let wasted: MazeState | undefined;
    for (let s = 0; s < 40 && !wasted; s++) {
      const start = deal("medium", `waste-${s}`, 3);
      const back = tap(tap(start, start.cheese[0]).state, start.at).state;
      const end = walkOptimal(back);
      if (end.steps > start.par) wasted = end;
    }
    expect(wasted, "no seed produced a wasted step").toBeDefined();
    expect(isSolved(wasted!)).toBe(true);
    expect(wasted!.streak).toBe(0);
  });

  it("only moves when a maze actually finishes", () => {
    const start = deal("hard", "midway", 2);
    expect(tap(start, start.cheese[0]).state.streak).toBe(2);
  });

  it("reports points, so the board ranks a longer streak higher", () => {
    // The unit is the whole ranking decision - `src/sdk/score.ts` reads it and
    // nothing else does. It is declared once, here, and pinned to meta.ts by
    // `src/games/score-unit-declared.test.ts`.
    expect(scoreReport(deal("easy", "unit"), "easy").unit).toBe("points");
  });
});
