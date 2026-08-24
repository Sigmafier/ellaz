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


/**
 * A board no writer of ours could have created.
 *
 * WHAT CHANGED. Until 2026-08-24 the boards screen read ONE board at a time
 * through `cloud.board()`, whose id is assembled by `boardId()` and is therefore
 * anchored to `^[A-Za-z0-9_-]+$` on both halves. Nothing this app could ASK for
 * reached a document our own code had not named. That day added a COLLECTION
 * GROUP read over every `scores` descendant, and widened `firestore.rules` to
 * `match /{path=**}/scores/{uid}` so the query is authorised at all.
 *
 * The write clause did not change and never referenced the board segment - which
 * is precisely `a-ramp-re-scopes-the-guards-beneath-it.md`. The rule is unchanged,
 * still correct for its original callers, and its blast radius moved while it
 * stood still: any signed-in client may create `<anything>/scores/<their own
 * uid>`, and from that day the app READS all of it. The rule bounds every FIELD
 * it accepts (`name` <= 64, `unit`/`d`/`w`/`m` <= 16, the numbers `is number`)
 * and says nothing whatever about the PATH.
 *
 * The filter is STRUCTURAL rather than a catalogue lookup, and that is the whole
 * design decision. `Boards.tsx` derives `known` from `allMetas`, which arrives in
 * TWO BEATS - the shell roster first, the rest after `ensureFullCatalog()` - so a
 * catalogue filter would drop every below-the-fold game's board for one render
 * and show a wrong percentile before correcting itself. A wrong number that
 * settles is worse than a slow one. The shape our own writer produces does not
 * move between beats.
 *
 * Measured against the live corpus the day this landed: 208 rows, 56 boards,
 * path depth uniformly 4 (`boards/<id>/scores/<uid>`), and 56 of 56 board ids
 * match the shape below. The filter drops nothing real.
 *
 * What it does NOT fix, stated so nobody reads this as closed: junk documents
 * still consume the server-side `POOLED_LIMIT` budget, because the limit is
 * applied by the query and not by us. That half needs a path constraint in the
 * rules or a server-side rollup, and neither is reachable from this repo.
 */
describe("a board our own writer could not have produced", () => {
  const real = [
    row({ board: "snake__default", uid: "alice", best: 40 }),
    row({ board: "snake__default", uid: "bob", best: 10 }),
    row({ board: "memory__easy", uid: "alice", best: 8 }),
    row({ board: "memory__easy", uid: "bob", best: 4 }),
  ];
  const forged = Array.from({ length: 250 }, (_, i) =>
    row({ board: `zz-not-a-game-${i}`, uid: "mallory", best: 1 }),
  );

  it("is not ranked, so a client that has played nothing cannot lead", () => {
    const tables = pooledTables([...real, ...forged], { window: "all", now: NOW });
    const players = pooledPlayers(tables);

    expect(tables.map((t) => t.board).sort()).toEqual(["memory__easy", "snake__default"]);
    expect(players.map((p) => p.uid).sort()).toEqual(["alice", "bob"]);
    expect(players[0].uid).toBe("alice");
  });

  it("does not move a real player's standing underneath them", () => {
    const clean = pooledPlayers(pooledTables(real, { window: "all", now: NOW }));
    const dirty = pooledPlayers(pooledTables([...real, ...forged], { window: "all", now: NOW }));

    // `betterThan` is what the Standings screen turns into "you're in the top
    // N%". It must not answer differently because somebody else wrote junk.
    expect(betterThan(dirty, "alice")).toBe(betterThan(clean, "alice"));
    expect(betterThan(dirty, "bob")).toBe(betterThan(clean, "bob"));
  });

  it("keeps every shape our own writer CAN produce", () => {
    // `boardId()` is `<game>__<board>` with both halves `isSafeId`, so a game id
    // that itself contains `__` is legal and must survive. So must a hyphen and
    // a 64-character half - the exact edges `isSafeId` permits.
    const long = "a".repeat(64);
    const rows = [
      row({ board: "a__b__easy", uid: "u", best: 1 }),
      row({ board: "tic-tac__hard", uid: "u", best: 1 }),
      row({ board: `${long}__${long}`, uid: "u", best: 1 }),
    ];
    const tables = pooledTables(rows, { window: "all", now: NOW });
    expect(tables.map((t) => t.board).sort()).toEqual(
      ["a__b__easy", "tic-tac__hard", `${long}__${long}`].sort(),
    );
  });

  it("drops the shapes it cannot have produced", () => {
    // No separator; a path separator; over the 64-char half; empty halves; and
    // the `__x__` form `isSafeId` refuses outright.
    const rows = [
      row({ board: "nogame", uid: "u", best: 1 }),
      row({ board: "a/b__easy", uid: "u", best: 1 }),
      row({ board: `${"a".repeat(65)}__easy`, uid: "u", best: 1 }),
      row({ board: "__easy", uid: "u", best: 1 }),
      row({ board: "game__", uid: "u", best: 1 }),
      row({ board: "‮eliforp__easy", uid: "u", best: 1 }),
    ];
    expect(pooledTables(rows, { window: "all", now: NOW })).toEqual([]);
  });
});
