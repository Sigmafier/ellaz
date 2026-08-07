// What a board is allowed to tell a child about where they came — PURE, zero
// I/O, and the single place that decision is made.
//
// The operator's rule for this platform, stated once and enforced here rather
// than remembered at each call site: NO CHILD IS EVER SHOWN AS LAST. A
// leaderboard's default behaviour is to rank everybody, which means most
// players open it to learn they are near the bottom of it. That is the opposite
// of why this exists.
//
// So position is earned, not given. Three outcomes:
//
//   rank        an exact place, for players near the top — and "near the top"
//               means both a low number AND a top tenth, so 10th of 12 does not
//               qualify. It is a real achievement and worth naming.
//   percentile  "top 40%", while that is still a pleasant thing to read.
//   own         no position at all. The screen shows the child their own best
//               and what they are chasing, which is the honest and kind answer
//               for most players most of the time.
//
// The daily and weekly windows do the rest of the work: they reset, so nobody
// is behind for longer than a week, and a player who improves appears on them
// immediately.

/** Ranks at or below this are shown as a number — if they are also a top tenth. */
export const RANK_CUTOFF = 10;

/** The worst percentile worth printing. Above it, say nothing about position. */
export const SHOW_PERCENTILE_UPTO = 75;

/** A place on a board: how many players, and how many did better. */
export interface Standing {
  total: number;
  better: number;
}

export type StandingView =
  | { kind: "rank"; rank: number }
  | { kind: "percentile"; top: number }
  | { kind: "own" };

const OWN: StandingView = { kind: "own" };

function whole(n: number): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function standingView({ total, better }: Standing): StandingView {
  const t = whole(total);
  const b = whole(better);
  // Impossible counts resolve to "say nothing" rather than to a guess. This is
  // reached with numbers from the network, and the failure mode of guessing is
  // telling a child something false about themselves.
  if (t === null || b === null || b >= t) return OWN;

  // A board of one is not a board. "1st of 1" and "top 100%" are both worse
  // than showing the child their own record and leaving it there.
  if (t < 2) return OWN;

  const rank = b + 1;

  // BOTH conditions, deliberately. A low number alone would make 10th of 12 a
  // headline, which is the bottom of the board wearing a rosette.
  if (rank <= RANK_CUTOFF && rank <= Math.ceil(t * 0.1)) {
    return { kind: "rank", rank };
  }

  const top = Math.ceil((rank / t) * 100);
  if (top <= SHOW_PERCENTILE_UPTO) return { kind: "percentile", top };

  return OWN;
}

/** What the screen actually prints about the reader. One line, four shapes. */
export type YouLine =
  | { kind: "rank"; rank: number }
  | { kind: "percentile"; top: number }
  | { kind: "best"; value: number }
  | { kind: "none" };

function usable(n: number | undefined): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

/**
 * Which record is the player's own best — LOCAL FIRST, and that order is the
 * whole point.
 *
 * A record is written to this device on every personal best and pushed to the
 * cloud on a debounce, so the cloud copy is stale-or-equal by construction and
 * can never be fresher. Reading the cloud first shows a player an older number
 * than the one they just earned; reading it ONLY, which is what shipped, shows
 * them nothing at all until a publish lands.
 *
 * That was the defect: the `own` branch below — the branch this entire
 * no-last-place rule exists to reach — was unreachable for anyone offline,
 * anyone whose publish failed, and everyone before their first publish. The
 * screen already had the local record in hand; it was reading it to build the
 * board picker and then not using it here.
 *
 * The cloud value stays the fallback for a device with no record of its own: a
 * restored player mid-adoption, or one whose storage was cleared.
 */
export function ownBest(local: number | undefined, cloud: number | undefined): number | undefined {
  return usable(local) ?? usable(cloud);
}

/**
 * The one line under the board, given what may be said about position and what
 * the player has actually done.
 *
 * An earned position outranks a personal best — it is rarer, better, and
 * `standingView` has already decided it is safe to say. `none` is reserved for
 * a player with no record anywhere, which is the only honest reading of "play
 * to join the board".
 */
export function youLine(view: StandingView, best: number | undefined): YouLine {
  if (view.kind === "rank" || view.kind === "percentile") return view;
  const value = usable(best);
  return value === undefined ? { kind: "none" } : { kind: "best", value };
}
