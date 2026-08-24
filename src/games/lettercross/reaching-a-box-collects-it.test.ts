/**
 * A LETTER IN A BOX COLLECTS IT. A letter NEXT TO a box does not.
 *
 * Until 2026-08-25 this file tested the opposite, and the opposite was what
 * shipped: `reachIndex` returned the board square beside a box and filling that
 * square collected the prize. The operator, on playing the first bonus round:
 * "the mini game only apply if you put a letter in the outside boxes not near
 * them." That is BONUS's own rule, read out of its own executable - the first or
 * last letter of a word placed ON a bonus square is what wins the prize.
 *
 * The rule under test is `boxIndex` / `reachedBoxes` in `boxes.ts`, which are
 * DOM-free precisely so this file can run the REAL rule instead of reading the
 * renderer's source for it.
 *
 * `boxes-are-in-line.test.ts` is the sibling and they answer different halves of
 * one question: that file says every box CAN be reached, this one says what
 * reaching it MEANS. A box passing that file and failing this one is a box a
 * word arrives at and nothing happens.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { BOXES, boxIndex, BOX_INDICES, reachedBoxes, isLocked, lineOf, sideOf } from "./boxes";
import { CELLS, SIZE, W, boardAt, colOf, rowOf, type Cell } from "./grid";
import { PLAYABLE, newGame, validate, apply, type Placement } from "./logic";

const empty = (): Cell[] => Array<Cell>(CELLS).fill(null);
const tile = (letter = "a"): Cell => ({ letter, wild: false });

/**
 * THE SQUARE THAT USED TO COLLECT THIS BOX - the far end of the line it caps,
 * one step inside the board. It is written out here, in the test, rather than
 * kept in `boxes.ts`, because its only remaining job is to be the thing that
 * must NOT collect a prize.
 */
function beside(b: (typeof BOXES)[number]): number {
  if (b.row < 0) return boardAt(0, b.col);
  if (b.row >= SIZE) return boardAt(SIZE - 1, b.col);
  if (b.col < 0) return boardAt(b.row, 0);
  return boardAt(b.row, SIZE - 1);
}

describe("a prize box is a square", () => {
  /**
   * THE POSITIVE CONTROL, and it runs first for the reason it always does: every
   * assertion below is about a set of indices, and a `boxIndex` returning
   * nonsense off the stage would make most of them pass vacuously. This one
   * cannot pass unless the function is answering at all.
   */
  it("gives every box a real square on the stage", () => {
    for (const b of BOXES) {
      const i = boxIndex(b);
      expect(Number.isInteger(i), `${b.art} at ${b.row},${b.col} -> ${i}`).toBe(true);
      expect(i, `${b.art} at ${b.row},${b.col}`).toBeGreaterThanOrEqual(0);
      expect(i, `${b.art} at ${b.row},${b.col}`).toBeLessThan(CELLS);
    }
  });

  /** And a square a tile may actually be put on - which is the whole change. */
  it("makes every box playable", () => {
    for (const b of BOXES) {
      expect(PLAYABLE[boxIndex(b)], `${b.art} at ${b.row},${b.col} is not playable`).toBe(true);
    }
  });

  /**
   * The rest of the ring is NOT. Four corners and the gaps between boxes are
   * stage, not board - and this is the control on the line above: a `PLAYABLE`
   * that is true everywhere satisfies it and forbids nothing.
   */
  it("leaves the rest of the ring unplayable", () => {
    let dead = 0;
    for (let i = 0; i < CELLS; i++) {
      const r = rowOf(i), c = colOf(i);
      const inRing = r === 0 || c === 0 || r === W - 1 || c === W - 1;
      if (!inRing || BOX_INDICES.has(i)) continue;
      dead++;
      expect(PLAYABLE[i], `ring cell ${r},${c} is playable and is not a box`).toBe(false);
    }
    expect(dead, "found no dead ring cells at all - the sweep is blind").toBe(4 * (W - 1) - BOXES.length);
  });

  /**
   * The tie to `lineOf`. Those two answer the same question - one in prose for
   * a human, one as an index for the code - so a box whose square is not ON the
   * line `lineOf` names is a box the game and its own explanation disagree
   * about. Board coordinates are stage coordinates minus the one-cell ring.
   */
  it("puts the square on the very line the box caps", () => {
    for (const b of BOXES) {
      const i = boxIndex(b);
      const line = lineOf(b);
      expect(line, `${b.art} at ${b.row},${b.col} is on no line at all`).not.toBeNull();
      if (line!.startsWith("column")) expect(colOf(i) - 1, line!).toBe(b.col);
      else expect(rowOf(i) - 1, line!).toBe(b.row);
    }
  });

  /** And OUT in the ring, one step past the board's own last square. */
  it("puts the square in the ring, not on the board", () => {
    for (const b of BOXES) {
      const i = boxIndex(b);
      const side = sideOf(b);
      if (side === "top") expect(rowOf(i), `${b.art} top`).toBe(0);
      if (side === "bottom") expect(rowOf(i), `${b.art} bottom`).toBe(W - 1);
      if (side === "left") expect(colOf(i), `${b.art} left`).toBe(0);
      if (side === "right") expect(colOf(i), `${b.art} right`).toBe(W - 1);
    }
  });

  /**
   * No two boxes share a square. Two boxes on one line sit at OPPOSITE ends of
   * it, and it is the assertion that fails first if a side's arithmetic is
   * copied from its opposite.
   */
  it("gives no two boxes the same square", () => {
    const seen = new Map<number, string>();
    for (const b of BOXES) {
      const i = boxIndex(b);
      const held = seen.get(i);
      expect(held, `${b.art} at ${b.row},${b.col} shares square ${i} with ${held}`).toBeUndefined();
      seen.set(i, `${b.art} at ${b.row},${b.col}`);
    }
  });
});

