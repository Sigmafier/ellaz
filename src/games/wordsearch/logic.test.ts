import { describe, expect, it } from "vitest";
import { mulberry32, seedFrom } from "@shared/rng";
import { SHIPPED_LOCALES, type ShippedLocale } from "@i18n/locales";
import {
  LEVELS,
  LEVEL_IDS,
  alphabetOf,
  cellsFor,
  clearAnchor,
  colOf,
  contentLangOptions,
  deal,
  everyWordOccurs,
  foundCount,
  isSolved,
  judge,
  letters,
  lineBetween,
  newGame,
  occurrences,
  readingSense,
  resolve,
  rowOf,
  scoreFor,
  stepOf,
  tap,
  textOn,
  type Cell,
  type DirName,
  type LevelId,
  type WordSearchState,
} from "./logic";
import { WORD_POOL } from "./words";

const rngFor = (label: string) => mulberry32(seedFrom(label));

/** Every (level, language) pair, which is the population every deal test wants. */
const COMBOS: Array<[LevelId, ShippedLocale]> = LEVEL_IDS.flatMap((l) =>
  SHIPPED_LOCALES.map((lang) => [l, lang] as [LevelId, ShippedLocale]),
);

/** Start a selection at `a` and finish it at `b`, the way a drag or two taps do. */
function select(state: WordSearchState, a: Cell, b: Cell) {
  return resolve({ ...state, anchor: a }, b);
}

describe("the tiers", () => {
  it("LEVEL_IDS and LEVELS name the same three tiers", () => {
    expect([...LEVEL_IDS].sort()).toEqual(Object.keys(LEVELS).sort());
  });

  it("easy hides words across and down only", () => {
    expect([...LEVELS.easy.dirs].sort()).toEqual(["across", "down"]);
  });

  it("hard opens every direction, diagonals and reversals included", () => {
    expect(LEVELS.hard.dirs).toHaveLength(8);
    expect(LEVELS.hard.dirs).toContain("acrossBack");
    expect(LEVELS.hard.dirs).toContain("diagUpBack");
  });

  it("the grid, the list and the direction set all grow with the tier", () => {
    const sizes = LEVEL_IDS.map((l) => LEVELS[l].size);
    const counts = LEVEL_IDS.map((l) => LEVELS[l].words);
    const dirs = LEVEL_IDS.map((l) => LEVELS[l].dirs.length);
    for (const row of [sizes, counts, dirs]) {
      expect(row[0]).toBeLessThan(row[1]);
      expect(row[1]).toBeLessThan(row[2]);
    }
  });

  it("no tier asks for a word longer than its own grid", () => {
    for (const id of LEVEL_IDS) {
      expect(LEVELS[id].maxLetters).toBeLessThanOrEqual(LEVELS[id].size);
    }
  });
});

describe("which way a language reads", () => {
  it("Hebrew reads right to left and the Latin scripts read left to right", () => {
    expect(readingSense("he")).toBe(-1);
    expect(readingSense("en")).toBe(1);
    expect(readingSense("es")).toBe(1);
  });

  it("answers for every language the app ships strings in", () => {
    // The gate that catches a fourth language: a ternary on `lang === "he"` is
    // right for these three and wrong the day Arabic arrives, which is RTL and
    // is not Hebrew.
    for (const lang of SHIPPED_LOCALES) {
      expect(Math.abs(readingSense(lang))).toBe(1);
    }
  });

  it("`across` follows the reader, so one name is one experience", () => {
    expect(stepOf("across", "he")).toEqual({ dr: 0, dc: -1 });
    expect(stepOf("across", "en")).toEqual({ dr: 0, dc: 1 });
    expect(stepOf("acrossBack", "he")).toEqual({ dr: 0, dc: 1 });
  });

  it("down is top to bottom in every language, Hebrew included", () => {
    for (const lang of SHIPPED_LOCALES) {
      expect(stepOf("down", lang)).toEqual({ dr: 1, dc: 0 });
    }
  });

  it("the forward diagonal descends along the reading sense", () => {
    expect(stepOf("diagDown", "he")).toEqual({ dr: 1, dc: -1 });
    expect(stepOf("diagDown", "en")).toEqual({ dr: 1, dc: 1 });
  });
});

