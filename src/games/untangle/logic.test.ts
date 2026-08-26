import { describe, expect, it } from "vitest";
import { mulberry32 } from "@shared/rng";
import {
  LEVELS,
  LEVEL_IDS,
  MARGIN,
  NUDGE_STEP,
  SPAN,
  beginGrab,
  clampPoint,
  countCrossings,
  crossingEdges,
  crossingsAtDot,
  deal,
  dragTo,
  edgesCross,
  endGrab,
  isSolved,
  newGame,
  nudge,
  orient,
  placeSelected,
  ringSlots,
  scoreFor,
  segmentsCross,
  selectDot,
  settle,
  type Edge,
  type LevelId,
  type Point,
} from "./logic";

const P = (x: number, y: number): Point => ({ x, y });
const seeded = (n: number) => mulberry32(n * 2654435761 + 101);

/* ------------------------------------------------------------------ geometry */

describe("which way you turn", () => {
  it("reads left, right and straight on", () => {
    expect(orient(P(0, 0), P(10, 0), P(10, 10))).toBe(1);
    expect(orient(P(0, 0), P(10, 0), P(10, -10))).toBe(-1);
    expect(orient(P(0, 0), P(10, 0), P(20, 0))).toBe(0);
  });

  it("calls a point behind the start collinear too", () => {
    expect(orient(P(0, 0), P(10, 0), P(-40, 0))).toBe(0);
  });

  it("is exact on the biggest numbers the field can produce", () => {
    // The whole crossing test rests on this sign, and the field is integers
    // precisely so it cannot round. A near-miss of one unit across the full
    // span must still read as a turn rather than as straight on.
    expect(orient(P(0, 0), P(SPAN, SPAN), P(SPAN, SPAN - 1))).toBe(-1);
    expect(orient(P(0, 0), P(SPAN, SPAN), P(SPAN - 1, SPAN))).toBe(1);
  });
});

describe("do two segments meet", () => {
  it("sees a clean X", () => {
    expect(segmentsCross(P(0, 0), P(10, 10), P(0, 10), P(10, 0))).toBe(true);
  });

  it("leaves two segments that miss each other alone", () => {
    expect(segmentsCross(P(0, 0), P(10, 0), P(0, 5), P(10, 5))).toBe(false);
  });

  it("does not extend a segment past its own end", () => {
    // They would cross if either ran further, and neither does.
    expect(segmentsCross(P(0, 0), P(4, 4), P(6, 10), P(10, 6))).toBe(false);
  });

  it("counts a T, where an end lands in the middle of the other", () => {
    expect(segmentsCross(P(0, 0), P(20, 0), P(10, 0), P(10, 20))).toBe(true);
  });

  it("counts two segments lying along each other", () => {
    expect(segmentsCross(P(0, 0), P(20, 0), P(10, 0), P(30, 0))).toBe(true);
  });

  it("leaves two collinear segments that never touch alone", () => {
    expect(segmentsCross(P(0, 0), P(10, 0), P(20, 0), P(30, 0))).toBe(false);
  });

  it("counts two collinear segments that just about touch", () => {
    expect(segmentsCross(P(0, 0), P(10, 0), P(10, 0), P(30, 0))).toBe(true);
  });

  it("counts a shared position, because geometry knows nothing about identity", () => {
    // `segmentsCross` answers about coordinates only. Whether a SHARED DOT
    // counts is decided one level up, by `edgesCross`, on the index.
    expect(segmentsCross(P(0, 0), P(10, 10), P(0, 0), P(10, -10))).toBe(true);
  });
});

describe("do two lines of the board cross", () => {
  const nodes = [P(0, 0), P(100, 0), P(0, 100), P(100, 100)];

  it("sees an X between two lines with no dot in common", () => {
    expect(edgesCross(nodes, [0, 3], [1, 2])).toBe(true);
  });

  it("never counts two lines that share a dot", () => {
    expect(edgesCross(nodes, [0, 1], [0, 2])).toBe(false);
    expect(edgesCross(nodes, [0, 3], [3, 1])).toBe(false);
  });

  it("still refuses to count a shared dot when the two lines lie along each other", () => {
    // The documented cost of keying on identity: these overlap on screen and
    // are not a crossing. The alternative is a board that can never be won.
    const inLine = [P(0, 0), P(50, 0), P(90, 0)];
    expect(edgesCross(inLine, [0, 2], [0, 1])).toBe(false);
  });

  it("counts two lines whose dots merely sit on the same spot", () => {
    // Four different dots, two of them stacked. That is a real crossing and
    // saying so is what stops "pile everything up" from winning.
    const stacked = [P(0, 0), P(50, 50), P(50, 50), P(90, 90)];
    expect(edgesCross(stacked, [0, 1], [2, 3])).toBe(true);
  });
});

