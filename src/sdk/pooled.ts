// Every board at once — PURE, zero I/O, and the half of the standings screen
// that can be checked without a network.
//
// WHY ONE READ AND NOT ONE READ PER BOARD
// `cloud.board()` answers "where am I on THIS board" in four requests, and it
// scales: the counts are aggregations, so a board with ten thousand players
// costs the same as one with ten. That is the right shape for one board and the
// wrong shape for the question this screen asks, which is about all of them at
// once — the test reader holds 19 boards, so a per-board design is 57 requests
// before the screen can draw a single row.
//
// So the screen makes ONE collection-group read of every score row and does the
// ranking here. Every row already carries its value in all four windows, so the
// window pills cost nothing after the first read, and the medals screen and the
// standings screen are two views of the same fetch.
//
// WHAT THAT COSTS, STATED PLAINLY, BECAUSE IT IS THE THING THAT WILL BREAK
// It is O(every score row on the platform), and Firestore bills per document
// read. Measured 2026-08-24 the whole corpus is 128 rows across 34 live boards,
// so a screen open is 128 reads against a 50,000/day free allowance. That is
// comfortable now and it is NOT a design that grows: at a few thousand rows the
// daily allowance buys a handful of opens, and the answer then is a server-side
// rollup, not a bigger limit. `POOLED_LIMIT` is the tripwire rather than the
// solution — when a read comes back full, `pooledTables` says so through
// `truncated` and the screen stops claiming to rank everybody.
//
// This is the exact failure cloud.ts warns about — "the version that stops
// working exactly when the platform starts succeeding" — chosen deliberately,
// with the number that says when, rather than stumbled into.
import { directionFor, isRankable, type ScoreUnit } from "./score";
import { medalFor, placingPoints, type Medal } from "./medals";
import type { BoardWindow } from "./cloud";

/** One row of one board, as it comes off the wire. */
export interface PooledRow {
  /** `<game>__<level>`, the document's own parent id. */
  board: string;
  uid: string;
  /** `adj__noun` word ids, or "" for a player with no name yet. */
  name: string;
  unit: string;
  best: number;
  d: string;
  dBest: number;
  w: string;
  wBest: number;
  m: string;
  mBest: number;
}

/** A player's place on one board, in one window. */
export interface Entry {
  uid: string;
  name: string;
  value: number;
  /** 1-based, ties sharing a rank — the same competition ranking `cloud.board()` counts. */
  rank: number;
}

/** One board, ranked, in one window. */
export interface BoardTable {
  board: string;
  game: string;
  level: string;
  unit: ScoreUnit;
  entries: Entry[];
  total: number;
}

/** Where the reader came on one of their own boards. */
export interface Placing {
  board: string;
  game: string;
  level: string;
  unit: ScoreUnit;
  value: number;
  rank: number;
  total: number;
  medal: Medal;
  /** How many players on this board they are ahead of. */
  beat: number;
  /** 0..1 — how far up the field they are, for a bar somebody can read without reading. */
  share: number;
}

/** A player on the pooled board. */
export interface PooledPlayer {
  uid: string;
  name: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  /** How many boards they appear on in this window. */
  boards: number;
}

/**
 * How many rows one read will take.
 *
 * Not a tuned value — it is the point at which this design is already the wrong
 * one (see the header). It exists so a corpus that outgrows the approach makes
 * the screen say so instead of quietly ranking a slice of the platform as if it
 * were all of it.
 */
export const POOLED_LIMIT = 3000;

const WINDOW_VALUE = { d: "dBest", w: "wBest", m: "mBest" } as const;

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * `snake__default` -> `{ game: "snake", level: "default" }`.
 *
 * `isSafeId` permits an underscore in a game id, so `a__b__easy` is genuinely
 * ambiguous — and splitting it the wrong way files one game's scores under two
 * names, which renders perfectly and is simply a different board. Matching a
 * KNOWN game id first removes the ambiguity for every id the catalogue actually
 * holds; the first-`__` split is the fallback for a game the caller has never
 * heard of, which is a deleted one.
 */
export function splitBoard(
  board: string,
  known?: ReadonlySet<string>,
): { game: string; level: string } {
  if (known) {
    // Longest match first: `sort` and `sortsize` are both real ids, and a
    // shortest-first scan would file `sortsize__easy` under `sort`.
    let best: string | undefined;
    for (const id of known) {
      if (!board.startsWith(`${id}__`)) continue;
      if (best === undefined || id.length > best.length) best = id;
    }
    if (best !== undefined) return { game: best, level: board.slice(best.length + 2) };
  }
  const cut = board.indexOf("__");
  return cut < 0
    ? { game: board, level: "default" }
    : { game: board.slice(0, cut), level: board.slice(cut + 2) };
}

/**
 * The unit a board ranks in.
 *
 * The authority is the game's own `meta.scoreUnit`, which `score-unit-declared`
 * pins to the renderer — so the caller passes a resolver and this is only the
 * fallback for a game the catalogue no longer has. Majority rather than first,
 * because one stale row from a game that changed its unit must not invert a
 * whole board: a wrong direction here ranks the fastest child last.
 */
