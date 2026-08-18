import { describe, it, expect } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import {
  COLS,
  DEATH_ROW,
  DIFFICULTIES,
  DROP_POINTS,
  FIELD_H,
  FIELD_ROWS,
  FIELD_W,
  LAUNCHER,
  LEVELS,
  MATCH_MIN,
  MAX_ANGLE,
  POP_POINTS,
  ROW_H,
  aim,
  at,
  boardColors,
  cellCenter,
  fire,
  floaters,
  isCleared,
  isDead,
  isOffset,
  matchGroup,
  neighbors,
  newGame,
  pickColor,
  pushRow,
  rowWidth,
  scoreReport,
  seededGame,
  type Cell,
  type ShooterState,
} from "./logic";

const rngFrom = (s: string) => mulberry32(seedFrom(s));

/** An empty board at `level`, so a test can place exactly what it means to test. */
function bare(level: "easy" | "medium" | "hard" = "easy", shift: 0 | 1 = 0): ShooterState {
  const s = newGame(level, rngFrom("bare"));
  return {
    ...s,
    rows: Array.from({ length: FIELD_ROWS }, (_, r) =>
      Array.from({ length: rowWidth(r, shift) }, () => null as number | null),
    ),
    shift,
  };
}

function put(s: ShooterState, cells: Array<[number, number, number]>): ShooterState {
  const rows = s.rows.map((r) => r.slice());
  for (const [r, c, color] of cells) rows[r][c] = color;
  return { ...s, rows };
}

describe("the hex grid", () => {
  it("staggers rows and keeps every centre inside the field", () => {
    for (const shift of [0, 1] as const) {
      for (let r = 0; r < FIELD_ROWS; r++) {
        expect(rowWidth(r, shift)).toBe(isOffset(r, shift) ? COLS - 1 : COLS);
        for (let c = 0; c < rowWidth(r, shift); c++) {
          const p = cellCenter(r, c, shift);
          expect(p.x).toBeGreaterThanOrEqual(0.5);
          expect(p.x).toBeLessThanOrEqual(FIELD_W - 0.5);
        }
      }
    }
  });

  it("touches exactly the six cells that are one bubble away, and no others", () => {
    // The geometric statement of what a neighbour IS. A hand-written offset
    // table can be wrong in a way that still looks plausible; a distance check
    // cannot, because it is the definition rather than a restatement of it.
    for (const shift of [0, 1] as const) {
      for (let r = 0; r < FIELD_ROWS; r++) {
        for (let c = 0; c < rowWidth(r, shift); c++) {
          const me = cellCenter(r, c, shift);
          const expected: string[] = [];
          for (let r2 = 0; r2 < FIELD_ROWS; r2++) {
            for (let c2 = 0; c2 < rowWidth(r2, shift); c2++) {
              if (r2 === r && c2 === c) continue;
              const p = cellCenter(r2, c2, shift);
              const d = Math.hypot(p.x - me.x, p.y - me.y);
              if (Math.abs(d - 1) < 1e-9) expected.push(`${r2},${c2}`);
            }
          }
          const got = neighbors(r, c, shift).map((n) => `${n.row},${n.col}`);
          expect(got.slice().sort()).toEqual(expected.slice().sort());
        }
      }
    }
  });

  it("is symmetric — a neighbour of mine has me as a neighbour", () => {
    // The property that a wrong diagonal breaks silently: matches and floaters
    // are both flood fills, so an asymmetric edge makes groups fail to pop from
    // one side and clusters fail to fall, with nothing to see in either case.
    for (const shift of [0, 1] as const) {
      for (let r = 0; r < FIELD_ROWS; r++) {
        for (let c = 0; c < rowWidth(r, shift); c++) {
          for (const n of neighbors(r, c, shift)) {
            const back = neighbors(n.row, n.col, shift);
            expect(back.some((b) => b.row === r && b.col === c)).toBe(true);
          }
        }
      }
    }
  });

  it("leaves the launcher clear of the death line", () => {
    expect(LAUNCHER.y).toBeGreaterThan(0.5 + DEATH_ROW * ROW_H);
    expect(LAUNCHER.y).toBeLessThan(FIELD_H);
    expect(LAUNCHER.x).toBeCloseTo(FIELD_W / 2, 10);
  });
});