describe("reading a whole board", () => {
  const nodes = [P(0, 0), P(100, 100), P(0, 100), P(100, 0), P(400, 400), P(500, 400)];
  const edges: Edge[] = [
    [0, 1],
    [2, 3],
    [4, 5],
  ];

  it("counts the crossings", () => {
    expect(countCrossings({ nodes, edges })).toBe(1);
  });

  it("names the lines that are in trouble, and only those", () => {
    expect([...crossingEdges({ nodes, edges })].sort()).toEqual([0, 1]);
  });

  it("counts the crossings a single dot is responsible for", () => {
    expect(crossingsAtDot({ nodes, edges }, 0)).toBe(1);
    expect(crossingsAtDot({ nodes, edges }, 4)).toBe(0);
  });

  it("is solved only when nothing crosses", () => {
    expect(isSolved({ nodes, edges })).toBe(false);
    const untied = nodes.slice();
    untied[2] = P(0, 200);
    untied[3] = P(100, 300);
    expect(isSolved({ nodes: untied, edges })).toBe(true);
  });
});

/* ---------------------------------------------------------------- the deal */

describe("every board is built from a crossing-free drawing", () => {
  it.each(LEVEL_IDS)("%s: the witness layout never crosses, over many seeds", (level) => {
    const bad: number[] = [];
    for (let s = 0; s < 300; s++) {
      const state = deal(level, seeded(s));
      if (countCrossings({ nodes: state.solution, edges: state.edges }) !== 0) bad.push(s);
    }
    expect(bad, `seeds whose witness drawing crosses itself: ${bad.join(", ")}`).toEqual([]);
  });

  it.each(LEVEL_IDS)("%s: the witness is a real solution the rules accept", (level) => {
    // Placed through the shipped gestures rather than written into the state,
    // so this measures the game a player gets rather than a restatement of it.
    for (let s = 0; s < 40; s++) {
      let state = deal(level, seeded(s + 7000));
      expect(isSolved(state)).toBe(false);
      for (let dot = 0; dot < state.nodes.length; dot++) {
        state = beginGrab(state, dot).state;
        state = dragTo(state, state.solution[dot]).state;
        state = endGrab(state).state;
      }
      expect(isSolved(state), `seed ${s} did not come untangled`).toBe(true);
    }
  });
});

describe("the scramble hands over a tangle, never a finished board", () => {
  it.each(LEVEL_IDS)("%s: every deal clears the tier's crossing floor", (level) => {
    const floor = LEVELS[level].crossings;
    const short: string[] = [];
    for (let s = 0; s < 400; s++) {
      const n = countCrossings(deal(level, seeded(s + 200)));
      if (n < floor) short.push(`${s}:${n}`);
    }
    expect(short, `deals under the ${floor}-crossing floor: ${short.join(", ")}`).toEqual([]);
  });

  it("the control: an already-solved board IS recognised as solved", () => {
    // Without this the check above passes over a predicate that can only ever
    // say "tangled". Plant the finished board and require it to read as won.
    const state = deal("hard", seeded(11));
    const solved = { ...state, nodes: state.solution };
    expect(countCrossings(solved)).toBe(0);
    expect(isSolved(solved)).toBe(true);
  });

  it("no two dots start on the same spot", () => {
    for (const level of LEVEL_IDS) {
      for (let s = 0; s < 120; s++) {
        const { nodes } = deal(level, seeded(s + 900));
        const seen = new Set(nodes.map((p) => `${p.x},${p.y}`));
        expect(seen.size, `${level} seed ${s} stacked two dots`).toBe(nodes.length);
      }
    }
  });

  it("no dot starts where a finger cannot reach it", () => {
    for (const level of LEVEL_IDS) {
      for (let s = 0; s < 120; s++) {
        for (const p of deal(level, seeded(s + 1300)).nodes) {
          expect(p.x).toBeGreaterThanOrEqual(MARGIN);
          expect(p.y).toBeGreaterThanOrEqual(MARGIN);
          expect(p.x).toBeLessThanOrEqual(SPAN - MARGIN);
          expect(p.y).toBeLessThanOrEqual(SPAN - MARGIN);
        }
      }
    }
  });

  it("the ring keeps the dots apart by a distance this file chooses", () => {
    for (const level of LEVEL_IDS) {
      const slots = ringSlots(LEVELS[level].dots);
      let closest = Infinity;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const dx = slots[i].x - slots[j].x;
          const dy = slots[i].y - slots[j].y;
          closest = Math.min(closest, Math.hypot(dx, dy));
        }
      }
      // A fifth of the field between neighbours on the hardest tier: on a
      // 350px phone that is well past the 48px platform tap target.
      expect(closest, `${level} ring slots are too close`).toBeGreaterThan(SPAN / 5);
    }
  });
});

