import { describe, expect, it } from "vitest";
import {
  betterThan,
  myPlacings,
  pooledPlayers,
  pooledTables,
  splitBoard,
  POOLED_LIMIT,
  type PooledRow,
} from "./pooled";

const NOW = { d: "2026-08-24", w: "2026-W35", m: "2026-08" };

function row(partial: Partial<PooledRow> & { board: string; uid: string; best: number }): PooledRow {
  return {
    board: partial.board,
    uid: partial.uid,
    name: partial.name ?? `${partial.uid}__player`,
    unit: partial.unit ?? "points",
    best: partial.best,
    d: partial.d ?? NOW.d,
    dBest: partial.dBest ?? partial.best,
    w: partial.w ?? NOW.w,
    wBest: partial.wBest ?? partial.best,
    m: partial.m ?? NOW.m,
    mBest: partial.mBest ?? partial.best,
  };
}

describe("splitBoard", () => {
  it("splits on the first double underscore with no known set", () => {
    expect(splitBoard("snake__default")).toEqual({ game: "snake", level: "default" });
  });

  it("prefers the LONGEST known game id — sortsize beats sort", () => {
    const known = new Set(["sort", "sortsize"]);
    expect(splitBoard("sortsize__easy", known)).toEqual({ game: "sortsize", level: "easy" });
  });

  it("a board id with no matching known game falls back to the first split", () => {
    const known = new Set(["snake"]);
    expect(splitBoard("deleted-game__easy", known)).toEqual({ game: "deleted-game", level: "easy" });
  });
});

describe("pooledTables — ranking, windows, ties", () => {
  it("ranks high-is-better units descending and low-is-better ascending", () => {
    const rows = [
      row({ board: "snake__default", uid: "a", best: 100 }),
      row({ board: "snake__default", uid: "b", best: 300 }),
      row({ board: "sudoku__easy", uid: "a", best: 5000, unit: "ms" }),
      row({ board: "sudoku__easy", uid: "b", best: 3000, unit: "ms" }),
    ];
    const [snake, sudoku] = pooledTables(rows, { window: "all", now: NOW }).sort((x, y) =>
      x.board.localeCompare(y.board),
    );
    expect(snake.entries.map((e) => e.uid)).toEqual(["b", "a"]); // points: high first
    expect(sudoku.entries.map((e) => e.uid)).toEqual(["b", "a"]); // ms: low first
  });

  it("ties share a rank, and the next rank skips past the tied group", () => {
    const rows = [
      row({ board: "g__d", uid: "a", best: 100 }),
      row({ board: "g__d", uid: "b", best: 100 }),
      row({ board: "g__d", uid: "c", best: 50 }),
    ];
    const [table] = pooledTables(rows, { window: "all", now: NOW });
    const ranks = new Map(table.entries.map((e) => [e.uid, e.rank]));
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(3);
  });

  it("only rows SET inside the requested window count for it", () => {
    const rows = [
      row({ board: "g__d", uid: "a", best: 10, d: NOW.d, dBest: 10 }),
      // Best-ever is higher, but it was set on a DIFFERENT day, so it is not
      // on today's board — the same rule cloud.ts's board() applies.
      row({ board: "g__d", uid: "b", best: 999, d: "2020-01-01", dBest: 999 }),
    ];
    const [today] = pooledTables(rows, { window: "d", now: NOW });
    expect(today.entries.map((e) => e.uid)).toEqual(["a"]);
    expect(today.total).toBe(1);
  });

  it("all-time reads `best` unconditionally, regardless of when it was set", () => {
    const rows = [row({ board: "g__d", uid: "a", best: 10, d: "2020-01-01" })];
    const [all] = pooledTables(rows, { window: "all", now: NOW });
    expect(all.total).toBe(1);
  });

  it("resolves unit from the declared resolver over the row's own field", () => {
    // A stale row claims `ms`; the game's declared meta says `points`. The
    // declared unit wins, so one wrong row cannot invert a whole board.
    const rows = [
      row({ board: "g__d", uid: "a", best: 10, unit: "ms" }),
      row({ board: "g__d", uid: "b", best: 20, unit: "ms" }),
    ];
    const [table] = pooledTables(rows, { window: "all", now: NOW, unitFor: () => "points" });
    expect(table.unit).toBe("points");
    expect(table.entries.map((e) => e.uid)).toEqual(["b", "a"]); // points: high first
  });
});

