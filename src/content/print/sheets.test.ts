import { describe, it, expect } from "vitest";
import { generate as sudokuGenerate, type Level as SudokuLevel } from "../../games/sudoku/logic";
import {
  newMaze,
  optimalRoute,
  pathBetween,
  isOpen,
  type Difficulty as MazeLevel,
} from "../../games/maze/logic";
import {
  deal,
  everyWordOccurs,
  occurrences,
  type LevelId as WordLevel,
} from "../../games/wordsearch/logic";
import { GAMES } from "../../portal/games";
import { printRng } from "./seed";
import { COLOR_SHEETS, MAZE_SHEETS, SUDOKU_SHEETS, WORD_SHEETS } from "./sheets";

/* THE PIN. `sheets.ts` is frozen data, and frozen data is a claim about a
   generator that nothing else in this repo can check. This file re-deals all
   eighteen boards from the games' OWN pure generators, with the same seeds, and
   compares.

   So the two ways this can go wrong both surface as a red test naming the
   sheet: a board hand-edited into something unsolvable, and a generator tuned
   under a link somebody already shared. The second one is not a bug to fix
   here - it is a decision about whether a published sheet may change - and a
   test is the only thing that makes it a decision rather than an accident.

   It also proves the data is PLAYABLE rather than merely reproducible: the
   sudoku key really solves the puzzle, the maze route really walks through open
   walls, and every listed word really is in its grid. A regeneration check
   alone would agree with a generator that had started producing rubbish. */

const flat = (g: number[][]) => g.flat().join("");

describe("the frozen sudoku pack", () => {
  it("is what the game's own generator deals from these seeds", () => {
    SUDOKU_SHEETS.forEach((sheet, i) => {
      const s = sudokuGenerate(sheet.level as SudokuLevel, printRng("sudoku", i));
      expect({ i, puzzle: flat(s.puzzle), solution: flat(s.solution) }).toEqual({
        i,
        puzzle: sheet.puzzle,
        solution: sheet.solution,
      });
      expect({ i, n: s.spec.n, boxR: s.spec.boxR, boxC: s.spec.boxC }).toEqual({
        i,
        n: sheet.n,
        boxR: sheet.boxR,
        boxC: sheet.boxC,
      });
    });
  });

  it("prints a key that actually solves its own puzzle", () => {
    for (const [i, sheet] of SUDOKU_SHEETS.entries()) {
      expect(sheet.puzzle.length, `sheet ${i}`).toBe(sheet.n * sheet.n);
      expect(sheet.solution.length, `sheet ${i}`).toBe(sheet.n * sheet.n);
      // Every clue on the sheet agrees with the key, and the key has no blanks.
      for (let c = 0; c < sheet.puzzle.length; c += 1) {
        if (sheet.puzzle[c] !== "0") {
          expect(sheet.solution[c], `sheet ${i} cell ${c}`).toBe(sheet.puzzle[c]);
        }
      }
      expect(sheet.solution.includes("0"), `sheet ${i} key has a blank`).toBe(false);
      // ...and the key is a real solution: every row and every column holds
      // each symbol once. A key that merely fills the blanks would pass the
      // agreement check above and be useless to whoever is checking their child.
      for (let r = 0; r < sheet.n; r += 1) {
        const row = new Set(sheet.solution.slice(r * sheet.n, (r + 1) * sheet.n));
        const col = new Set(
          Array.from({ length: sheet.n }, (_, k) => sheet.solution[k * sheet.n + r]),
        );
        expect(row.size, `sheet ${i} row ${r}`).toBe(sheet.n);
        expect(col.size, `sheet ${i} col ${r}`).toBe(sheet.n);
      }
    }
  });
});