describe("which boxes a board has arrived at", () => {
  it("reaches nothing on an empty board", () => {
    expect(reachedBoxes(empty())).toEqual([]);
  });

  /**
   * The other half of the control. "Nothing on an empty board" is also what a
   * `reachedBoxes` that can never return anything says, and the two readings
   * are indistinguishable from the assertion above alone.
   */
  it("reaches all twelve when every box square is filled", () => {
    const b = empty();
    for (const box of BOXES) b[boxIndex(box)] = tile();
    expect(reachedBoxes(b)).toHaveLength(BOXES.length);
  });

  it("reaches exactly the one box whose square was filled", () => {
    BOXES.forEach((box, n) => {
      const b = empty();
      b[boxIndex(box)] = tile();
      expect(reachedBoxes(b), `${box.art} at ${box.row},${box.col}`).toEqual([n]);
    });
  });

  /**
   * THE OPERATOR'S CORRECTION, as an assertion. This is the exact board that
   * collected every prize on the build before 2026-08-25: a tile on the square
   * NEXT to each box, and not one tile in a box. It must now collect nothing.
   */
  it("reaches nothing from the square BESIDE a box", () => {
    const b = empty();
    for (const box of BOXES) b[beside(box)] = tile();
    expect(reachedBoxes(b), "a letter near a box is collecting it again").toEqual([]);
  });

  /** Per box, so a single side getting it right cannot carry the other three. */
  it("reaches nothing from beside any one box", () => {
    for (const box of BOXES) {
      const b = empty();
      b[beside(box)] = tile();
      expect(reachedBoxes(b), `${box.art} at ${box.row},${box.col}`).toEqual([]);
    }
  });

  /**
   * And the strongest form: the WHOLE board full, every square of it, still
   * collects nothing. Only the ring pays.
   */
  it("reaches nothing from a completely full board", () => {
    const b = empty();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) b[boardAt(r, c)] = tile();
    expect(reachedBoxes(b)).toEqual([]);
  });
});

