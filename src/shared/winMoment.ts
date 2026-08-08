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
import { iconNode } from "@ui/icons";

/**
 * What flies to the wallet. The SAME drawing the chip shows, from the same
 * path - not a lookalike. `flyTo` lives in `@juice`, which must not import
 * `@ui`, so the glyph is injected from here.
 *
 * A fresh node per call: `flyTo` sends a flock, and one node cannot be in five
 * places.
 */
function coinParticle(): SVGSVGElement {
  const el = iconNode("coin");
  el.style.color = "var(--orange-ink)";
  return el;
}

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

/**
 * When the star flourish and the coin land, relative to the win chord.
 *
 * COIN_LAND_MS tracks `flyTo`'s own flight time (620ms) so the sound arrives
 * with the coins rather than near them. If that duration changes, this follows
 * it - a coin that lands silently and chimes a quarter second later reads as a
 * bug in the animation, not in the sound.
 */
const STAR_DELAY_MS = 450;
const COIN_LAND_MS = 620;

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
      flyTo(o.at ?? screenCentre(), getWalletAnchor(), {
        count: result.coins,
        particle: coinParticle,
      });
    }

    // 5. The two currencies get their own voices, staggered behind the win
    //    chord so a level completion is a short phrase rather than three
    //    sounds in a pile. Before this both were SILENT: there was no coin
    //    voice and no star voice in the app at all.
    //
    //    THE SEQUENCING IS NOT A TOURNAMENT RESULT. The palette rounds chose
    //    the two VOICES blind; the guided round that would have chosen the
    //    coin-flight BEHAVIOUR (silent arrival / a sound per landing coin /
    //    that plus the wallet chip bouncing) was never ranked - 0 of 6 guided
    //    brackets were. So this plays ONE coin rather than one per coin, which
    //    is the conservative reading: a per-coin variant at up to 12 coins is
    //    a machine-gun nobody has judged. Changing it is a blind round, not an
    //    edit.
    if (result.stars > 0) window.setTimeout(() => ctx.audio.play("star"), STAR_DELAY_MS);
    if (result.coins > 0) window.setTimeout(() => ctx.audio.play("coin"), COIN_LAND_MS);
  } catch (e) {
    // Cosmetics are best-effort; the grant above already stuck.
    console.error("[ellaz] win moment effects failed", e);
  }

  // 5. Anonymous, kid-safe analytics — a level label and a duration, no PII.
  ctx.analytics.levelComplete(o.level ?? "level", o.ms ?? 0);

  return score ? { ...result, score } : result;
}
