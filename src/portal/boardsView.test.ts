import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GameMeta } from "@sdk/index";
import { cardBest, firstBoard, myGames } from "./boardsView";

// The pure half of the boards screen: which games a player sees, which boards
// each one has, and which number the card quotes. No DOM, no wallet, no
// localStorage - every input is handed in, which is the only reason the
// card-and-detail agreement below can be asserted at all.

function meta(id: string, scoreUnit?: GameMeta["scoreUnit"]): GameMeta {
  return {
    id,
    title: { he: id, en: id, es: id },
    emoji: "🎮",
    color: "#000",
    ageBand: "all",
    category: "think",
    orientation: "any",
    renderer: "dom",
    ...(scoreUnit ? { scoreUnit } : {}),
  };
}

const CATALOG = [
  meta("sudoku", "ms"),
  meta("memory", "moves"),
  meta("snake", "points"),
  meta("coloring"), // no scoreUnit - never ranked, deliberately
];

describe("which games the boards show", () => {
  it("keeps the order the player played them in", () => {
    const games = myGames(["snake", "sudoku", "memory"], CATALOG, {});
    expect(games.map((g) => g.meta.id)).toEqual(["snake", "sudoku", "memory"]);
  });

  it("drops a game that keeps no record", () => {
    const games = myGames(["coloring", "snake"], CATALOG, {});
    expect(games.map((g) => g.meta.id)).toEqual(["snake"]);
  });

  it("drops an id the catalog has never heard of", () => {
    // The wallet sits below the portal and cannot know the catalog, so it
    // happily returns ids for games that have since been deleted.
    expect(myGames(["ghost", "snake"], CATALOG, {}).map((g) => g.meta.id)).toEqual(["snake"]);
  });

  it("lists the boards the player actually holds a record on", () => {
    const games = myGames(["sudoku"], CATALOG, {
      "ellaz:sudoku:score:medium": 9,
      "ellaz:sudoku:score:easy": 4,
      "ellaz:memory:score:easy": 3, // another game's record must not leak in
    });
    expect(games[0].boards).toEqual(["easy", "medium"]);
  });

  it("falls back to the default board when there is no record yet", () => {
    // A game opened but never won has no record key. It still gets a board, so
    // the reader can look at it and see what there is to beat.
    expect(myGames(["snake"], CATALOG, {})[0].boards).toEqual(["default"]);
  });

  it("carries the unit off the game's own meta", () => {
    expect(myGames(["sudoku"], CATALOG, {})[0].unit).toBe("ms");
  });
});

describe("the card and the board it opens quote the same record", () => {
  // The whole reason `firstBoard` exists. A card showing the easy time while
  // tapping it opened the hard board would be a number belonging to a screen
  // the player never sees - and nothing anywhere would throw.
  //
  // Asserted against CONCRETE values on purpose. `cardBest` calls `firstBoard`
  // itself, so comparing the two would only prove the function equals itself:
  // move `firstBoard` and both sides move together and the test stays green.
  // Pinned to real numbers, moving either one turns this red.
  it("quotes the first board, not just any board the player holds", () => {
    const records: Record<string, number> = {
      "ellaz:sudoku:score:easy": 184300,
      "ellaz:sudoku:score:hard": 402100,
    };
    const game = myGames(["sudoku"], CATALOG, records)[0];
    expect(firstBoard(game)).toBe("easy");
    expect(cardBest(game, records)).toBe(184300);
  });

  it("agrees for a game with a single default board", () => {
    const records = { "ellaz:snake:score:default": 2140 };
    const game = myGames(["snake"], CATALOG, records)[0];
    expect(firstBoard(game)).toBe("default");
    expect(cardBest(game, records)).toBe(2140);
  });

  it("has no number to quote before the first win", () => {
    const game = myGames(["snake"], CATALOG, {})[0];
    expect(cardBest(game, {})).toBeUndefined();
  });

  it("is the only way the screen picks an opening board", () => {
    // The real drift risk is not inside this module - it is a `game.boards[0]`
    // written inline in the component, which would be correct today and would
    // silently stop agreeing the first time `firstBoard` learns anything.
    const src = readFileSync(new URL("./Boards.tsx", import.meta.url), "utf8");
    expect(src).toContain("firstBoard(");
    expect(src).not.toMatch(/\.boards\[0\]/);
  });

  it("refuses a game id that cannot form a record key", () => {
    // `recordKey` is anchored so a crafted id can never reach `ellaz:profile:v1`.
    // A card must show nothing rather than read some other key.
    const game = {
      meta: meta("a:b", "points"),
      unit: "points" as const,
      boards: ["default"],
    };
    expect(cardBest(game, { "ellaz:a:b:score:default": 5 })).toBeUndefined();
  });
});
