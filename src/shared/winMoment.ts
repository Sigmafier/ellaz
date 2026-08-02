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
import type { GameContext, RewardGrant, RewardResult } from "@sdk/index";
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
}

function screenCentre(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function winMoment(ctx: GameContext, o: WinMomentOptions): RewardResult {
  // 1. Bank it. Everything below this line is decoration.
  const result = ctx.rewards.grant({ reason: o.reason, tier: o.tier, level: o.level });

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

  return result;
}
