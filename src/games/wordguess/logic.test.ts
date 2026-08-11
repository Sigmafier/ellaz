import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { EN, HE, type WordLength } from "./words";
import {
  HE_KEYS,
  EN_KEYS,
  MAX_GUESSES,
  backspace,
  finalize,
  isOver,
  keyboardMarks,
  keysFor,
  mark,
  newRound,
  normalize,
  submit,
  typeLetter,
} from "./logic";

const LENGTHS: WordLength[] = [4, 5, 6];

describe("the word lists", () => {
  // Named, not counted. A bare `every(...)` failure says "expected true, got
  // false" and leaves you reading 180 words by eye.
  for (const [label, table] of [["he", HE], ["en", EN]] as const) {
    for (const length of LENGTHS) {
      it(`${label}: every ${length}-letter word is exactly ${length} letters`, () => {
        const wrong = table[length].filter((w) => [...w].length !== length);
        expect(wrong).toEqual([]);
      });
    }

    it(`${label}: has no duplicate words`, () => {
      for (const length of LENGTHS) {
        const list = table[length];
        expect(new Set(list).size).toBe(list.length);
      }
    });

    it(`${label}: every length has enough words to not repeat immediately`, () => {
      for (const length of LENGTHS) expect(table[length].length).toBeGreaterThanOrEqual(20);
    });
  }

  // THE UNWINNABLE-ROUND TRAP. An answer holding a letter the keyboard cannot
  // produce accepts every guess, marks them all correctly, and can only be
  // lost. Nothing throws and nothing looks wrong.
  it("every Hebrew answer can be typed on the Hebrew keyboard", () => {
    const keys = new Set(HE_KEYS);
    const untypeable: string[] = [];
    for (const length of LENGTHS) {
      for (const word of HE[length]) {
        if (!normalize(word).every((ch) => keys.has(ch))) untypeable.push(word);
      }
    }
    expect(untypeable).toEqual([]);
  });

  it("every English answer can be typed on the English keyboard", () => {
    const keys = new Set(EN_KEYS);
    const untypeable: string[] = [];
    for (const length of LENGTHS) {
      for (const word of EN[length]) {
        if (![...word].every((ch) => keys.has(ch))) untypeable.push(word);
      }
    }
    expect(untypeable).toEqual([]);
  });

  it("carries no niqqud — a vowel-pointed word cannot be typed either", () => {
    const pointed: string[] = [];
    for (const length of LENGTHS) {
      for (const word of HE[length]) if (/[֑-ׇ]/.test(word)) pointed.push(word);
    }
    expect(pointed).toEqual([]);
  });
});

describe("final letters", () => {
  it("normalises a final letter to its ordinary twin", () => {
    expect(normalize("מלון")).toEqual(["מ", "ל", "ו", "נ"]);
    expect(normalize("חיוך")).toEqual(["ח", "י", "ו", "כ"]);
    expect(normalize("שמים")).toEqual(["ש", "מ", "י", "מ"]);
    expect(normalize("חורף")).toEqual(["ח", "ו", "ר", "פ"]);
    expect(normalize("קיץ")).toEqual(["ק", "י", "צ"]);
  });

  it("finalises only the LAST letter, and only when it has a final form", () => {
    expect(finalize(["מ", "ל", "ו", "נ"]).join("")).toBe("מלון");
    // The interior mem must stay ordinary. Finalising every candidate would
    // give "םלון" — a word no Hebrew reader would accept.
    expect(finalize(["מ", "י", "ל", "מ"]).join("")).toBe("מילם");
    expect(finalize(["ת", "פ", "ו", "ח"]).join("")).toBe("תפוח");
  });

  it("round-trips every word in the Hebrew list", () => {
    for (const length of LENGTHS) {
      for (const word of HE[length]) {
        expect(finalize(normalize(word)).join("")).toBe(word);
      }
    }
  });

  it("leaves English alone", () => {
    expect(finalize([..."apple"]).join("")).toBe("apple");
  });

  it("finalises an empty row without throwing", () => {
    expect(finalize([])).toEqual([]);
  });

  it("gives the right keyboard per locale", () => {
    expect(keysFor("he")).toBe(HE_KEYS);
    expect(keysFor("en")).toBe(EN_KEYS);
    expect(HE_KEYS).toHaveLength(22);
    expect(EN_KEYS).toHaveLength(26);
    // The keyboard must not offer a final form — it is the same letter twice.
    expect(HE_KEYS.some((k) => "ךםןףץ".includes(k))).toBe(false);
  });
});