describe("myPlacings", () => {
  it("orders the reader's own boards strongest first", () => {
    const rows = [
      row({ board: "weak__d", uid: "me", best: 1 }),
      row({ board: "weak__d", uid: "x", best: 2 }),
      row({ board: "weak__d", uid: "y", best: 3 }),
      row({ board: "strong__d", uid: "me", best: 10 }),
      row({ board: "strong__d", uid: "x", best: 1 }),
    ];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    const placings = myPlacings(tables, "me");
    expect(placings[0].board).toBe("strong__d"); // 1st of 2
    expect(placings[1].board).toBe("weak__d"); // 3rd of 3
  });

  it("a placing not on the board at all is simply absent, not zero", () => {
    const rows = [row({ board: "g__d", uid: "x", best: 1 })];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    expect(myPlacings(tables, "me")).toEqual([]);
  });
});

describe("pooledPlayers", () => {
  it("sums board points and medal points across every board a player is on", () => {
    const rows = [
      row({ board: "a__d", uid: "me", best: 1 }), // 1 of 1: below the floor, none
      row({ board: "b__d", uid: "me", best: 10 }),
      row({ board: "b__d", uid: "x", best: 1 }), // me: rank 1 of 2 -> gold
    ];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    const players = pooledPlayers(tables);
    const me = players.find((p) => p.uid === "me");
    expect(me?.boards).toBe(2);
    expect(me?.gold).toBe(1);
    // board a (none, 1 point) + board b (gold, 1 + 5 = 6 points) = 7
    expect(me?.points).toBe(7);
  });

  it("betterThan counts strictly-greater point totals only", () => {
    const rows = [
      row({ board: "a__d", uid: "me", best: 5 }),
      row({ board: "a__d", uid: "x", best: 10 }),
      row({ board: "a__d", uid: "y", best: 1 }),
    ];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    const players = pooledPlayers(tables);
    // 3 players, all on the same one board: rank 1 (gold, 6pts), rank 2 (none, 1pt),
    // rank 3 (none, 1pt) — x=6, me=1, y=1. me beats nobody strictly.
    expect(betterThan(players, "me")).toBe(1);
    expect(betterThan(players, "x")).toBe(0);
  });
});

describe("POOLED_LIMIT", () => {
  it("is duplicated in cloud.ts as SCORES_ROW_LIMIT — keep the two equal", () => {
    // cloud.ts cannot import this VALUE without pulling the ranking module
    // into the lazy cloud chunk (see the comment on SCORES_ROW_LIMIT there),
    // so the number is hand-duplicated. This pins what the duplicate must
    // equal; a change to one without the other silently truncates one screen
    // and not the other.
    expect(POOLED_LIMIT).toBe(3000);
  });
});

describe("a Placing feeds standingView with `better`, not `beat`", () => {
  // The two are mirror images and BOTH type-check as a number, so the wrong
  // one renders a perfect screen with every badge missing. Measured live: a
  // player with 8 golds showed none, because `total - rank` was passed where
  // `rank - 1` belonged.
  it("rank - 1 is what standingView means by `better`", () => {
    const rows = [
      row({ board: "g__d", uid: "me", best: 100 }),
      row({ board: "g__d", uid: "x", best: 50 }),
      row({ board: "g__d", uid: "y", best: 25 }),
      row({ board: "g__d", uid: "z", best: 10 }),
    ];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    const [me] = myPlacings(tables, "me");

    expect(me.rank).toBe(1);
    expect(me.beat).toBe(3);
    // `better` for a first place is ZERO, and `beat` is 3. Handing `beat` over
    // says three players did better, which is last place on a board of four.
    expect(me.rank - 1).toBe(0);
    expect(me.beat).not.toBe(me.rank - 1);
  });
});