describe("the geometry", () => {
  it("a word cannot leave one edge and reappear at the other", () => {
    // Cell 7 is the last column of row 0 on an 8-wide grid, and 7 + 1 is the
    // FIRST column of row 1. Index arithmetic would accept that; this must not.
    expect(cellsFor(8, 7, "across", "en", 2)).toBeNull();
    expect(cellsFor(8, 6, "across", "en", 2)).toEqual([6, 7]);
  });

  it("runs a Hebrew word leftwards from its start", () => {
    expect(cellsFor(8, 7, "across", "he", 3)).toEqual([7, 6, 5]);
    expect(cellsFor(8, 1, "across", "he", 3)).toBeNull();
  });

  it("refuses a start that is not on the board", () => {
    expect(cellsFor(8, 64, "down", "en", 2)).toBeNull();
    expect(cellsFor(8, -1, "down", "en", 2)).toBeNull();
  });

  it("joins two cells on a row, a column or a diagonal", () => {
    expect(lineBetween(8, 0, 3)).toEqual([0, 1, 2, 3]);
    expect(lineBetween(8, 0, 16)).toEqual([0, 8, 16]);
    expect(lineBetween(8, 0, 18)).toEqual([0, 9, 18]);
    expect(lineBetween(8, 18, 0)).toEqual([18, 9, 0]);
  });

  it("returns null for two cells that are not on one line", () => {
    expect(lineBetween(8, 0, 10)).toBeNull();
    expect(lineBetween(8, 0, 17)).toBeNull();
  });

  it("a single cell is a line of one", () => {
    expect(lineBetween(8, 5, 5)).toEqual([5]);
  });
});

describe("a dealt board", () => {
  it.each(COMBOS)("%s/%s lists only words that are really there", (level, lang) => {
    for (let seed = 0; seed < 40; seed++) {
      const { state, placements } = deal(level, lang, rngFor(`${level}-${lang}-${seed}`));
      for (const word of state.words) {
        expect(
          occurrences(state, word).length,
          `${level}/${lang} seed ${seed}: "${word}" is on the list and not on the board`,
        ).toBeGreaterThan(0);
      }
      // ...and the generator's own record agrees with the grid, which is what
      // makes `placements` evidence rather than an opinion.
      for (const p of placements) {
        expect(textOn(state, p.cells)).toBe(p.word);
      }
    }
  });

  it.each(COMBOS)("%s/%s fills every square", (level, lang) => {
    for (let seed = 0; seed < 20; seed++) {
      const { state } = deal(level, lang, rngFor(`fill-${level}-${lang}-${seed}`));
      expect(state.grid).toHaveLength(state.size * state.size);
      expect(state.grid.filter((g) => g === "")).toEqual([]);
    }
  });

  it.each(COMBOS)("%s/%s draws only letters of its own alphabet", (level, lang) => {
    const alphabet = alphabetOf(lang);
    for (let seed = 0; seed < 20; seed++) {
      const { state } = deal(level, lang, rngFor(`alpha-${level}-${lang}-${seed}`));
      const strays = [...new Set(state.grid)].filter((g) => !alphabet.has(g));
      expect(strays, `${level}/${lang} seed ${seed} drew ${strays.join("")}`).toEqual([]);
    }
  });

  it.each(COMBOS)("%s/%s hands over a full list", (level, lang) => {
    let short = 0;
    for (let seed = 0; seed < 40; seed++) {
      const { state } = deal(level, lang, rngFor(`count-${level}-${lang}-${seed}`));
      expect(state.words.length).toBeLessThanOrEqual(LEVELS[level].words);
      expect(state.found).toHaveLength(state.words.length);
      if (state.words.length < LEVELS[level].words) short++;
    }
    // A shrink is a legal outcome and not a common one. Pinned rather than
    // forbidden, because a deal that HANGS until the list is full is the worse
    // bug and this is the number that says whether the bound is doing harm.
    expect(short, `${level}/${lang} shrank the list on ${short} of 40 deals`).toBe(0);
  });

  it.each(COMBOS)("%s/%s respects its own length band", (level, lang) => {
    const { minLetters, maxLetters } = LEVELS[level];
    for (let seed = 0; seed < 15; seed++) {
      const { state } = deal(level, lang, rngFor(`len-${level}-${lang}-${seed}`));
      for (const w of state.words) {
        expect(letters(w).length).toBeGreaterThanOrEqual(minLetters);
        expect(letters(w).length).toBeLessThanOrEqual(maxLetters);
      }
    }
  });

  it("never puts one listed word inside another", () => {
    for (const [level, lang] of COMBOS) {
      for (let seed = 0; seed < 15; seed++) {
        const { state } = deal(level, lang, rngFor(`clash-${level}-${lang}-${seed}`));
        for (const a of state.words) {
          for (const b of state.words) {
            if (a === b) continue;
            expect(a.includes(b), `"${b}" sits inside "${a}"`).toBe(false);
          }
        }
      }
    }
  });

  it("plants easy boards across and down only", () => {
    const used = new Set<DirName>();
    for (const lang of SHIPPED_LOCALES) {
      for (let seed = 0; seed < 25; seed++) {
        for (const p of deal("easy", lang, rngFor(`dir-easy-${lang}-${seed}`)).placements) {
          used.add(p.dir);
        }
      }
    }
    expect([...used].sort()).toEqual(["across", "down"]);
  });

  it("plants hard boards in directions easy never reaches", () => {
    const used = new Set<DirName>();
    for (const lang of SHIPPED_LOCALES) {
      for (let seed = 0; seed < 25; seed++) {
        for (const p of deal("hard", lang, rngFor(`dir-hard-${lang}-${seed}`)).placements) {
          used.add(p.dir);
        }
      }
    }
    expect(used.size).toBe(8);
  });

  it("runs every horizontal Hebrew word right to left, and every English one left to right", () => {
    // THE PIN FOR THE DIRECTION DECISION. A Hebrew grid planted the Latin way
    // renders perfectly, passes every other assertion in this file, and is
    // simply unreadable to the person looking at it - so it has to be checked
    // as a property of the cells rather than noticed by eye.
    const check = (lang: ShippedLocale, expected: number) => {
      for (let seed = 0; seed < 25; seed++) {
        for (const p of deal("medium", lang, rngFor(`sense-${lang}-${seed}`)).placements) {
          if (p.dir !== "across") continue;
          const step = colOf(p.cells[1], 10) - colOf(p.cells[0], 10);
          expect(step, `${lang} "${p.word}" runs the wrong way`).toBe(expected);
        }
      }
    };
    check("he", -1);
    check("en", 1);
    check("es", 1);
  });

  it("is deterministic - the same seed replays the same board", () => {
    const a = deal("hard", "he", rngFor("same")).state;
    const b = deal("hard", "he", rngFor("same")).state;
    expect(b.grid).toEqual(a.grid);
    expect(b.words).toEqual(a.words);
  });

  it("does not show the list in length order", () => {
    // A list sorted longest-first tells the player which word to hunt first,
    // which is a hint nobody asked to give. The DEAL places longest-first on
    // purpose; the LIST is shuffled again after.
    let sorted = 0;
    for (let seed = 0; seed < 30; seed++) {
      const { state } = deal("hard", "en", rngFor(`order-${seed}`));
      const lens = state.words.map((w) => letters(w).length);
      if (lens.every((n, i) => i === 0 || lens[i - 1] >= n)) sorted++;
    }
    expect(sorted).toBeLessThan(3);
  });
});