describe("the drawing itself", () => {
  const boards = LEVEL_IDS.flatMap((level) =>
    Array.from({ length: 60 }, (_, s) => [level, deal(level as LevelId, seeded(s + 4100))] as const),
  );

  it("has the dots the tier asks for", () => {
    for (const [level, state] of boards) expect(state.nodes.length).toBe(LEVELS[level].dots);
  });

  it("never exceeds the tier's line ceiling", () => {
    for (const [level, state] of boards) {
      expect(state.edges.length).toBeLessThanOrEqual(LEVELS[level].lines);
    }
  });

  it("holds no self-loop, no duplicate and no line to a dot that is not there", () => {
    for (const [, state] of boards) {
      const seen = new Set<string>();
      for (const [a, b] of state.edges) {
        expect(a).toBeLessThan(b);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(state.nodes.length);
        expect(seen.has(`${a}-${b}`)).toBe(false);
        seen.add(`${a}-${b}`);
      }
    }
  });

  it("leaves no dot on fewer than two lines", () => {
    for (const [, state] of boards) {
      const degree = new Array<number>(state.nodes.length).fill(0);
      for (const [a, b] of state.edges) {
        degree[a]++;
        degree[b]++;
      }
      expect(Math.min(...degree)).toBeGreaterThanOrEqual(2);
    }
  });

  it("is one picture rather than two", () => {
    for (const [, state] of boards) {
      const adj: number[][] = state.nodes.map(() => []);
      for (const [a, b] of state.edges) {
        adj[a].push(b);
        adj[b].push(a);
      }
      const seen = new Set([0]);
      const queue = [0];
      for (let h = 0; h < queue.length; h++) {
        for (const n of adj[queue[h]]) if (!seen.has(n)) (seen.add(n), queue.push(n));
      }
      expect(seen.size).toBe(state.nodes.length);
    }
  });

  it("deals the same board twice from the same seed", () => {
    expect(deal("medium", seeded(42))).toEqual(deal("medium", seeded(42)));
    expect(deal("medium", seeded(42))).not.toEqual(deal("medium", seeded(43)));
  });

  it("newGame is the deal", () => {
    expect(newGame("easy", seeded(5))).toEqual(deal("easy", seeded(5)));
  });
});

/* ------------------------------------------------------------------- rules */

