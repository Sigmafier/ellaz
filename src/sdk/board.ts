// Which bucket a score competes in — PURE, zero I/O, and the only place the
// answer is decided.
//
// Sibling of score.ts and economy.ts, and the same shape: a game says what it
// scored and when, and this module alone says which day, week and month that
// belongs to. Nothing about the network lives here, so the part with real traps
// in it stays testable without a single request.
//
// WHY UTC AND NOT THE PLAYER'S CLOCK
// A board is a shared thing. If the day key came from local time, a child in
// Tel Aviv and a child in London would write DIFFERENT documents for the same
// afternoon and the board would quietly split in two — each one showing a
// smaller, wronger world. UTC costs one thing: the day rolls over at 3am local
// in Israel, which is a time no child is playing.
//
// WHY ISO WEEKS
// A week is owned by the year containing its Thursday. That is not a detail:
// 1 January 2027 is a Friday, and a naive "week of the year" would file it as
// 2027 week 1 alongside 4 January — so a Friday run would compete against the
// following week's players. ISO already solves the boundary correctly, and the
// key is opaque to the player, who only ever reads "this week".

/**
 * A document id Firestore will actually accept, and that cannot escape its
 * collection.
 *
 * A slash makes it a PATH rather than an id. `.` and `..` are reserved, and
 * ids matching `__…__` are reserved for Firestore's own use. Every game and
 * board id in the catalog passes today — the check exists so a future one
 * cannot silently not.
 */
export function isSafeId(id: string): boolean {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 64) return false;
  if (id === "." || id === "..") return false;
  if (/^__.*__$/.test(id)) return false;
  return /^[A-Za-z0-9_-]+$/.test(id);
}

/**
 * The board a (game, difficulty) pair shares, or `null` if either id is unsafe.
 *
 * Null rather than a thrown error or a sanitised fallback: a sanitised id would
 * silently merge two different boards into one, and this is reached from a win
 * handler where throwing costs a child their moment. The caller simply does not
 * publish.
 */
export function boardId(game: string, board: string): string | null {
  if (!isSafeId(game) || !isSafeId(board)) return null;
  return `${game}__${board}`;
}

export interface BoardWindows {
  /** `YYYY-MM-DD`, UTC. */
  d: string;
  /** `YYYY-Www`, ISO week. */
  w: string;
  /** `YYYY-MM`, UTC. */
  m: string;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * ISO week-numbering year and week for a UTC instant.
 *
 * Shifts to the Thursday of the same ISO week first, which is what makes the
 * year come out right at both boundaries — the December days that belong to
 * next year's week 1, and the January days that belong to last year's week 53.
 */
function isoWeek(date: Date): { year: number; week: number } {
  const t = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Monday = 1 … Sunday = 7, rather than JS's Sunday = 0.
  const weekday = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - weekday);
  const year = t.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((t.getTime() - jan1) / 86_400_000 + 1) / 7);
  return { year, week };
}

/**
 * The three windows an instant falls in.
 *
 * A stamp that is not a usable instant falls back to the epoch rather than
 * throwing. This runs inside a win, and a board key is not worth a crash — a
 * run filed under 1970 is visibly wrong and harmless, where an exception here
 * would cost the child the whole moment.
 */
export function windowsFor(at: number): BoardWindows {
  const ms = typeof at === "number" && Number.isFinite(at) && at > 0 ? at : 0;
  const date = new Date(ms);
  const { year, week } = isoWeek(date);
  return {
    d: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    w: `${year}-W${pad(week)}`,
    m: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`,
  };
}
