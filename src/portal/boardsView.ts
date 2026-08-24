import { parseRecordKey, recordKey, type GameMeta, type ScoreUnit } from "@sdk/index";

// The pure half of the boards screen.
//
// It exists so the screen can be looked at without a browser: which games a
// player sees, which boards each one has, and which number a card is entitled
// to print. Every input is handed in - the wallet, the catalog and localStorage
// are all the caller's problem - which is what makes the card-and-detail
// agreement below testable rather than merely intended.

/**
 * Every rung of every ladder in the catalogue, easiest first.
 *
 * Boards used to be sorted with a bare `.sort()`, which is alphabetical, so
 * sudoku's difficulty pills read Easy / Hard / Med and snake's card opened on
 * `fast` - an order nobody chose, and one that reads as a bug rather than as a
 * scale. A ladder is an ORDER, and the only place that order exists is the
 * `DifficultyOption[]` each renderer declares, which is source this module
 * cannot import: `boardsView` is pure and `Sudoku.tsx` is a component.
 *
 * So the order is restated here and PINNED to those declarations by
 * `boardsView.test.ts`, which reads the games tree and fails when a rung is
 * missing or out of sequence. The alternative - `levels` on the DOM-free
 * `meta.ts`, derived rather than restated - is the right end state and costs
 * shell bytes on a roster imported statically by the home grid, so it is not
 * this change.
 *
 * The six ladders fold into one list without contradicting each other, which is
 * what makes a single list possible at all: `medium` is the middle rung of both
 * easy/medium/hard and short/medium/long, and `normal` the middle of both
 * easy/normal/hard and slow/normal/fast. No id sits at two different heights.
 *
 * `pip`/`mo`/`tuli` are not difficulties - they are which pet you chose - but
 * they are board ids and they need an order, so they take the one `PETS`
 * declares rather than the alphabetical one.
 */
export const BOARD_ORDER: readonly string[] = [
  "default",
  // Below easy: sudoku's animal boards and 2048's kids grid.
  "kids4",
  "kids6",
  "kids",
  // The low rung, under four different names.
  "short",
  "slow",
  "easy",
  // The middle.
  "classic",
  "normal",
  "medium",
  // The high rung.
  "long",
  "fast",
  "hard",
  "expert",
  // Math picks a TOPIC and an OPERATION rather than a difficulty. Neither is a
  // board id today (math records on `default`), but they are rungs a game
  // declares, so they are ordered here rather than left to sort by spelling if
  // math ever scopes its record by topic.
  "count",
  "match",
  "visual",
  "up5",
  "up10",
  "up20",
  "mult",
  "add",
  "sub",
  "mixed",
  // Which pet, not how hard.
  "pip",
  "mo",
  "tuli",
];

const BOARD_RANK = new Map(BOARD_ORDER.map((id, i) => [id, i]));

/**
 * Ladder order, with anything unregistered sorted LAST and alphabetically.
 *
 * Last rather than first, deliberately: `firstBoard` reads `boards[0]`, so an
 * id this list has never heard of would otherwise decide which board a card
 * quotes and which board the drill-down opens. Sorting it last keeps that
 * answer on a rung somebody chose, and leaves the new id visible at the end of
 * the row instead of silently rearranging the screen. Alphabetically among
 * themselves so the result is stable rather than input-ordered.
 */
export function byDifficulty(a: string, b: string): number {
  const ra = BOARD_RANK.get(a);
  const rb = BOARD_RANK.get(b);
  if (ra !== undefined && rb !== undefined) return ra - rb;
  if (ra !== undefined) return -1;
  if (rb !== undefined) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface Playable {
  meta: GameMeta;
  unit: ScoreUnit;
  /** The boards this player holds a record on, easiest rung first. */
  boards: string[];
}

/**
 * Games this player has opened that keep a record, newest first, each with the
 * boards they hold one on.
 *
 * Two things are deliberately dropped rather than rendered: a game with no
 * `scoreUnit` (coloring, forever - ranking a child's drawing is the opposite of
 * this platform's premise), and an id the catalog has never heard of. The
 * wallet sits below the portal in the module graph, so it cannot know the
 * catalog and happily returns ids for games that have since been deleted.
 *
 * A game opened but never won has no record key at all, so it falls back to the
 * default board: the reader can still open it and see what there is to beat.
 */
export function myGames(
  recent: readonly string[],
  catalog: readonly GameMeta[],
  records: Readonly<Record<string, number>>,
): Playable[] {
  const known = new Map(catalog.map((m) => [m.id, m]));

  const boardsByGame = new Map<string, string[]>();
  for (const key of Object.keys(records)) {
    const parsed = parseRecordKey(key);
    if (!parsed) continue;
    const list = boardsByGame.get(parsed.game) ?? [];
    list.push(parsed.board);
    boardsByGame.set(parsed.game, list);
  }

  return recent
    .map((id) => known.get(id))
    .filter((m): m is GameMeta => m !== undefined && m.scoreUnit !== undefined)
    .map((meta) => ({
      meta,
      unit: meta.scoreUnit as ScoreUnit,
      boards: (boardsByGame.get(meta.id) ?? ["default"]).slice().sort(byDifficulty),
    }));
}

/**
 * The board a game opens on - and therefore the one its card must quote.
 *
 * ONE function, because two callers need the answer and they need the SAME
 * answer. A card printing the easy time while tapping it opened the hard board
 * would show a number belonging to a screen the player never sees, and nothing
 * anywhere would throw. `boardsView.test.ts` pins them together.
 */
export function firstBoard(game: Playable): string {
  return game.boards[0] ?? "default";
}

/**
 * The player's own record on the board this game opens on, or `undefined` when
 * there is none to show.
 *
 * It goes through `recordKey`, which is anchored, so a game id carrying a colon
 * can never be assembled into `ellaz:profile:v1` or `ellaz:cloud:v1`. A card
 * shows nothing rather than read a key it had no business naming.
 */
export function cardBest(
  game: Playable,
  records: Readonly<Record<string, number>>,
): number | undefined {
  const key = recordKey(game.meta.id, firstBoard(game));
  return key ? records[key] : undefined;
}

/**
 * The game a drill-down opens, from either entry point.
 *
 * The grid can only ever name a game the player has played on THIS device, so
 * for it this is a plain lookup. A standing cannot: the pooled read is the
 * whole platform, and a reader can hold a record set on another device, or
 * restored from a backup code, or simply be looking at a board they reached
 * through the cloud. `myGames` is built from local storage, so that game is
 * absent from it and a lookup returns `undefined` - which renders as the grid,
 * i.e. a tap that appears to do nothing.
 *
 * So fall back to the catalogue and synthesise a `Playable` carrying the ONE
 * board we were actually told about. Not every board the game defines: this
 * player's other boards are exactly what we do not know here, and listing them
 * would offer difficulty pills that open empty boards.
 *
 * `undefined` still means "no such game" - an id the catalogue has never heard
 * of, or one with no `scoreUnit` (coloring, forever). Both are honest.
 */
export function resolveOpen(
  open: { id: string; board?: string } | null,
  mine: readonly Playable[],
  catalog: readonly GameMeta[],
): Playable | undefined {
  if (!open) return undefined;
  const owned = mine.find((g) => g.meta.id === open.id);
  if (owned) return owned;
  const meta = catalog.find((m) => m.id === open.id);
  if (!meta || meta.scoreUnit === undefined) return undefined;
  return { meta, unit: meta.scoreUnit, boards: [open.board ?? "default"] };
}