describe("moving a dot", () => {
  const board = () => deal("easy", seeded(3));

  it("clamps anything handed to it back inside the field", () => {
    expect(clampPoint(P(-500, 99999))).toEqual(P(MARGIN, SPAN - MARGIN));
    expect(clampPoint(P(12.6, 12.4))).toEqual(P(MARGIN, MARGIN));
  });

  it("a drag counts once, however far it wandered", () => {
    let s = board();
    s = beginGrab(s, 0).state;
    s = dragTo(s, P(300, 300)).state;
    s = dragTo(s, P(400, 500)).state;
    s = dragTo(s, P(500, 500)).state;
    expect(s.moves).toBe(0);
    const done = endGrab(s);
    expect(done.outcome).toEqual({ kind: "released", dot: 0, counted: true });
    expect(done.state.moves).toBe(1);
    expect(done.state.nodes[0]).toEqual(P(500, 500));
    expect(done.state.selected).toBeNull();
  });

  it("a tap moves nothing, costs nothing and leaves the dot chosen", () => {
    let s = board();
    s = beginGrab(s, 2).state;
    const done = endGrab(s);
    expect(done.outcome).toEqual({ kind: "released", dot: 2, counted: false });
    expect(done.state.moves).toBe(0);
    expect(done.state.selected).toBe(2);
  });

  it("a second tap on empty ground puts the chosen dot there", () => {
    let s = board();
    s = endGrab(beginGrab(s, 1).state).state;
    const placed = placeSelected(s, P(600, 200));
    expect(placed.outcome).toEqual({ kind: "placed", dot: 1, to: P(600, 200), counted: true });
    expect(placed.state.nodes[1]).toEqual(P(600, 200));
    expect(placed.state.selected).toBeNull();
    expect(placed.state.moves).toBe(1);
  });

  it("placing a dot back on its own spot deselects it and costs nothing", () => {
    let s = board();
    s = endGrab(beginGrab(s, 1).state).state;
    const placed = placeSelected(s, s.nodes[1]);
    expect(placed.state.moves).toBe(0);
    expect(placed.state.selected).toBeNull();
  });

  it("choosing a dot twice unchooses it", () => {
    let s = board();
    expect(selectDot(s, 4).outcome).toEqual({ kind: "selected", dot: 4 });
    s = selectDot(s, 4).state;
    expect(selectDot(s, 4).outcome).toEqual({ kind: "deselected", dot: 4 });
    expect(selectDot(s, 4).state.selected).toBeNull();
  });

  it("the arrow keys shift the chosen dot and nothing else", () => {
    let s = selectDot(board(), 0).state;
    const from = s.nodes[0];
    s = nudge(s, NUDGE_STEP, 0).state;
    expect(s.nodes[0]).toEqual(clampPoint(P(from.x + NUDGE_STEP, from.y)));
    expect(s.moves).toBe(1);
  });

  it("refuses every gesture that has nothing to act on", () => {
    const s = board();
    expect(dragTo(s, P(1, 1)).outcome.kind).toBe("ignored");
    expect(endGrab(s).outcome.kind).toBe("ignored");
    expect(placeSelected(s, P(1, 1)).outcome.kind).toBe("ignored");
    expect(nudge(s, 10, 0).outcome.kind).toBe("ignored");
    expect(beginGrab(s, 99).outcome.kind).toBe("ignored");
    expect(beginGrab(s, -1).outcome.kind).toBe("ignored");
    expect(selectDot(s, 99).outcome.kind).toBe("ignored");
  });

  it("never lets a dot be dragged off the field", () => {
    let s = beginGrab(board(), 0).state;
    s = dragTo(s, P(-9999, -9999)).state;
    expect(s.nodes[0]).toEqual(P(MARGIN, MARGIN));
  });
});

describe("what reaches the disk", () => {
  it("closes any gesture still open", () => {
    let s = deal("easy", seeded(8));
    s = beginGrab(s, 0).state;
    s = dragTo(s, P(500, 500)).state;
    const stored = settle(s);
    expect(stored.grab).toBeNull();
    expect(stored.selected).toBeNull();
    // The dot stays where the finger left it: a half-finished board is a
    // perfectly good board, and only the gesture is transient.
    expect(stored.nodes[0]).toEqual(P(500, 500));
  });

  it("leaves a board with nothing open untouched", () => {
    const s = deal("easy", seeded(9));
    expect(settle(s)).toBe(s);
  });
});

describe("what the record measures", () => {
  it("is a time, scoped to the tier", () => {
    expect(scoreFor("hard", 42500)).toEqual({ value: 42500, unit: "ms", board: "hard" });
    expect(scoreFor("easy", 0)).toEqual({ value: 0, unit: "ms", board: "easy" });
  });
});

describe("the tiers", () => {
  it("grow both the dots and the lines each dot carries", () => {
    const ratio = (l: LevelId) => LEVELS[l].lines / LEVELS[l].dots;
    expect(LEVELS.easy.dots).toBeLessThan(LEVELS.medium.dots);
    expect(LEVELS.medium.dots).toBeLessThan(LEVELS.hard.dots);
    expect(ratio("easy")).toBeLessThan(ratio("medium"));
    expect(ratio("medium")).toBeLessThan(ratio("hard"));
  });

  it("asks for a crossing floor every tier can actually reach", () => {
    for (const level of LEVEL_IDS) {
      expect(LEVELS[level].crossings).toBeGreaterThan(0);
      expect(LEVELS[level].crossings).toBeLessThan(LEVELS[level].lines);
    }
  });
});