describe("the ceiling advance", () => {
  it("moves every row down one without moving it sideways", () => {
    // The reason `shift` flips. A row's offset is (index + shift) % 2, so a row
    // gaining an index must be met by a flipped shift or the whole board
    // re-staggers under the player and half the rows change length.
    let s = put(bare(), [
      [0, 0, 1],
      [1, 3, 2],
      [2, 7, 0],
    ]);
    const before = [0, 1, 2].map((r) => ({ r, off: isOffset(r, s.shift), w: s.rows[r].length }));
    s = pushRow(s, rngFrom("push"));
    for (const b of before) {
      expect(isOffset(b.r + 1, s.shift)).toBe(b.off);
      expect(s.rows[b.r + 1].length).toBe(b.w);
    }
    expect(s.rows[1][0]).toBe(1);
    expect(s.rows[2][3]).toBe(2);
    expect(s.rows[3][7]).toBe(0);
    expect(s.rows[0].every((c) => c !== null)).toBe(true);
  });

  it("only ever adds colours the board already has", () => {
    let s = put(bare("hard"), [[0, 0, 3]]);
    for (let i = 0; i < 12; i++) s = pushRow(s, rngFrom(`only-${i}`));
    expect(boardColors(s)).toEqual([3]);
  });

  it("ends the run when the board reaches the death line", () => {
    let s = bare();
    for (let c = 0; c < rowWidth(0, s.shift); c++) s = put(s, [[0, c, 0]]);
    for (let i = 0; i < DEATH_ROW + 1; i++) s = pushRow(s, rngFrom(`death-${i}`));
    expect(s.dead).toBe(true);
  });
});

describe("aiming", () => {
  it("lands a shot from an empty board on the ceiling row", () => {
    const shot = aim(bare(), 0);
    expect(shot.ceiling).toBe(true);
    expect(shot.cell?.row).toBe(0);
    // Straight up from the middle of a 10-wide row: the two middle cells are
    // equidistant, so either is correct and neither is off-centre.
    expect([COLS / 2 - 1, COLS / 2]).toContain(shot.cell?.col);
  });

  it("keeps the whole flight inside the walls, bounce or no bounce", () => {
    const s = bare();
    for (let i = -20; i <= 20; i++) {
      const shot = aim(s, (i / 20) * MAX_ANGLE);
      for (const p of shot.path) {
        expect(p.x).toBeGreaterThanOrEqual(0.5 - 1e-6);
        expect(p.x).toBeLessThanOrEqual(FIELD_W - 0.5 + 1e-6);
      }
    }
  });

  it("bounces off a wall rather than leaving the field", () => {
    // A steep shot cannot reach the ceiling without meeting a wall first, so a
    // path with only two points would mean the reflection never happened.
    const shot = aim(bare(), MAX_ANGLE);
    expect(shot.path.length).toBeGreaterThan(2);
    expect(shot.cell).not.toBeNull();
  });

  it("never lands on an occupied cell, at any angle, on a real board", () => {
    const s = newGame("hard", rngFrom("occupied"));
    for (let i = -30; i <= 30; i++) {
      const shot = aim(s, (i / 30) * MAX_ANGLE);
      expect(shot.cell).not.toBeNull();
      expect(at(s, shot.cell!.row, shot.cell!.col)).toBeNull();
    }
  });

  it("always lands somewhere that touches the board or the ceiling", () => {
    // A bubble snapped into a cell hanging in mid-air would be swept away by
    // the floater check on the very next pop, which reads as the pop being
    // broken rather than the snap.
    const s = newGame("medium", rngFrom("anchored"));
    for (let i = -30; i <= 30; i++) {
      const { row, col } = aim(s, (i / 30) * MAX_ANGLE).cell!;
      const anchored =
        row === 0 || neighbors(row, col, s.shift).some((n) => at(s, n.row, n.col) !== null);
      expect(anchored).toBe(true);
    }
  });

  it("gives the same answer twice — the guide line and the shot are one call", () => {
    const s = newGame("medium", rngFrom("stable"));
    const a = aim(s, 0.4);
    const b = aim(s, 0.4);
    expect(b).toEqual(a);
  });

  it("clamps past the aiming limit instead of firing sideways forever", () => {
    const s = bare();
    expect(aim(s, MAX_ANGLE + 1)).toEqual(aim(s, MAX_ANGLE));
    expect(aim(s, -MAX_ANGLE - 1)).toEqual(aim(s, -MAX_ANGLE));
  });
});

