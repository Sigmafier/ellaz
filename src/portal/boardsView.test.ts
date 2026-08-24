import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GameMeta } from "@sdk/index";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { BOARD_ORDER, byDifficulty, cardBest, firstBoard, myGames, resolveOpen, type Playable } from "./boardsView";

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

describe("resolveOpen - drilling into a board from either entry point", () => {
  const snake = meta("snake", "points");
  const sudoku = meta("sudoku", "ms");
  const coloring = meta("coloring");
  const mine: Playable[] = [{ meta: snake, unit: "points", boards: ["easy", "hard"] }];

  it("prefers the player's OWN entry, so every board they hold stays reachable", () => {
    const got = resolveOpen({ id: "snake", board: "hard" }, mine, [snake, sudoku]);
    expect(got?.boards).toEqual(["easy", "hard"]);
  });

  it("falls back to the catalogue for a game this DEVICE has never played", () => {
    // The pooled read is the whole platform, so a standing can name a game
    // absent from local storage - a record set on another device, or restored
    // from a backup code. Without the fallback the tap resolves to `undefined`
    // and drops the reader back on the grid, which reads as a dead button.
    const got = resolveOpen({ id: "sudoku", board: "expert" }, mine, [snake, sudoku]);
    expect(got?.meta.id).toBe("sudoku");
    expect(got?.unit).toBe("ms");
  });

  it("carries ONLY the board it was told about, never every board the game defines", () => {
    // The other boards are exactly what is unknown here. Listing them offers
    // difficulty pills that open boards this player has no record on.
    const got = resolveOpen({ id: "sudoku", board: "expert" }, mine, [snake, sudoku]);
    expect(got?.boards).toEqual(["expert"]);
  });

  it("is undefined for a game the catalogue has never heard of", () => {
    expect(resolveOpen({ id: "nosuch", board: "easy" }, mine, [snake])).toBeUndefined();
  });

  it("is undefined for a game that keeps no record at all", () => {
    // coloring, forever - ranking a child's drawing is the opposite of the
    // premise, so it must not become reachable through a standings tap either.
    expect(resolveOpen({ id: "coloring" }, [], [coloring])).toBeUndefined();
  });

  it("is undefined when nothing is open", () => {
    expect(resolveOpen(null, mine, [snake])).toBeUndefined();
  });
});


// ---------------------------------------------------------------------------
// The ladder order, pinned to the ladders themselves.
//
// `BOARD_ORDER` restates an order that really lives in each renderer's own
// level declaration, because a pure module cannot import a component. A
// restated order is a copy, and a copy goes stale in silence - a new rung sorts
// to the end of the row and the screen still renders perfectly - so it is read
// back out of the games tree here rather than trusted.
//
// TWO matchers, unioned, because the tree declares a ladder in two unrelated
// ways and NEITHER alone is complete: `DifficultyOption<L>[]`/`ChromeLevel<L>[]`
// finds 22 and misses memory and wordguess; the binding names find 18 and miss
// balloons, snake and nine others. The first draft of this test shipped the
// type matcher alone, passed its own >= 15 control, and was blind to eleven
// games - which is the exact shape a scan-based gate fails in.
// ---------------------------------------------------------------------------

const GAMES_DIR = join(__dirname, "..", "games");

const LADDER_PATTERNS = [
  /(?:DifficultyOption|ChromeLevel)<[^>]*>\[\]\s*=\s*\[([\s\S]*?)\n\]/g,
  /\b(?:LEVEL_OPTIONS|LEVELS|PETS)\b\s*(?::[^=]*?)?=\s*\[([\s\S]*?)\n\]/g,
];

/** Every level ladder the games tree declares, as ordered id sequences. */
function declaredLadders(): { file: string; ids: string[] }[] {
  const out = new Map<string, { file: string; ids: string[] }>();
  for (const dir of readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(GAMES_DIR, dir.name))) {
      if (!/\.(ts|tsx)$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      const src = readFileSync(join(GAMES_DIR, dir.name, f), "utf8");
      for (const re of LADDER_PATTERNS) {
        for (const m of src.matchAll(re)) {
          const ids = [...m[1].matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((x) => x[1]);
          // The two matchers overlap on most files, so key on the sequence
          // itself - a ladder found twice is one ladder, not two.
          if (ids.length >= 2) {
            out.set(`${dir.name}/${f}::${ids.join(",")}`, { file: `${dir.name}/${f}`, ids });
          }
        }
      }
    }
  }
  return [...out.values()];
}