describe("a word runs off the board into a box", () => {
  /**
   * The rule needs no code of its own, and this is what proves it: `validate`
   * has never heard of a prize box, and a word laid out to the edge and one step
   * past it is simply a word.
   */
  it("accepts a word whose last letter is in a box", () => {
    const box = BOXES.find((b) => b.row < 0 && !isLocked(b))!;
    const col = box.col;
    // "cat" read downwards, ending IN the box at the top - so the box holds the
    // FIRST letter, which is the half of BONUS's rule that is easy to forget.
    const ps: Placement[] = [
      { index: boxIndex(box), letter: "c", wild: false },
      { index: boardAt(0, col), letter: "a", wild: false },
      { index: boardAt(1, col), letter: "t", wild: false },
    ];
    const v = validate(empty(), ps);
    expect(v.ok, v.ok ? "" : `refused: ${v.reason}`).toBe(true);
    expect(reachedBoxes(apply({ ...newGame("medium"), board: empty() }, ps).board)).toEqual([BOXES.indexOf(box)]);
  });

  /**
   * A LONE TILE IN A BOX IS NOT A TURN. The cells either side of a box are dead
   * for ever, so a run through one is a single letter unless it goes into the
   * board - which means "drop a tile in the star and take the prize" is refused
   * by the ordinary word rule, with nothing special written anywhere.
   */
  it("refuses a tile dropped in a box with no word under it", () => {
    const box = BOXES.find((b) => b.row < 0)!;
    const v = validate(empty(), [{ index: boxIndex(box), letter: "a", wild: false }]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("word");
  });

  /** And a dead ring cell refuses a tile outright, whatever is under it. */
  it("refuses a tile on a dead ring cell", () => {
    const corner = 0; // stage 0,0 - a corner, on no row and no column
    expect(PLAYABLE[corner]).toBe(false);
    const v = validate(empty(), [{ index: corner, letter: "a", wild: false }]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("off");
  });
});

describe("padlocks", () => {
  /**
   * Four, and they are SHUT. Step 4 of the game plan gives the wild tile a job
   * and opens them; until then reaching one is a promise rather than a payout,
   * and this pins the count so a later art change cannot quietly open them all.
   */
  it("are the four boxes marked lock, and nothing else", () => {
    const locks = BOXES.filter(isLocked);
    expect(locks).toHaveLength(4);
    for (const b of BOXES) expect(isLocked(b), `${b.art}`).toBe(b.art === "lock");
  });

  /** Every lock prints a number and no open box does - the number is the promise. */
  it("are the only boxes carrying a number", () => {
    for (const b of BOXES) {
      expect(b.value !== undefined, `${b.art} at ${b.row},${b.col}`).toBe(isLocked(b));
    }
  });
});

/**
 * THE RULE BEING RIGHT SAYS NOTHING ABOUT THE RENDERER CALLING IT.
 *
 * Everything above runs `boxes.ts` directly, and every one of those tests
 * passes on a build where the box ring is pure decoration - which is exactly
 * what it was until this change. These read `Lettercross.tsx` instead, the same
 * way `record-is-not-gated-on-the-end.test.ts` does, because the alternative is
 * mounting React to prove a wire exists.
 */
describe("the game actually collects them", () => {
  const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");

  /**
   * The play handler, comments stripped. Anchored on the callback's own closing
   * line rather than on its dependency list - the deps move whenever the
   * handler reads one more thing, and a matcher that goes blind on an ordinary
   * edit reports a clean sweep over a handler it never read.
   */
  function playBody(): string {
    const from = SRC.indexOf("const play = useCallback(");
    const to = SRC.indexOf("\n  }, [", from);
    if (from < 0 || to < 0) return "";
    return SRC.slice(from, to).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  }

  /** The control. Every assertion below is about a string that is absent. */
  it("can read the play handler at all", () => {
    expect(playBody().length, "could not slice the play handler - the matcher is blind")
      .toBeGreaterThan(400);
  });

  it("asks the board which boxes it arrived at", () => {
    expect(playBody()).toMatch(/reachedBoxes\s*\(\s*next\.board\s*\)/);
  });

  /**
   * And DIFFS against what is already reached. Without this the box collects
   * itself again on every later word - the square next to it never empties -
   * so this is the whole difference between a prize and a coin press.
   */
  it("collects a box once, not once per later word", () => {
    expect(playBody()).toMatch(/filter\(\(n\) => !reached\.includes\(n\)\)/);
  });

  /** A padlock is shut until step 4, so it must be excluded from the payout. */
  it("does not pay out a padlock", () => {
    const body = playBody();
    expect(body).toMatch(/opened\s*=\s*arrived\.filter\(\s*\(n\)\s*=>\s*!isLocked/);
    expect(body).toMatch(/for\s*\(const n of prize\)/);
  });

  /**
   * The game reports a REASON. `milestone` is a flat coin and no star, decided
   * in `economy.ts` - a game that could name an amount is a game that can
   * invent its own economics (rewards-economy-convention.md).
   */
  it("reports a reason and never an amount", () => {
    const body = playBody();
    expect(body).toMatch(/reason:\s*"milestone"/);
    expect(body).not.toMatch(/coins\s*:/);
  });

  /** The coins arc from the box, not from the middle of the screen. */
  it("flies the coins from the box that opened", () => {
    expect(playBody()).toMatch(/at:\s*r\s*\?/);
  });

  /**
   * One voice per event. A turn that opens a box plays the win chord instead of
   * the word sound, not on top of it - the same argument the streak ladder
   * already makes in this handler.
   */
  it("lets the box replace the word sound rather than stack on it", () => {
    expect(playBody()).toMatch(/if\s*\(opened\.length === 0\)/);
  });

  /**
   * THE LATCH RIDES THE SNAPSHOT. Without this line, leaving the game and
   * coming back re-collects every box already on the board.
   */
  it("carries the collected boxes in the session snapshot", () => {
    expect(SRC).toMatch(/useGameSession\([\s\S]{0,200}?\breached\b/);
    // A LITERAL, so it has to be bumped by hand every time the shape moves -
    // 3 for `reached`, 4 for the open round, 5 when that became a QUEUE, 6
    // when the boxes became squares and every index moved. What
    // this line really guards is that somebody LOOKED, so a stored snapshot
    // from the old shape is discarded instead of restoring a board whose rules
    // have changed underneath it.
    expect(SRC).toMatch(/version:\s*6/);
    expect(SRC).toMatch(/s\.reached\)/);
  });

  /** A restart is a new run, so the boxes shut again. */
  it("shuts every box again on a restart", () => {
    const from = SRC.indexOf("const reset = useCallback(");
    const to = SRC.indexOf("\n  }, [", from);
    expect(from, "could not slice reset - the matcher is blind").toBeGreaterThan(0);
    expect(SRC.slice(from, to)).toMatch(/setReached\(\[\]\)/);
  });
});

/**
 * THE INVARIANT UNDER THE VERSION NUMBER.
 *
 * A snapshot gains a field and somebody forgets to check it: `validate` then
 * passes a shape it has never seen, and the game restores state written by a
 * build that does not exist any more. Bumping `version` is the other half and
 * is easy to remember; this half is not, because nothing fails when it is
 * missed - the wrong board just renders.
 */
describe("the snapshot gate keeps up with the snapshot", () => {
  const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");

  it("checks every field the session declares", () => {
    const decl = SRC.match(/type LettercrossSession = \{([\s\S]*?)\};/);
    expect(decl, "could not find the session type - the matcher is blind").not.toBeNull();
    const fields = [...decl![1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    expect(fields.length, "found no fields at all").toBeGreaterThan(3);

    const gate = SRC.slice(SRC.indexOf("validate: (value)"), SRC.indexOf("\n};", SRC.indexOf("validate: (value)")));
    expect(gate.length, "could not slice validate - the matcher is blind").toBeGreaterThan(200);
    for (const f of fields) {
      // `state` is checked through its own local, so accept either spelling.
      expect(gate, `the snapshot declares ${f} and validate never reads it`)
        .toMatch(new RegExp(`\\b(s\\.${f}\\b|${f}\\s*=)`));
    }
  });
});