describe("popping", () => {
  it("pops three of a colour and leaves two alone", () => {
    // Two already touching, plus the arriving bubble, is the whole threshold.
    // The control is the same shot at the same angle onto a board one bubble
    // short - so the only difference between popping and not is the third.
    // The lone bubble at the far end of the ceiling is a SURVIVOR, not
    // scenery: without it the pop empties the board, a fresh one is dealt, and
    // every assertion below would be reading the new board instead.
    const three = put(bare(), [
      [0, 0, 2],
      [0, 4, 1],
      [0, 5, 1],
    ]);
    const hit = fire({ ...three, current: 1 }, 0, rngFrom("three"));
    const out = hit.outcome as { popped: Cell[]; cell: Cell };
    expect(out.popped.length).toBe(MATCH_MIN);
    expect(at(hit.state, out.cell.row, out.cell.col)).toBeNull();

    const two = put(bare(), [
      [0, 0, 2],
      [0, 4, 1],
    ]);
    const miss = fire({ ...two, current: 1 }, 0, rngFrom("two"));
    const missed = miss.outcome as { popped: Cell[]; cell: Cell };
    expect(missed.popped).toEqual([]);
    // It stayed exactly where it landed, which is the other half of the claim.
    expect(at(miss.state, missed.cell.row, missed.cell.col)).toBe(1);
  });

  it("finds a group across the row stagger, not only along a row", () => {
    const s = put(bare(), [
      [0, 3, 2],
      [1, 3, 2],
      [2, 3, 2],
    ]);
    expect(matchGroup(s, { row: 1, col: 3 }).length).toBe(3);
  });

  it("drops everything the pop cut loose, and pays double for it", () => {
    // A three-group on the ceiling holding a single bubble underneath it. The
    // hanging bubble is a different colour, so only the support pops — and it
    // must still fall.
    const s0 = put(bare(), [
      [0, 0, 2],
      [0, 4, 1],
      [0, 5, 1],
      [1, 5, 3],
    ]);
    const { state, outcome } = fire({ ...s0, current: 1 }, 0, rngFrom("drop"));
    const out = outcome as { popped: Cell[]; dropped: Cell[]; gained: number };
    expect(out.dropped.length).toBe(1);
    expect(out.gained).toBe(out.popped.length * POP_POINTS + DROP_POINTS);
    // The hanging bubble is GONE from the board, not merely reported.
    expect(at(state, 1, 5)).toBeNull();
    expect(isCleared(state)).toBe(false);
  });

  it("leaves a cluster alone while anything still hangs from the ceiling", () => {
    const s = put(bare(), [
      [0, 2, 1],
      [1, 2, 1],
      [2, 2, 1],
    ]);
    expect(floaters(s)).toEqual([]);
  });

  it("calls a whole board floating once nothing touches row 0", () => {
    const s = put(bare(), [
      [3, 2, 1],
      [4, 2, 1],
    ]);
    expect(floaters(s).length).toBe(2);
  });
});