describe("marking a guess", () => {
  const t = (w: string) => normalize(w);

  it("marks an exact match all hits", () => {
    expect(mark(t("apple"), t("apple"))).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  });

  it("marks a letter in the wrong place as near", () => {
    expect(mark(t("bird"), t("drib"))).toEqual(["near", "near", "near", "near"]);
  });

  it("marks an absent letter as miss", () => {
    expect(mark(t("bird"), t("cake"))).toEqual(["miss", "miss", "miss", "miss"]);
  });

  // THE DUPLICATE-LETTER BUG, in both directions.
  it("does not promise more copies of a letter than the answer holds", () => {
    // "grass" has two s. "seeds" guesses two s: one hits (last), one is near.
    const marks = mark(t("grass"), t("seeds"));
    expect(marks[4]).toBe("hit"); // the final s
    expect(marks[0]).toBe("near"); // the leading s, justified by the other one
    expect(marks.filter((m) => m !== "miss")).toHaveLength(2);
  });

  it("spends exact hits BEFORE handing out nears", () => {
    // One l in "lemon"; the guess has two. The one in position wins, and the
    // other must be a miss rather than a near.
    const marks = mark(t("lemon"), t("lilac"));
    expect(marks[0]).toBe("hit");
    expect(marks[2]).toBe("miss");
  });

  it("marks a second copy as miss when the answer has only one", () => {
    // "בננה" has two n; "נננה" guesses three.
    const marks = mark(t("בננה"), t("נננה"));
    expect(marks.filter((m) => m === "hit")).toHaveLength(3); // positions 1,2,3
    expect(marks[0]).toBe("miss");
  });

  it("handles Hebrew with a final letter in the answer", () => {
    // Guessing the plain form must hit the answer's final-form letter.
    expect(mark(t("מלון"), t("מלון"))).toEqual(["hit", "hit", "hit", "hit"]);
    expect(mark(t("מלון"), t("נולם"))).toEqual(["near", "near", "near", "near"]);
  });
});

describe("playing a round", () => {
  const round = () => newRound("en", 5, mulberry32(7));

  it("is deterministic for a seeded rng", () => {
    expect(newRound("en", 5, mulberry32(7)).target).toEqual(newRound("en", 5, mulberry32(7)).target);
  });

  it("draws a word of the requested length, in the requested language", () => {
    for (const length of LENGTHS) {
      const s = newRound("he", length, mulberry32(3));
      expect(s.target).toHaveLength(length);
      expect(s.length).toBe(length);
      expect(HE[length].map(normalize).map((w) => w.join(""))).toContain(s.target.join(""));
    }
  });

  it("types and rubs out letters", () => {
    let s = round();
    s = typeLetter(s, "c");
    s = typeLetter(s, "a");
    expect(s.draft).toEqual(["c", "a"]);
    s = backspace(s);
    expect(s.draft).toEqual(["c"]);
  });

  it("refuses to overfill the row", () => {
    let s = round();
    for (const ch of "abcdefgh") s = typeLetter(s, ch);
    expect(s.draft).toHaveLength(5);
  });

  it("backspace on an empty row is a no-op, not an error", () => {
    const s = round();
    expect(backspace(s)).toBe(s);
  });

  it("normalises a typed final letter", () => {
    const s = typeLetter(newRound("he", 4, mulberry32(1)), "ם");
    expect(s.draft).toEqual(["מ"]);
  });

  it("refuses a short row and keeps the draft", () => {
    let s = round();
    s = typeLetter(s, "c");
    const { state, outcome } = submit(s);
    expect(outcome.kind).toBe("short");
    expect(state.draft).toEqual(["c"]);
    expect(state.guesses).toHaveLength(0);
  });

  it("scores a full row, clears the draft and keeps the guess", () => {
    let s = round();
    for (const ch of "grass") s = typeLetter(s, ch);
    const { state, outcome } = submit(s);
    expect(outcome.kind).toBe("scored");
    expect(state.draft).toEqual([]);
    expect(state.guesses).toHaveLength(1);
    expect(state.guesses[0].marks).toHaveLength(5);
  });

  it("solves when the guess matches, and is then over", () => {
    let s = round();
    for (const ch of s.target) s = typeLetter(s, ch);
    const { state, outcome } = submit(s);
    expect(outcome).toMatchObject({ kind: "scored", solved: true, lost: false });
    expect(state.solved).toBe(true);
    expect(isOver(state)).toBe(true);
  });

  // A guess the answer list does not contain is still a fair guess. Refusing
  // it would tell a child their real word is wrong when it is only absent.
  it("accepts a guess that is not in the answer list", () => {
    let s = round();
    for (const ch of "zzzzz") s = typeLetter(s, ch);
    expect(submit(s).outcome.kind).toBe("scored");
  });

  it("is lost after MAX_GUESSES wrong rows, and reports it once", () => {
    let s = round();
    const wrong = s.target.join("") === "zzzzz" ? "qqqqq" : "zzzzz";
    let lostSeen = 0;
    for (let i = 0; i < MAX_GUESSES; i++) {
      for (const ch of wrong) s = typeLetter(s, ch);
      const r = submit(s);
      s = r.state;
      if (r.outcome.kind === "scored" && r.outcome.lost) lostSeen++;
    }
    expect(lostSeen).toBe(1);
    expect(s.solved).toBe(false);
    expect(isOver(s)).toBe(true);
  });

  it("ignores everything once the round is over", () => {
    let s = round();
    for (const ch of s.target) s = typeLetter(s, ch);
    s = submit(s).state;
    expect(typeLetter(s, "a")).toBe(s);
    expect(backspace(s)).toBe(s);
    expect(submit(s).outcome.kind).toBe("ignored");
  });
});

describe("the keyboard colouring", () => {
  it("keeps the BEST mark a letter has earned", () => {
    let s = newRound("en", 5, mulberry32(7));
    // Two guesses over the same letter: near first, then hit.
    const target = s.target.join("");
    s = { ...s, guesses: [
      { letters: [...target].reverse(), marks: ["near", "near", "near", "near", "near"] },
      { letters: [...target], marks: ["hit", "hit", "hit", "hit", "hit"] },
    ] };
    const marks = keyboardMarks(s);
    for (const ch of new Set(target)) expect(marks[ch]).toBe("hit");
  });

  it("is empty before the first guess", () => {
    expect(keyboardMarks(newRound("en", 5, mulberry32(7)))).toEqual({});
  });
});
