// What a placing is WORTH — PURE, zero I/O, and the only place that is decided.
//
// Fourth module in the same family as economy.ts (reasons in, coins out),
// score.ts (a unit in, a direction out) and standing.ts (counts in, a sentence
// out). A screen reports WHERE somebody came; this module alone says whether
// that is a medal and what it scores. No caller may pass a medal in, for the
// same reason no game may pass a coin amount in: one file decides, so thirty
// screens cannot each invent their own economics.
//
// WHY RANK 1 IS ALWAYS GOLD
// The obvious rule is percentile-only — top tenth is gold, top quarter silver,
// top half bronze — and it is measurably wrong on this platform. A top tenth of
// five players is half a player, so on a board of five NOBODY can be gold, and
// the boards here average under four people (34 live boards, 128 rows,
// 2026-08-24). Measured against those boards the percentile-only rule gave the
// test reader zero gold while they were FIRST on three of them. First is first.
//
// WHY A BOARD IS WORTH A POINT ON ITS OWN
// Without it, showing up on a board you place badly on is worth exactly nothing,
// and the pooled ranking becomes a ranking of specialists. One point per board
// says "you turned up", which is the behaviour this platform actually wants from
// a child: try the other games.

/** A placing's medal, or none. `none` is a real answer and is never a failure. */
export type Medal = "gold" | "silver" | "bronze" | "none";

/** What each medal scores on the pooled board. */
export const MEDAL_POINTS: Record<Medal, number> = {
  gold: 5,
  silver: 3,
  bronze: 1,
  none: 0,
};

/** What merely being ON a board scores, medal or not. */
export const BOARD_POINT = 1;

/**
 * The medal for coming `rank` of `total`.
 *
 * A board of one is not a board — the same floor `standingView` applies, and for
 * the same reason: "first of one" is not an achievement and minting a gold for
 * it would make the pooled ranking a ranking of who found the emptiest game.
 *
 * Junk counts resolve to `none` rather than throwing. These arrive from the
 * network, and the failure mode of guessing is telling a child they won
 * something they did not.
 */
export function medalFor(rank: number, total: number): Medal {
  if (!Number.isFinite(rank) || !Number.isFinite(total)) return "none";
  if (total < 2 || rank < 1 || rank > total) return "none";
  if (rank === 1) return "gold";
  const share = rank / total;
  if (share <= 0.1) return "gold";
  if (share <= 0.25) return "silver";
  if (share <= 0.5) return "bronze";
  return "none";
}

/** What one placing is worth: the board itself, plus whatever it medalled. */
export function placingPoints(rank: number, total: number): number {
  return BOARD_POINT + MEDAL_POINTS[medalFor(rank, total)];
}