describe("a run", () => {
  it("deals a fresh board when the last bubble goes, and keeps the score", () => {
    const s0 = put(bare(), [
      [0, 4, 1],
      [0, 5, 1],
    ]);
    const { state, outcome } = fire({ ...s0, current: 1, score: 120 }, 0, rngFrom("clear"));
    expect((outcome as { cleared: boolean }).cleared).toBe(true);
    expect(state.boards).toBe(1);
    expect(state.score).toBeGreaterThan(120);
    expect(isCleared(state)).toBe(false);
    expect(state.shotsLeft).toBe(LEVELS[state.level].shotsPerPush);
  });

  it("advances the ceiling on the shot the counter runs out, and not before", () => {
    const s = { ...newGame("easy", rngFrom("clock")), shotsLeft: 2 };
    const one = fire(s, 0.9, rngFrom("a"));
    expect((one.outcome as { pushed: boolean }).pushed).toBe(false);
    expect(one.state.shotsLeft).toBe(1);
    const two = fire(one.state, -0.9, rngFrom("b"));
    expect((two.outcome as { pushed: boolean }).pushed).toBe(true);
    expect(two.state.shotsLeft).toBe(LEVELS["easy"].shotsPerPush);
  });

  it("never hands over a colour the board cannot use", () => {
    // The fairness rule, and the one a player feels without being able to name:
    // a launcher drawing from the full palette keeps offering the colour that
    // ran out, so every shot makes the board worse and none could have been
    // better.
    let s = newGame("hard", rngFrom("fair"));
    const rng = rngFrom("fair-run");
    for (let i = 0; i < 200 && !s.dead; i++) {
      expect(boardColors(s)).toContain(s.current);
      s = fire(s, (rng() * 2 - 1) * MAX_ANGLE, rng).state;
    }
  });

  it("refuses to score a shot once the run is over", () => {
    const dead = { ...newGame("easy", rngFrom("over")), dead: true };
    const { state, outcome } = fire(dead, 0, rngFrom("over2"));
    expect((outcome as { cell: null }).cell).toBeNull();
    expect(state).toBe(dead);
  });

  it("plays 300 shots on every level without throwing or wedging", () => {
    for (const level of DIFFICULTIES) {
      let s = newGame(level, rngFrom(`soak-${level}`));
      const rng = rngFrom(`soak-run-${level}`);
      for (let i = 0; i < 300; i++) {
        if (s.dead) break;
        const before = s;
        s = fire(s, (rng() * 2 - 1) * MAX_ANGLE, rng).state;
        // Every shot resolves: a board that cannot accept a bubble anywhere
        // would silently return the same state forever.
        expect(s).not.toBe(before);
        expect(s.score).toBeGreaterThanOrEqual(before.score);
        for (let r = 0; r < FIELD_ROWS; r++) expect(s.rows[r].length).toBe(rowWidth(r, s.shift));
      }
    }
  });

  it("replays exactly from a seed", () => {
    expect(seededGame("medium", "same")).toEqual(seededGame("medium", "same"));
    expect(seededGame("medium", "same")).not.toEqual(seededGame("medium", "other"));
  });

  it("reports points, scoped to the level it was scored on", () => {
    // `ms` and `moves` rank LOW and points rank HIGH, and only the value is
    // ever persisted — so this unit is what keeps the board the right way up.
    const s = { ...newGame("hard", rngFrom("report")), score: 4200 };
    expect(scoreReport(s)).toEqual({ value: 4200, unit: "points", board: "hard" });
  });

  it("gets harder in the one way that matters, and stays fair in the other", () => {
    let prev = 0;
    for (const level of DIFFICULTIES) {
      expect(LEVELS[level].colors).toBeGreaterThan(prev);
      prev = LEVELS[level].colors;
    }
    expect(LEVELS.easy.shotsPerPush).toBeGreaterThan(LEVELS.hard.shotsPerPush);
    expect(LEVELS.easy.startRows).toBeLessThan(LEVELS.hard.startRows);
    for (const level of DIFFICULTIES) {
      // Every dealt board leaves room to play. A start that already reaches the
      // death line would be a level nobody can take a first shot on.
      expect(LEVELS[level].startRows).toBeLessThan(DEATH_ROW - 2);
    }
  });

  it("opens with a board that is not already lost", () => {
    for (const level of DIFFICULTIES) {
      const s = newGame(level, rngFrom(`open-${level}`));
      expect(isDead(s)).toBe(false);
      expect(isCleared(s)).toBe(false);
      expect(boardColors(s)).toContain(s.current);
      expect(boardColors(s)).toContain(s.next);
      expect(pickColor(s, rngFrom("p"))).toBeGreaterThanOrEqual(0);
    }
  });
});