describe("the frozen maze pack", () => {
  it("is what the game's own generator deals from these seeds", () => {
    MAZE_SHEETS.forEach((sheet, i) => {
      const m = newMaze(sheet.level as MazeLevel, 0, printRng("maze", i));
      expect({
        i,
        size: m.size,
        right: m.walls.right.map((b) => (b ? "1" : "0")).join(""),
        down: m.walls.down.map((b) => (b ? "1" : "0")).join(""),
        at: m.at,
        home: m.home,
        cheese: m.cheese,
        par: m.par,
      }).toEqual({
        i,
        size: sheet.size,
        right: sheet.right,
        down: sheet.down,
        at: sheet.at,
        home: sheet.home,
        cheese: sheet.cheese,
        par: sheet.par,
      });

      const best = optimalRoute(m.walls, m.size, m.at, m.cheese, m.home);
      const route: number[] = [m.at];
      let at = m.at;
      for (const stop of [...best.order, m.home]) {
        route.push(...(pathBetween(m.walls, m.size, at, stop) ?? []));
        at = stop;
      }
      expect({ i, route }).toEqual({ i, route: sheet.route });
    });
  });

  it("prints a route that walks through open walls only, collects every crumb, and matches par", () => {
    MAZE_SHEETS.forEach((sheet, i) => {
      const walls = {
        right: [...sheet.right].map((c) => c === "1"),
        down: [...sheet.down].map((c) => c === "1"),
      };
      expect(sheet.route[0], `sheet ${i} starts elsewhere`).toBe(sheet.at);
      expect(sheet.route[sheet.route.length - 1], `sheet ${i} ends elsewhere`).toBe(sheet.home);
      for (let k = 1; k < sheet.route.length; k += 1) {
        const a = sheet.route[k - 1];
        const b = sheet.route[k];
        expect(isOpen(walls, sheet.size, a, b), `sheet ${i} step ${a}->${b} crosses a wall`).toBe(
          true,
        );
      }
      for (const crumb of sheet.cheese) {
        expect(sheet.route.includes(crumb), `sheet ${i} route misses crumb ${crumb}`).toBe(true);
      }
      // The drawn key IS the shortest walk, not merely a legal one.
      expect(sheet.route.length - 1, `sheet ${i} route is not par`).toBe(sheet.par);
    });
  });
});

describe("the frozen word-search pack", () => {
  it("is what the game's own generator deals from these seeds", () => {
    WORD_SHEETS.forEach((sheet, i) => {
      const d = deal(sheet.level as WordLevel, "he", printRng("wordsearch", i));
      expect({
        i,
        size: d.state.size,
        grid: d.state.grid.join(""),
        words: d.state.words,
        answers: d.placements.map((p) => ({ word: p.word, cells: p.cells })),
      }).toEqual({
        i,
        size: sheet.size,
        grid: sheet.grid,
        words: sheet.words,
        answers: sheet.answers,
      });
      expect(everyWordOccurs(d.state), `sheet ${i}`).toBe(true);
    });
  });

  it("prints a key whose cells really spell the word they claim", () => {
    WORD_SHEETS.forEach((sheet, i) => {
      const state = {
        size: sheet.size,
        lang: "he" as const,
        grid: [...sheet.grid],
        words: sheet.words,
        found: sheet.words.map(() => null),
        anchor: null,
      };
      expect(sheet.grid.length, `sheet ${i}`).toBe(sheet.size * sheet.size);
      for (const word of sheet.words) {
        const key = sheet.answers.find((a) => a.word === word);
        expect(key, `sheet ${i}: no key row for ${word}`).toBeTruthy();
        // The game's OWN reader, so the key is checked against the rule the
        // game plays by rather than against a second implementation here.
        const where = occurrences(state, word).map((cells) => cells.join(","));
        expect(where, `sheet ${i}: ${word} is not in the grid where the key says`).toContain(
          key!.cells.join(","),
        );
      }
    });
  });
});

describe("the frozen colouring pack", () => {
  it("names games this build actually has art for", () => {
    const ids = new Set(GAMES.map((g) => g.id));
    for (const id of COLOR_SHEETS) {
      expect(ids.has(id), `no game called "${id}" - its scene would print as nothing`).toBe(true);
    }
  });

  it("prints six different scenes", () => {
    expect(new Set(COLOR_SHEETS).size).toBe(COLOR_SHEETS.length);
  });
});