function unitOf(rows: readonly PooledRow[], declared: ScoreUnit | undefined): ScoreUnit {
  if (declared) return declared;
  const tally = new Map<string, number>();
  for (const row of rows) tally.set(row.unit, (tally.get(row.unit) ?? 0) + 1);
  let winner = "points";
  let top = 0;
  for (const [unit, n] of tally) {
    if (n > top) {
      top = n;
      winner = unit;
    }
  }
  return (winner === "ms" || winner === "moves" ? winner : "points") as ScoreUnit;
}

export interface PooledOptions {
  /** The window on screen. */
  window: BoardWindow;
  /** Window keys for *now*, from `windowsFor(Date.now())`. Injected so this stays pure. */
  now: { d: string; w: string; m: string };
  /** Game ids the catalogue knows, so a board id splits unambiguously. */
  known?: ReadonlySet<string>;
  /** `meta.scoreUnit` per game — the authority on direction. */
  unitFor?: (game: string) => ScoreUnit | undefined;
}

/**
 * Every board, ranked, in one window.
 *
 * A row counts for a window only if it was SET inside it — a best from last
 * Tuesday is not on today's board, which is the whole reason the windows reset.
 * Same test `cloud.board()` applies, so the two screens cannot disagree about
 * who is on a board.
 */
export function pooledTables(rows: readonly PooledRow[], opts: PooledOptions): BoardTable[] {
  const { window: win, now } = opts;
  const byBoard = new Map<string, PooledRow[]>();

  for (const row of rows) {
    if (typeof row.board !== "string" || row.board === "") continue;
    const inWindow = win === "all" || row[win] === now[win];
    if (!inWindow) continue;
    const value = win === "all" ? num(row.best) : num(row[WINDOW_VALUE[win]]);
    if (value === undefined || !isRankable(value)) continue;
    const list = byBoard.get(row.board) ?? [];
    // Normalised to `best` so everything downstream reads one field. The window
    // is resolved exactly once, here, rather than at every later comparison.
    list.push({ ...row, best: value });
    byBoard.set(row.board, list);
  }

  const tables: BoardTable[] = [];
  for (const [board, list] of byBoard) {
    const { game, level } = splitBoard(board, opts.known);
    const unit = unitOf(list, opts.unitFor?.(game));
    const low = directionFor(unit) === "low";
    const sorted = list
      .slice()
      .sort((a, b) => (low ? a.best - b.best : b.best - a.best));

    const entries: Entry[] = sorted.map((row, i) => ({
      uid: row.uid,
      name: row.name,
      value: row.best,
      // Ties SHARE a rank, matching the strict LESS_THAN / GREATER_THAN that
      // `cloud.board()` counts with. Two children on the same time are both
      // second, and neither is told they came third.
      rank: i > 0 && sorted[i - 1].best === row.best ? -1 : i + 1,
    }));
    for (let i = 1; i < entries.length; i += 1) {
      if (entries[i].rank === -1) entries[i].rank = entries[i - 1].rank;
    }

    tables.push({ board, game, level, unit, entries, total: entries.length });
  }

  return tables;
}

/** Where the reader came, strongest board first. */
export function myPlacings(tables: readonly BoardTable[], uid: string): Placing[] {
  const out: Placing[] = [];
  for (const table of tables) {
    const mine = table.entries.find((e) => e.uid === uid);
    if (!mine) continue;
    const beat = table.total - mine.rank;
    out.push({
      board: table.board,
      game: table.game,
      level: table.level,
      unit: table.unit,
      value: mine.value,
      rank: mine.rank,
      total: table.total,
      medal: medalFor(mine.rank, table.total),
      beat,
      share: table.total > 1 ? beat / (table.total - 1) : 0,
    });
  }
  // Strongest first: the fraction of the field you are above, then the bigger
  // field as the tie-break, so being 1st of 12 outranks being 1st of 2.
  return out.sort(
    (a, b) => a.rank / a.total - b.rank / b.total || b.total - a.total || a.game.localeCompare(b.game),
  );
}

/** Everybody, ranked by medal points. Ties share a rank, as on a board. */
export function pooledPlayers(tables: readonly BoardTable[]): PooledPlayer[] {
  const by = new Map<string, PooledPlayer>();
  for (const table of tables) {
    for (const entry of table.entries) {
      const player = by.get(entry.uid) ?? {
        uid: entry.uid,
        name: entry.name,
        points: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        boards: 0,
      };
      // A player's name is the same on every row; take the last non-empty one
      // rather than pinning whichever board happened to be read first, so a
      // player who rerolled before their most recent win shows the new name.
      if (entry.name) player.name = entry.name;
      const medal = medalFor(entry.rank, table.total);
      player.points += placingPoints(entry.rank, table.total);
      player.boards += 1;
      if (medal === "gold") player.gold += 1;
      else if (medal === "silver") player.silver += 1;
      else if (medal === "bronze") player.bronze += 1;
      by.set(entry.uid, player);
    }
  }
  return [...by.values()].sort(
    (a, b) => b.points - a.points || b.gold - a.gold || b.boards - a.boards,
  );
}

/** How many players scored strictly more than the reader. The `better` half of a `Standing`. */
export function betterThan(players: readonly PooledPlayer[], uid: string): number {
  const mine = players.find((p) => p.uid === uid);
  if (!mine) return 0;
  return players.filter((p) => p.points > mine.points).length;
}