describe("judging a selection", () => {
  const { state, placements } = deal("medium", "en", rngFor("judge"));

  it("accepts the cells a word was planted on", () => {
    for (const p of placements) {
      const i = state.words.indexOf(p.word);
      expect(judge(state, p.cells)).toBe(i);
    }
  });

  it("accepts the same cells dragged from the other end", () => {
    const p = placements[0];
    expect(judge(state, [...p.cells].reverse())).toBe(state.words.indexOf(p.word));
  });

  it("refuses a run of letters that is not on the list", () => {
    // Every three-in-a-row on the top edge, minus the ones that really are a
    // listed word. At least one must be refused, or this proves nothing.
    let refused = 0;
    for (let c = 0; c + 2 < state.size; c++) {
      const cells = [c, c + 1, c + 2];
      if (judge(state, cells) < 0) refused++;
    }
    expect(refused).toBeGreaterThan(0);
  });

  it("refuses a selection of one square", () => {
    expect(judge(state, [0])).toBe(-1);
  });

  it("will not award the same word twice", () => {
    const p = placements[0];
    const i = state.words.indexOf(p.word);
    const marked: WordSearchState = {
      ...state,
      found: state.found.map((f, k) => (k === i ? p.cells : f)),
    };
    expect(judge(marked, p.cells)).toBe(-1);
  });
});

