/**
 * Step 2 of the game plan: reaching a box collects it.
 *
 * The rule under test is `reachIndex` / `reachedBoxes` in `boxes.ts`, which are
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
import { BOXES, reachIndex, reachedBoxes, isLocked, lineOf, sideOf } from "./boxes";
import { SIZE, type Cell } from "./logic";

const rowOf = (i: number) => Math.floor(i / SIZE);
const colOf = (i: number) => i % SIZE;
const empty = (): Cell[] => Array<Cell>(SIZE * SIZE).fill(null);
const tile = (letter = "a"): Cell => ({ letter, wild: false });

describe("reaching a prize box", () => {
  /**
   * THE POSITIVE CONTROL, and it runs first for the reason it always does: every
   * assertion below is about a set of indices, and a `reachIndex` returning
   * nonsense off the board would make most of them pass vacuously. This one
   * cannot pass unless the function is answering at all.
   */
  it("gives every box a real square on the board", () => {
    for (const b of BOXES) {
      const i = reachIndex(b);
      expect(Number.isInteger(i), `${b.art} at ${b.row},${b.col} -> ${i}`).toBe(true);
      expect(i, `${b.art} at ${b.row},${b.col}`).toBeGreaterThanOrEqual(0);
      expect(i, `${b.art} at ${b.row},${b.col}`).toBeLessThan(SIZE * SIZE);
    }
  });

  /**
   * The tie to `lineOf`. Those two answer the same question - one in prose for
   * a human, one as an index for the code - so a box whose reach square is not
   * ON the line `lineOf` names is a box the game and its own explanation
   * disagree about.
   */
  it("puts the square on the very line the box caps", () => {
    for (const b of BOXES) {
      const i = reachIndex(b);
      const line = lineOf(b);
      expect(line, `${b.art} at ${b.row},${b.col} is on no line at all`).not.toBeNull();
      if (line!.startsWith("column")) expect(colOf(i), line!).toBe(b.col);
      else expect(rowOf(i), line!).toBe(b.row);
    }
  });

  /** And at the END of it - the square a word has to run all the way out to. */
  it("puts the square on the edge the box sits against", () => {
    for (const b of BOXES) {
      const i = reachIndex(b);
      const side = sideOf(b);
      if (side === "top") expect(rowOf(i), `${b.art} top`).toBe(0);
      if (side === "bottom") expect(rowOf(i), `${b.art} bottom`).toBe(SIZE - 1);
      if (side === "left") expect(colOf(i), `${b.art} left`).toBe(0);
      if (side === "right") expect(colOf(i), `${b.art} right`).toBe(SIZE - 1);
    }
  });

  /**
   * No two boxes share a square. Two boxes on one line sit at OPPOSITE ends of
   * it, so this is what stops a "reach" opening a box the player never went
   * anywhere near - and it is the assertion that fails first if a side's
   * arithmetic is copied from its opposite.
   */
  it("gives no two boxes the same square", () => {
    const seen = new Map<number, string>();
    for (const b of BOXES) {
      const i = reachIndex(b);
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
  it("reaches all twelve when every square next to one is filled", () => {
    const b = empty();
    for (const box of BOXES) b[reachIndex(box)] = tile();
    expect(reachedBoxes(b)).toHaveLength(BOXES.length);
  });

  it("reaches exactly the one box whose square was filled", () => {
    BOXES.forEach((box, n) => {
      const b = empty();
      b[reachIndex(box)] = tile();
      expect(reachedBoxes(b), `${box.art} at ${box.row},${box.col}`).toEqual([n]);
    });
  });

  /**
   * It DISCRIMINATES. A board with tiles all over the middle reaches nothing,
   * which is what separates "arrived at a box" from "played a word".
   */
  it("reaches nothing from tiles that are not against an edge", () => {
    const b = empty();
    for (let r = 1; r < SIZE - 1; r++) for (let c = 1; c < SIZE - 1; c++) b[r * SIZE + c] = tile();
    expect(reachedBoxes(b)).toEqual([]);
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
    // 3 for `reached`, 4 for the open round, 5 when that became a QUEUE. What
    // this line really guards is that somebody LOOKED, so a stored snapshot
    // from the old shape is discarded instead of restoring a board whose rules
    // have changed underneath it.
    expect(SRC).toMatch(/version:\s*5/);
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
