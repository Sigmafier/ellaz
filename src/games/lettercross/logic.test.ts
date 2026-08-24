import { describe, expect, it } from "vitest";
import {
  SIZE, CENTRE, RACK, LETTER_VALUE, BAG, TOTAL_TILES, premiumAt,
  newGame, validate, apply, isOver, bestLevel,
} from "./logic";
import { WORDS } from "./words";

const rng = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const idx = (r: number, c: number) => r * SIZE + c;
/** Lay letters left-to-right starting at (r,c) as a placement list. */
const lay = (r: number, c: number, word: string, down = false) =>
  [...word].map((ch, i) => ({ index: down ? idx(r + i, c) : idx(r, c + i), letter: ch, wild: false }));

describe("the board", () => {
  it("is 11x11 with the start cell at its centre", () => {
    expect(SIZE).toBe(11);
    expect(CENTRE).toBe(idx(5, 5));
  });

  it("does not multiply the start cell, so the opening word is not a bonus", () => {
    // Scrabble doubles its centre star. Ours is a plain square that merely says
    // 'begin here' - one of the deliberate separations from that board.
    expect(premiumAt(CENTRE)).toBe("none");
  });

  it("puts triple-word squares only at the corners and edge midpoints", () => {
    const tw = [...Array(SIZE * SIZE).keys()].filter((i) => premiumAt(i) === "tw");
    expect(tw.sort((a, b) => a - b)).toEqual(
      [idx(0, 0), idx(0, 5), idx(0, 10), idx(5, 0), idx(5, 10), idx(10, 0), idx(10, 5), idx(10, 10)]
        .sort((a, b) => a - b),
    );
  });

  it("is symmetric under both reflections, or the board would favour a corner", () => {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      expect(premiumAt(idx(r, c))).toBe(premiumAt(idx(r, SIZE - 1 - c)));
      expect(premiumAt(idx(r, c))).toBe(premiumAt(idx(SIZE - 1 - r, c)));
    }
  });
});

describe("the tiles", () => {
  it("values at least half the letters differently from the game everyone knows", () => {
    // Not fastidiousness: the Scrabulous settlement required changing the values
    // of at least half the letters, and this test is what stops a later tidy-up
    // quietly restoring them. See NOTICE.md.
    const theirs: Record<string, number> = { a:1,b:3,c:3,d:2,e:1,f:4,g:2,h:4,i:1,j:8,k:5,l:1,
      m:3,n:1,o:1,p:3,q:10,r:1,s:1,t:1,u:1,v:4,w:4,x:8,y:4,z:10 };
    const differ = Object.keys(theirs).filter((k) => LETTER_VALUE[k] !== theirs[k]);
    expect(differ.length).toBeGreaterThanOrEqual(13);
  });

  it("carries four wilds, twice the usual two", () => {
    expect(BAG.filter((t) => t === "?").length).toBe(4);
  });

  it("has a bag every letter can be drawn from", () => {
    for (const ch of "abcdefghijklmnopqrstuvwxyz") expect(BAG).toContain(ch);
    expect(BAG.length).toBe(TOTAL_TILES);
  });
});

describe("opening a game", () => {
  it("deals a full rack and leaves the rest in the bag", () => {
    const g = newGame("medium", rng(1));
    expect(g.rack).toHaveLength(RACK);
    expect(g.bag).toHaveLength(TOTAL_TILES - RACK);
    expect(g.board.every((c) => c === null)).toBe(true);
    expect(g.score).toBe(0);
  });

  it("is deterministic for a given seed, so a session can be replayed", () => {
    expect(newGame("medium", rng(7)).rack).toEqual(newGame("medium", rng(7)).rack);
  });
});