describe("a word the filler spelled by accident", () => {
  /**
   * THE NEGATIVE CONTROL for the design decision in `logic.ts`'s header. The
   * generator plants each word once; the filler can spell it again somewhere
   * else, and a game that matched the selection against a stored answer key
   * would refuse a player who found the second copy. This game accepts any
   * occurrence, so both must be accepted.
   */
  it("is accepted at the place the player actually found it", () => {
    const { state, placements } = deal("easy", "en", rngFor("accident"));
    const word = placements[0].word;
    const glyphs = letters(word);
    const taken = new Set(placements.flatMap((p) => p.cells));

    // Plant a second copy by hand, on the first horizontal run that no planted
    // word touches. This is exactly the shape the filler produces by chance,
    // and putting it somewhere disjoint is what makes the assertion below about
    // the SECOND copy rather than about the first.
    let cells: Cell[] | null = null;
    for (let r = 0; r < state.size && !cells; r++) {
      for (let c = 0; c + glyphs.length <= state.size; c++) {
        const run = glyphs.map((_, i) => r * state.size + c + i);
        if (run.every((x) => !taken.has(x))) {
          cells = run;
          break;
        }
      }
    }
    expect(cells, "no clear run to plant into - the fixture, not the game").not.toBeNull();

    const grid = state.grid.slice();
    cells!.forEach((c, i) => (grid[c] = glyphs[i]));
    const planted: WordSearchState = { ...state, grid };

    expect(occurrences(planted, word).length).toBeGreaterThanOrEqual(2);
    expect(judge(planted, cells!), "the accidental copy was refused").toBe(
      planted.words.indexOf(word),
    );
    // ...and the one the generator laid is still accepted.
    expect(judge(planted, placements[0].cells)).toBe(planted.words.indexOf(word));
  });

  it("really does happen on boards nobody tampered with", () => {
    // Not a rule, a MEASUREMENT, pinned to the seed that produces it. If this
    // situation never arose the control above would be guarding nothing and the
    // whole accept-any decision would be theatre - so the fixture is a real
    // board rather than a hand-built one.
    //
    // TURTLE is planted across cells 18-23 on this board and the filler spells
    // it a second time running DOWN from the same corner. Found by sweeping
    // 36,000 deals; `scripts/sim/wordsearch-grids.mjs` reports how rare that is.
    const { state, placements } = deal("easy", "en", rngFor("easy-en-2519"));
    const word = "TURTLE";
    expect(state.words).toContain(word);

    const spots = occurrences(state, word);
    expect(spots.length).toBe(2);
    const planted = placements.find((p) => p.word === word)!.cells;
    const accidental = spots.find((s) => s.join() !== planted.join())!;
    expect(accidental).toBeDefined();

    // The whole point: the player found it here, so it counts here.
    expect(judge(state, accidental)).toBe(state.words.indexOf(word));
    const step = select(state, accidental[0], accidental[accidental.length - 1]);
    expect(step.outcome.kind).toBe("found");
    if (step.outcome.kind === "found") expect(step.outcome.cells).toEqual(accidental);
  });
});

describe("tapping", () => {
  const { state, placements } = deal("easy", "en", rngFor("tap"));

  it("the first tap anchors", () => {
    const step = tap(state, 5);
    expect(step.outcome).toEqual({ kind: "anchored", cell: 5 });
    expect(step.state.anchor).toBe(5);
  });

  it("tapping the anchor again lets go of it", () => {
    const step = tap(tap(state, 5).state, 5);
    expect(step.outcome.kind).toBe("cleared");
    expect(step.state.anchor).toBeNull();
  });

  it("two taps finish a word, with no drag anywhere", () => {
    const p = placements[0];
    const first = tap(state, p.cells[0]);
    const second = tap(first.state, p.cells[p.cells.length - 1]);
    expect(second.outcome.kind).toBe("found");
    expect(second.state.anchor).toBeNull();
    expect(foundCount(second.state)).toBe(1);
  });

  it("a miss leaves the board exactly as it was", () => {
    const step = select(state, 0, 1);
    expect(step.outcome.kind === "missed" || step.outcome.kind === "found").toBe(true);
    if (step.outcome.kind === "missed") {
      expect(step.state.found).toEqual(state.found);
      expect(step.state.anchor).toBeNull();
    }
  });

  it("a second tap that is not on a line re-anchors instead of refusing", () => {
    const step = select(state, 0, 10); // a knight's move on an 8-wide grid
    expect(step.outcome).toEqual({ kind: "anchored", cell: 10 });
    expect(step.state.anchor).toBe(10);
  });

  it("ignores a tap that is not on the board", () => {
    expect(tap(state, 999).outcome.kind).toBe("ignored");
    expect(resolve(state, 3).outcome.kind).toBe("ignored"); // nothing anchored yet
  });

  it("marks the cells the player selected, not the ones the deal used", () => {
    const p = placements[0];
    const reversed = [...p.cells].reverse();
    const step = select(state, reversed[0], reversed[reversed.length - 1]);
    expect(step.outcome.kind).toBe("found");
    if (step.outcome.kind === "found") expect(step.outcome.cells).toEqual(reversed);
  });

  it("clearAnchor drops a selection in progress", () => {
    expect(clearAnchor(tap(state, 4).state).anchor).toBeNull();
    expect(clearAnchor(state)).toBe(state);
  });
});