describe("the board order is the ladder the games declare", () => {
  const ladders = declaredLadders();

  // The positive control, and it is doing two jobs. Every assertion below
  // passes over an empty list, so a matcher that quietly stopped matching would
  // report a clean sweep of nothing. And the per-GAME count is what catches a
  // ladder declared in a third shape nobody here has seen: a new game using one
  // would drop its whole directory out of the population silently.
  it("CONTROL: found a ladder in nearly every game, and both matchers fired", () => {
    const games = new Set(ladders.map((l) => l.file.split("/")[0]));
    expect(games.size).toBeGreaterThanOrEqual(29);
    const byFile = new Map(ladders.map((l) => [`${l.file}::${l.ids[0]}`, l.ids]));
    // Only the type matcher finds this one.
    expect(byFile.get("balloons/BalloonsGame.tsx::easy")).toEqual(["easy", "medium", "hard"]);
    // Only the binding-name matcher finds this one.
    expect(byFile.get("memory/Memory.tsx::easy")).toEqual(["easy", "medium", "hard"]);
    // The two that are not difficulty ladders at all, and the reason a single
    // global list works: `medium` is the middle rung of both easy/medium/hard
    // and short/medium/long, so no id sits at two different heights.
    expect(byFile.get("music/MusicGame.tsx::short")).toEqual(["short", "medium", "long"]);
    expect(byFile.get("pet/logic.ts::pip")).toEqual(["pip", "mo", "tuli"]);
  });

  it("names every rung any game declares", () => {
    const missing = new Set<string>();
    for (const { ids } of ladders) {
      for (const id of ids) if (!BOARD_ORDER.includes(id)) missing.add(id);
    }
    expect([...missing].sort()).toEqual([]);
  });

  it("puts every ladder's rungs in that ladder's own order", () => {
    const wrong: string[] = [];
    for (const { file, ids } of ladders) {
      const ranks = ids.map((id) => BOARD_ORDER.indexOf(id));
      const sorted = [...ranks].sort((a, b) => a - b);
      if (ranks.join(",") !== sorted.join(",")) wrong.push(`${file}: ${ids.join(" ")}`);
    }
    expect(wrong).toEqual([]);
  });

  it("invents no rung of its own - every id is one a game declares", () => {
    const declared = new Set(ladders.flatMap((l) => l.ids));
    // `default` is the board a game with no difficulty records on, so no ladder
    // declares it. Everything else must be traceable to one.
    const invented = BOARD_ORDER.filter((id) => id !== "default" && !declared.has(id));
    expect(invented).toEqual([]);
  });
});

describe("byDifficulty", () => {
  it("sorts a standard ladder by difficulty, not by spelling", () => {
    expect(["hard", "easy", "medium"].sort(byDifficulty)).toEqual(["easy", "medium", "hard"]);
    // What it used to do, and the reason sudoku's pills read Easy / Hard / Med.
    expect(["hard", "easy", "medium"].sort()).toEqual(["easy", "hard", "medium"]);
  });

  it("sorts an unregistered board last, so it cannot capture `firstBoard`", () => {
    const g: Playable = {
      meta: meta("x", "points"),
      unit: "points",
      boards: ["zzz", "easy", "aaa", "hard"].sort(byDifficulty),
    };
    expect(g.boards).toEqual(["easy", "hard", "aaa", "zzz"]);
    expect(firstBoard(g)).toBe("easy");
  });

  it("orders unregistered boards alphabetically, so the result is stable", () => {
    expect(["q2", "q1"].sort(byDifficulty)).toEqual(["q1", "q2"]);
    expect(["q1", "q2"].sort(byDifficulty)).toEqual(["q1", "q2"]);
  });

  it("carries into myGames, which is where the pills are drawn from", () => {
    const records = {
      "ellaz:sudoku:score:hard": 1,
      "ellaz:sudoku:score:kids4": 2,
      "ellaz:sudoku:score:medium": 3,
      "ellaz:sudoku:score:easy": 4,
    };
    const [g] = myGames(["sudoku"], [meta("sudoku", "ms")], records);
    expect(g.boards).toEqual(["kids4", "easy", "medium", "hard"]);
    // The card quotes the board the detail view opens, and that is now the
    // game's own first rung rather than whichever id spells first.
    expect(firstBoard(g)).toBe("kids4");
  });
});