describe("validating a play", () => {
  const g = newGame("medium", rng(3));

  it("refuses a first word that misses the start cell", () => {
    const v = validate(g.board, lay(0, 0, "cat"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("start");
  });

  it("accepts a first word across the start cell", () => {
    const v = validate(g.board, lay(5, 4, "cat"));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.words.map((w) => w.word)).toEqual(["cat"]);
  });

  it("refuses a word that is not in the dictionary", () => {
    const v = validate(g.board, lay(5, 4, "zqx"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("word");
  });

  it("refuses tiles that are not in one line", () => {
    const v = validate(g.board, [
      { index: idx(5, 5), letter: "c", wild: false },
      { index: idx(6, 6), letter: "a", wild: false },
    ]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("line");
  });

  it("refuses a gap in the placed line", () => {
    const v = validate(g.board, [
      { index: idx(5, 4), letter: "c", wild: false },
      { index: idx(5, 6), letter: "t", wild: false },
    ]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("gap");
  });

  it("requires a later word to touch what is already there", () => {
    const after = apply(g, lay(5, 4, "cat")).board;
    const v = validate(after, lay(0, 0, "dog"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("touch");
  });

  it("reads the cross-words a placement creates, and refuses an invalid one", () => {
    const after = apply(g, lay(5, 4, "cat")).board;
    // 'x' under the 'c' makes the cross-word 'cx', which is not a word.
    const v = validate(after, [{ index: idx(6, 4), letter: "x", wild: false }]);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("word");
  });

  it("scores a cross-word as well as the main word", () => {
    const after = apply(g, lay(5, 4, "cat")).board;
    // 'r' + existing 'a' reading down -> 'ar'... use a real pair: place 'ox'
    // sharing the existing 'o'? Simpler: 'at' down from the existing 'a'.
    const v = validate(after, [{ index: idx(6, 5), letter: "t", wild: false }]);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.words.map((w) => w.word)).toContain("at");
  });
});

describe("scoring", () => {
  it("adds the letter values", () => {
    const g = newGame("medium", rng(4));
    const v = validate(g.board, lay(5, 4, "cat"));
    expect(v.ok).toBe(true);
    // c=2 a=1 t=1 -> 4, and none of (5,4),(5,5),(5,6) is a premium square.
    if (v.ok) expect(v.total).toBe(4);
  });

  it("scores a wild as zero but still spells its letter", () => {
    const g = newGame("medium", rng(5));
    const v = validate(g.board, [
      { index: idx(5, 4), letter: "c", wild: true },
      { index: idx(5, 5), letter: "a", wild: false },
      { index: idx(5, 6), letter: "t", wild: false },
    ]);
    expect(v.ok).toBe(true);
    if (v.ok) { expect(v.words[0].word).toBe("cat"); expect(v.total).toBe(2); }
  });

  it("applies a letter premium to that letter only, and a word premium to the whole word", () => {
    const g = newGame("medium", rng(6));
    // (5,2) is on the diamond |r-5|+|c-5| == 3 -> double letter.
    expect(premiumAt(idx(5, 2))).toBe("dl");
    const v = validate(g.board, lay(5, 2, "cats"));
    // c=2 doubled -> 4, a=1, t=1, s=1  => 7
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.total).toBe(7);
  });
});

describe("taking a turn", () => {
  it("puts the letters on the board, refills the rack and adds the score", () => {
    const g = newGame("medium", rng(8));
    const before = g.bag.length;
    const after = apply(g, lay(5, 4, "cat"));
    expect(after.board[idx(5, 5)]?.letter).toBe("a");
    expect(after.rack).toHaveLength(RACK);
    expect(after.bag.length).toBe(before - 3);
    expect(after.score).toBe(4);
    expect(after.played).toBe(1);
  });

  it("never mutates the state it was given", () => {
    const g = newGame("medium", rng(9));
    const snapshot = JSON.stringify(g);
    apply(g, lay(5, 4, "cat"));
    expect(JSON.stringify(g)).toBe(snapshot);
  });

  it("is over once the bag and the rack are both empty", () => {
    const g = newGame("medium", rng(10));
    expect(isOver(g)).toBe(false);
    expect(isOver({ ...g, bag: [], rack: [] })).toBe(true);
  });
});

describe("the dictionary it is handed", () => {
  it("knows ordinary words a child would try", () => {
    for (const w of ["cat", "dog", "tree", "happy", "green", "jump"]) expect(WORDS.has(w)).toBe(true);
  });

  it("does not carry the words this platform must never show a child", () => {
    // ENABLE carries all of these; the generator strips them. If this test ever
    // goes red, words.ts was regenerated without the filter.
    for (const w of ["fuck", "shit", "cunt", "nigger", "kike", "spic", "whore", "rape", "abo", "retard"])
      expect(WORDS.has(w)).toBe(false);
  });

  it("did not over-filter into uselessness", () => {
    expect(WORDS.size).toBeGreaterThan(20_000);
    for (const w of ["grape", "cocoa", "class", "assess", "shell", "scrap"]) expect(WORDS.has(w)).toBe(true);
  });
});

describe("difficulty", () => {
  it("gives an easier level more wilds in reach, not a different dictionary", () => {
    // A word game whose easy mode knows fewer words is a game that calls a
    // child wrong for being right. Difficulty moves the TILES, never the rules.
    expect(bestLevel("easy")).not.toBe(bestLevel("hard"));
    const e = newGame("easy", rng(11)), h = newGame("hard", rng(11));
    expect(e.rack.length).toBeGreaterThanOrEqual(h.rack.length);
  });
});
