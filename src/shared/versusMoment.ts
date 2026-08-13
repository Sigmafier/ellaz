// The end of a pass-and-play match — the ONE path a two-player game may pay
// through, and deliberately the only thing in this file.
//
// It is a wrapper over `winMoment` rather than a second win path: the ordering
// there is load-bearing (bank first, decorate second, and a thrown animation can
// never cost a kid a coin), and a two-player mode is not a reason to have two of
// those. What this adds is that the OPTIONS are not the game's to write —
// `versusWinOptions` builds them, so no game can attach a score, ask for a tier,
// or pay per player.
import type { GameContext } from "@sdk/index";
import { winMoment } from "./winMoment";
import { versusWinOptions } from "./versus";

/**
 * A match between two people ended. Pays once, for FINISHING — not for winning.
 *
 * Called at the moment the board is decided, whoever decided it, including a
 * draw. That is the point: the child who lost watches the same coin fly to the
 * same wallet, and nothing anywhere goes down.
 *
 * MUST be called from the event handler, never inside a `setState` updater —
 * same rule as `winMoment` itself, and for the same reason (React may run an
 * updater twice, which here would pay the match twice).
 */
export function versusMatchEnd(
  ctx: GameContext,
  at?: { x: number; y: number },
  /** Analytics label only — `winMoment` forwards it to `levelComplete`. */
  level?: string,
): void {
  winMoment(ctx, versusWinOptions(at, level));
}
