import { describe, expect, it } from "vitest";
import {
  BH, BONUS_MS, BONUS_TILES, BW, MINI_TARGET, MIN_VOWELS, dealTiles, emptyMini,
  miniQuality, scoreMini, type MiniCell,
} from "./bonusBoard";
import { tierOf } from "./bonus";
import { LETTER_VALUE } from "./logic";
import { WORDS } from "./words";

/** A deterministic rng, so a deal can be followed rather than guessed at. */
const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
};

const put = (b: MiniCell[], r: number, c: number, word: string, down = false) => {
  [...word].forEach((ch, k) => { b[(r + (down ? k : 0)) * BW + c + (down ? 0 : k)] = ch; });
  return b;
};
const val = (w: string) => [...w].reduce((n, ch) => n + (LETTER_VALUE[ch] ?? 0), 0);

describe("the words this file is tested with are real", () => {
  // The positive control. Every assertion below is about scoring a word, and
  // all of them pass vacuously if the dictionary cannot see one.
  it("knows cat, note, star and quiz", () => {
    for (const w of ["cat", "note", "star", "quiz", "hat", "at"])
      expect(WORDS.has(w), `${w} is not in the list - every score test is blind`).toBe(true);
  });
  it("does not know the nonsense used as a negative", () => {
    for (const w of ["zzq", "xqj"]) expect(WORDS.has(w)).toBe(false);
  });
});

describe("the strip", () => {
  it("is nine wide, so a cell is the main board's cell", () => {
    expect(BW).toBe(9);
    expect(BH).toBe(5);
    expect(emptyMini().length).toBe(45);
  });
  it("gives a minute, which is BONUS's own", () => {
    expect(BONUS_MS).toBe(60_000);
    expect(BONUS_TILES).toBe(16);
  });
});

describe("the deal", () => {
  it("hands out the right number of real letters", () => {
    for (let s = 1; s < 40; s++) {
      const t = dealTiles(seeded(s));
      expect(t).toHaveLength(BONUS_TILES);
      for (const ch of t) expect(ch).toMatch(/^[a-z]$/);
    }
  });

  it("never leaves a rack that cannot spell anything", () => {
    for (let s = 1; s < 200; s++) {
      const v = dealTiles(seeded(s)).filter((c) => "aeiou".includes(c)).length;
      expect(v, `seed ${s} dealt ${v} vowels`).toBeGreaterThanOrEqual(MIN_VOWELS);
    }
  });

  it("the vowel floor can actually fire - an all-consonant draw is repaired", () => {
    // The control for the control: without this, "every deal has 5 vowels"
    // would pass on an rng that happened never to starve one.
    const consonantOnly = () => 0.999999;          // lands on the pool's tail
    const t = dealTiles(consonantOnly);
    expect(t.filter((c) => "aeiou".includes(c)).length).toBeGreaterThanOrEqual(MIN_VOWELS);
  });

  it("is a FLOOR and not a quota - a generous deal is left alone", () => {
    const allVowels = () => 0;                      // the pool starts with e
    expect(dealTiles(allVowels).every((c) => "aeiou".includes(c))).toBe(true);
  });

  it("allows repeats, as the original's own description does", () => {
    let sawRepeat = false;
    for (let s = 1; s < 60 && !sawRepeat; s++) {
      const t = dealTiles(seeded(s));
      sawRepeat = new Set(t).size < t.length;
    }
    expect(sawRepeat, "no deal in 60 ever repeated a letter").toBe(true);
  });
});

describe("scoring the strip", () => {
  it("scores nothing on an empty board, and calls nothing illegal", () => {
    const s = scoreMini(emptyMini());
    expect(s.total).toBe(0);
    expect(s.words).toHaveLength(0);
    expect(s.bad).toHaveLength(0);
  });

  it("scores a word across by its letters", () => {
    const b = put([...emptyMini()], 1, 2, "note");
    const s = scoreMini(b);
    expect(s.bad).toHaveLength(0);
    expect(s.words.map((w) => w.word)).toEqual(["note"]);
    expect(s.total).toBe(val("note"));
  });

  it("scores a word down as well", () => {
    const s = scoreMini(put([...emptyMini()], 0, 4, "star", true));
    expect(s.words.map((w) => w.word)).toEqual(["star"]);
    expect(s.total).toBe(val("star"));
  });

  it("counts a crossing word once each way, never twice", () => {
    const b = [...emptyMini()];
    put(b, 2, 1, "cat");            // across: c(2,1) a(2,2) t(2,3)
    put(b, 0, 3, "hat", true);      // down through that same 't' at (2,3)
    const s = scoreMini(b);
    expect(s.bad, `unexpected bad: ${s.bad.join(",")}`).toHaveLength(0);
    expect(s.words.map((w) => w.word).sort()).toEqual(["cat", "hat"]);
    expect(s.total, "the shared 't' is paid on both words, as a crossword does")
      .toBe(val("cat") + val("hat"));
  });

  it("ignores a lone tile - an abandoned letter is not a crime", () => {
    const b = [...emptyMini()];
    put(b, 0, 0, "cat");
    b[4 * BW + 8] = "z";            // stranded in the far corner
    const s = scoreMini(b);
    expect(s.bad).toHaveLength(0);
    expect(s.total).toBe(val("cat"));
  });

  it("zeroes the WHOLE round on one illegal word - the original's rule", () => {
    const b = [...emptyMini()];
    put(b, 0, 0, "cat");
    put(b, 2, 0, "zzq");
    const s = scoreMini(b);
    expect(s.bad).toEqual(["zzq"]);
    expect(s.words.map((w) => w.word)).toEqual(["cat"]);   // still reported
    expect(s.total, "a legal word must not survive an illegal one").toBe(0);
  });

  it("reads a two-letter run as a word, because the game does", () => {
    const s = scoreMini(put([...emptyMini()], 3, 3, "at"));
    expect(s.total).toBe(val("at"));
  });
});

describe("what a round is worth", () => {
  const board = (...ws: [number, number, string, boolean?][]) => {
    const b = [...emptyMini()];
    for (const [r, c, w, d] of ws) put(b, r, c, w, d ?? false);
    return scoreMini(b).total;
  };

  it("one word is easy, two medium, three hard", () => {
    // Pinned against REAL words rather than against MINI_TARGET, so lowering
    // the target to flatter a player changes a RUNG here and cannot be a quiet
    // re-tune. cat/note/star are four points each off common letters.
    const one = board([0, 0, "cat"]);
    const two = board([0, 0, "cat"], [2, 0, "note"]);
    const three = board([0, 0, "cat"], [2, 0, "note"], [4, 0, "star"]);
    expect([one, two, three]).toEqual([4, 8, 12]);
    expect(tierOf(miniQuality(one))).toBe("easy");
    expect(tierOf(miniQuality(two))).toBe("medium");
    expect(tierOf(miniQuality(three))).toBe("hard");
  });

  it("one expensive word can carry a round on its own", () => {
    expect(tierOf(miniQuality(board([1, 1, "quiz"])))).toBe("hard");
  });

  it("a zeroed round still pays the floor, never a punishment", () => {
    const zeroed = board([0, 0, "cat"], [2, 0, "zzq"]);
    expect(zeroed).toBe(0);
    expect(tierOf(miniQuality(zeroed))).toBe("easy");
  });

  it("clamps, and never reports a quality outside 0..1", () => {
    for (const n of [-9, 0, 7, MINI_TARGET, 999]) {
      const q = miniQuality(n);
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
    }
  });
});
