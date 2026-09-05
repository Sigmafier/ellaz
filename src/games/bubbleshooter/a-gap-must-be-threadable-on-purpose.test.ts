/**
 * A one-bubble gap was always legal to shoot through, and never possible to
 * aim at.
 *
 * Reported 2026-09-04, issue #29: "When a bubble is shot exactly between 2
 * bubbles that have a bubble space around them, It should squeeze inside the 2
 * bubbles and pass between them like in the original bubbles game, with
 * squashing animation."
 *
 * They were describing something the geometry already allowed. A resting bubble
 * is 1.0 wide and so is a flying one, so the hole left by one missing bubble is
 * a ZERO-CLEARANCE fit - and `HIT_DIST` was 0.92, which buys 0.08 of a bubble
 * either side. Measured on the shipped build, with controls passing
 * (`scripts/repro/bubbleshooter-squeeze-window.mts`): the widest angle window
 * that got past a one-cell gap was 19.04 mrad, 0.70% of the aim arc, about
 * **2.5 px of finger travel on a 360 px drag**. Legal, and unhittable.
 *
 * WHAT THIS FILE HOLDS, and the middle two are the ones that matter:
 *
 *   1. a sealed wall still stops everything - the fix must not become a hole
 *      in every collision on the board;
 *   2. a one-cell gap is now threadable by a person, not by luck;
 *   3. ...and the widening is BOUNDED - a wall with no gap is unchanged, so the
 *      number in cell 1 is what proves cell 2 is not just "collisions got
 *      worse";
 *   4. the shot REPORTS the squeeze, so the renderer can squash the bubble
 *      rather than the renderer guessing where to;
 *   5. the ceiling is not a corridor - a bubble that reaches row 0 lands there
 *      and never leaves the top of the board;
 *   6. `aim()` is still pure and total: same board, same angle, same answer,
 *      which is what lets the guide and the shot come from one call.
 *
 * These are real assertions against the real module. No DOM, no source
 * scanning: everything here is `logic.ts` answering questions.
 */
import { describe, expect, it } from "vitest";
import {
  FIELD_ROWS,
  MAX_ANGLE,
  SQUEEZE_DIST,
  aim,
  cellCenter,
  newGame,
  rowWidth,
  type ShooterState,
} from "./logic";

const WALL = 4;
const HOLE = 5;
const STEPS = 40001;

/** An empty field with a full ceiling backstop, and whatever `lay` adds. */
function board(lay: (s: ShooterState) => void): ShooterState {
  const s = newGame("hard", () => 0.5);
  for (let r = 0; r < s.rows.length; r += 1) {
    for (let c = 0; c < s.rows[r].length; c += 1) s.rows[r][c] = null;
  }
  for (let c = 0; c < rowWidth(0, s.shift); c += 1) s.rows[0][c] = 1;
  lay(s);
  return s;
}

const sealed = () => board((s) => {
  for (let c = 0; c < rowWidth(WALL, s.shift); c += 1) s.rows[WALL][c] = 2;
});

const gapped = () => board((s) => {
  for (let c = 0; c < rowWidth(WALL, s.shift); c += 1) s.rows[WALL][c] = c === HOLE ? null : 2;
});

const angleAt = (i: number) => -MAX_ANGLE + (2 * MAX_ANGLE * i) / (STEPS - 1);

/** Every angle whose bubble comes to rest ABOVE the wall row. */
function past(state: ShooterState): number[] {
  const out: number[] = [];
  for (let i = 0; i < STEPS; i += 1) {
    const shot = aim(state, angleAt(i));
    if (shot.cell && shot.cell.row < WALL) out.push(angleAt(i));
  }
  return out;
}

/** The widest run of consecutive angles in that set, in radians. */
function widest(angles: number[]): number {
  const step = (2 * MAX_ANGLE) / (STEPS - 1);
  let best = 0;
  let run = 0;
  for (let i = 1; i < angles.length; i += 1) {
    if (angles[i] - angles[i - 1] < step * 1.5) {
      run += step;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

describe("threading a one-bubble gap", () => {
  it("a sealed wall still stops every single shot", () => {
    // The control that makes every other number here mean something. If the
    // squeeze were a general loosening of collisions rather than a corridor,
    // this is where it would show, and it would show as a non-zero count.
    expect(past(sealed())).toHaveLength(0);
  });

  it("a one-cell gap is threadable by aim rather than by luck", () => {
    const window = widest(past(gapped()));
    // The shipped build measured 19.04 mrad here - about 2.5 px of finger
    // travel on a 360 px drag, which is why a player reported it as impossible.
    // Held as a FLOOR well under what the corridor actually buys, so ordinary
    // tuning does not red this and a regression to the old behaviour does.
    expect(window).toBeGreaterThan(0.06);
  });

  it("does not widen a wall that has no gap in it", () => {
    // Cells 1 and 3 are the same claim from both sides: the change is local to
    // a corridor, so the sealed wall is byte-for-byte as hard as it ever was.
    expect(past(sealed())).toHaveLength(0);
    expect(past(gapped()).length).toBeGreaterThan(0);
  });

  it("reports where it squeezed, so the squash has somewhere to happen", () => {
    const g = gapped();
    const hole = cellCenter(WALL, HOLE, g.shift);
    const threaded = past(g);
    expect(threaded.length).toBeGreaterThan(0);

    // NOT every threading shot squeezes, and that is correct rather than a
    // gap in the test: a shot straight up the dead centre of the hole never
    // comes within HIT_DIST of either flanking bubble, so nothing deforms and
    // nothing is reported. The squash belongs to the shots that had to fight
    // for it - which, by the numbers above, is most of the window.
    const squashed = threaded.map((a) => aim(g, a)).filter((s) => s.squeezes.length > 0);
    expect(squashed.length).toBeGreaterThan(0);

    // And it happened AT the hole, not somewhere else on the way up.
    for (const shot of squashed) {
      const near = shot.squeezes.some(
        (p) => Math.abs(p.x - hole.x) < 1 && Math.abs(p.y - hole.y) < 1,
      );
      expect(near).toBe(true);
    }
  });

  it("says nothing about squeezing when it never squeezed", () => {
    // A wall with no way through: the bubble sticks, and no squash is claimed.
    const shot = aim(sealed(), 0);
    expect(shot.squeezes).toHaveLength(0);
  });

  it("never lets a bubble off the top of the board", () => {
    // The ceiling is deliberately not a corridor. An empty field is the hardest
    // case: every cell ahead is empty all the way up.
    const empty = board(() => {});
    for (let i = 0; i < 400; i += 1) {
      const shot = aim(empty, angleAt(Math.floor((i * STEPS) / 400)));
      expect(shot.cell).not.toBeNull();
      expect(shot.cell!.row).toBeGreaterThanOrEqual(0);
      expect(shot.cell!.row).toBeLessThan(FIELD_ROWS);
    }
  });

  it("is still pure and total - the guide and the shot cannot disagree", () => {
    const g = gapped();
    for (let i = 0; i < 200; i += 1) {
      const a = angleAt(Math.floor((i * STEPS) / 200));
      expect(aim(g, a)).toEqual(aim(g, a));
    }
  });

  it("squeezes at a tighter reach than it collides at", () => {
    // The one thing that makes the corridor a corridor rather than a new
    // HIT_DIST. If these ever met, cell 1 would be the first to notice.
    expect(SQUEEZE_DIST).toBeLessThan(0.92);
  });
});
