// The canonical win. One helper, so all ten games celebrate identically and a
// change to what a win FEELS like is a one-file change.
//
// MUST be called from the event handler, never inside a `setState(prev => ...)`
// updater: React may run an updater twice or defer it, which would misfire the
// confetti and double-count the moment. Hold anything you need in a ref and call
// this from the handler flow (see .claude/rules/game-difficulty-and-juice-convention.md).
//
// Order is load-bearing: the coins are GRANTED AND PERSISTED first, and only
// then does anything cosmetic run. A thrown animation can never cost a kid a coin.
import type { GameContext, RewardGrant, RewardResult, ScoreReport, ScoreResult } from "@sdk/index";
import { celebrate, flyTo, haptic } from "@juice/index";
// Relative on purpose: portal has no alias, and this is the ONLY portal
// reference here — a module-level ref lookup, not portal state.
import { getWalletAnchor } from "../portal/WalletChip";

export interface WinMomentOptions extends RewardGrant {
  /** Viewport point the coins fly FROM. Defaults to the middle of the screen. */
  at?: { x: number; y: number };
  /** Level duration in ms, for analytics.levelComplete. */
  ms?: number;
  /** Full-screen confetti. Default true; pass false for endless milestones. */
  confetti?: boolean;
  /**
   * What the run scored, if this game has a score at all.
   *
   * Carried here rather than as a separate call so a win stays ONE thing a game
   * announces. Note what is absent: no direction and no coin amount — the game
   * says it took 12,750 ms, and score.ts decides that faster is better exactly
   * as economy.ts decides what a hard level pays.
   */
  score?: ScoreReport;
}

function screenCentre(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/** What a win produced: the reward, plus the score if the game reported one. */
export interface WinMomentResult extends RewardResult {
  score?: ScoreResult;
}

export function winMoment(ctx: GameContext, o: WinMomentOptions): WinMomentResult {
  // 1. Bank it. Everything below this line is decoration.
  const result = ctx.rewards.grant({ reason: o.reason, tier: o.tier, level: o.level });

  // 1b. Record the score, still before any cosmetics — a personal best is a
  //     fact about the player and must survive a thrown animation exactly as a
  //     coin does. `score` is optional on both sides: a game with no meaningful
  //     score never passes one, and an older host may not provide the port.
  let score: ScoreResult | undefined;
  if (o.score) {
    try {
      score = ctx.score?.report(o.score);
    } catch (e) {
      // The port already swallows storage failures; this catches a missing or
      // malformed host port. A score must never cost a child their win.
      console.error("[ellaz] score report failed", e);
    }
  }

  try {
    // 2. Sound + the matching buzz.
    ctx.audio.play("win");
    haptic.win();

    // 3. Confetti, unless this is a mid-run ping in an endless game.
    if (o.confetti !== false) celebrate();

    // 4. Show WHERE the coins went. Skipped when the cap paid out nothing —
    //    flying zero coins would be a lie about what just happened.
    if (result.coins > 0) {
      flyTo(o.at ?? screenCentre(), getWalletAnchor(), { count: result.coins });
    }
  } catch (e) {
    // Cosmetics are best-effort; the grant above already stuck.
    console.error("[ellaz] win moment effects failed", e);
  }

  // 5. Anonymous, kid-safe analytics — a level label and a duration, no PII.
  ctx.analytics.levelComplete(o.level ?? "level", o.ms ?? 0);

  return score ? { ...result, score } : result;
}