describe("finishing", () => {
  it("is solved only when every word is marked", () => {
    const { state, placements } = deal("easy", "es", rngFor("solve"));
    let s = state;
    expect(isSolved(s)).toBe(false);
    for (const p of placements) {
      const step = select(s, p.cells[0], p.cells[p.cells.length - 1]);
      s = step.state;
    }
    expect(foundCount(s)).toBe(s.words.length);
    expect(isSolved(s)).toBe(true);
  });

  it("an empty list is not a win", () => {
    const empty: WordSearchState = {
      size: 4,
      lang: "en",
      grid: new Array(16).fill("A"),
      words: [],
      found: [],
      anchor: null,
    };
    expect(isSolved(empty)).toBe(false);
  });

  it("records milliseconds, low is better, scoped to the tier", () => {
    expect(scoreFor(91234.6, "hard")).toEqual({ value: 91235, unit: "ms", board: "hard" });
    expect(scoreFor(-5, "easy").value).toBe(0);
  });
});

describe("reading a board back off the disk", () => {
  it("agrees that a freshly dealt board holds all its words", () => {
    for (const [level, lang] of COMBOS) {
      const { state } = deal(level, lang, rngFor(`occurs-${level}-${lang}`));
      expect(everyWordOccurs(state)).toBe(true);
    }
  });

  it("refuses a board a letter has been changed in", () => {
    // The snapshot check's own control. Without it, `everyWordOccurs` could be
    // returning true unconditionally and every green above would be worthless.
    const { state, placements } = deal("easy", "he", rngFor("tamper"));
    const grid = state.grid.slice();
    const victim = placements[0].cells[0];
    grid[victim] = grid[victim] === "א" ? "ב" : "א";
    expect(everyWordOccurs({ ...state, grid })).toBe(false);
  });
});

describe("the word pool", () => {
  it("holds enough words in every language for the widest tier", () => {
    for (const lang of SHIPPED_LOCALES) {
      expect(WORD_POOL[lang].length).toBeGreaterThan(LEVELS.hard.words * 8);
    }
  });

  it("is written with letters the grid can actually draw", () => {
    for (const lang of SHIPPED_LOCALES) {
      const alphabet = alphabetOf(lang);
      const bad = WORD_POOL[lang].filter((w) => letters(w).some((g) => !alphabet.has(g)));
      expect(bad, `${lang} words carry letters outside its alphabet: ${bad.join(", ")}`).toEqual([]);
    }
  });

  it("has no duplicates", () => {
    for (const lang of SHIPPED_LOCALES) {
      expect(new Set(WORD_POOL[lang]).size).toBe(WORD_POOL[lang].length);
    }
  });

  it("offers the player's own language first, then the others", () => {
    expect(contentLangOptions("he")).toEqual(["he", "en", "es"]);
    expect(contentLangOptions("en")).toEqual(["en", "es"]);
    expect(contentLangOptions("es")).toEqual(["es", "en"]);
  });
});

describe("the helpers the renderer leans on", () => {
  it("rowOf and colOf invert the index", () => {
    expect(rowOf(13, 5)).toBe(2);
    expect(colOf(13, 5)).toBe(3);
  });

  it("newGame is a deal with the bookkeeping dropped", () => {
    const a = newGame("easy", "en", rngFor("new"));
    const b = deal("easy", "en", rngFor("new")).state;
    expect(a).toEqual(b);
  });

  it("reads the letters standing on a run of cells", () => {
    const state: WordSearchState = {
      size: 3,
      lang: "en",
      grid: ["C", "A", "T", "X", "Y", "Z", "P", "Q", "R"],
      words: ["CAT"],
      found: [null],
      anchor: null,
    };
    expect(textOn(state, [0, 1, 2])).toBe("CAT");
    expect(judge(state, [2, 1, 0])).toBe(0);
  });
});
