// What a bot does with a number.
//
// `equity.ts` says how strong the hand is; this decides what to do about it.
// Split in two because they fail differently: a wrong equity is a wrong belief
// about cards, a wrong policy is a bot that never raises — and a table of bots
// that only ever check and call is worthless for testing, because the moments
// worth looking at (a build-up, a shove, a run-out with everyone's cards face
// up) are exactly the ones that never happen.
//
// PURE, and it takes its randomness as an argument. That is not ceremony: it
// is the only way to assert "this persona raises here and that one folds"
// without running a table and hoping.
//
// It is NOT trying to play well. It is trying to produce a varied, plausible
// game with pots that build, hands that get shown down, and the occasional
// stack in the middle. A bot that played perfectly would fold most hands
// preflop, which is correct poker and a terrible demo.

import type { LegalActions } from "../engine/betting";

export interface Persona {
  id: string;
  /** Shown in the runner's log, so a strange line can be attributed. */
  label: string;
  /**
   * Multiplier on the pot-odds bar required to call. 1.0 is break-even
   * against a random hand; below 1 calls too wide, above 1 folds too much.
   */
  callBar: number;
  /** Equity at which it starts raising for value. */
  raiseAt: number;
  /** Chance per opportunity of betting a hand that could not call one. */
  bluff: number;
  /** Bet and raise sizing, as a fraction of the pot it would be raising into. */
  size: number;
  /** How long it appears to think, in ms — [min, max]. */
  think: [number, number];
}

/**
 * At this equity a bot stops sizing and simply moves in.
 *
 * Deliberately reachable. The run-out of an all-in — board dealt one card at a
 * time with everyone's cards face up — is the single best thing this game
 * does, and a policy that never jams would never once show it to the person
 * testing.
 */
export const JAM_AT = 0.88;

export const PERSONAS: readonly Persona[] = [
  {
    id: "station",
    label: "calls too much",
    callBar: 0.55,
    raiseAt: 0.8,
    bluff: 0.02,
    size: 0.5,
    think: [900, 2200],
  },
  {
    id: "nit",
    label: "folds too much",
    callBar: 1.3,
    raiseAt: 0.7,
    bluff: 0.0,
    size: 0.75,
    think: [1400, 3000],
  },
  {
    id: "maniac",
    label: "raises anything",
    callBar: 0.7,
    raiseAt: 0.55,
    bluff: 0.32,
    size: 1.0,
    think: [500, 1400],
  },
  {
    id: "solid",
    label: "plays about right",
    callBar: 1.0,
    raiseAt: 0.64,
    bluff: 0.1,
    size: 0.66,
    think: [1000, 2400],
  },
];

export interface Spot {
  legal: LegalActions;
  /** Win probability in [0, 1] — see equity.ts. */
  eq: number;
  /** Everything in the middle, including this street's bets. */
  pot: number;
  /** The highest total any seat has committed this street. */
  betTo: number;
}

export interface Decision {
  action: "fold" | "check" | "call" | "bet" | "raise";
  /** Total to have committed this street. Present only for bet and raise. */
  amount?: number;
  /** One word for the log, so a surprising line can be read back. */
  why: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * One decision. `roll` is a draw in [0, 1) — the caller's randomness, so the
 * same spot with the same roll always decides the same way.
 */
export function decide(spot: Spot, persona: Persona, roll: number): Decision {
  const { legal, eq, pot, betTo } = spot;
  const can = (a: string) => legal.actions.includes(a as never);
  const facing = legal.callAmount ?? 0;

  // Raising and betting are the same decision with different bounds: "bet" is
  // offered when nobody has bet this street, "raise" when somebody has.
  const aggressive = can("raise") ? "raise" : can("bet") ? "bet" : null;

  if (aggressive) {
    const jam = eq >= JAM_AT;
    const value = eq >= persona.raiseAt;
    // Only bluff into an unbet pot. Bluff-RAISING a bet is a different and
    // much more expensive move, and a bot doing it at random reads as broken
    // rather than as loose.
    const bluff = !value && facing === 0 && roll < persona.bluff;

    if (jam || value || bluff) {
      const lo = (aggressive === "raise" ? legal.minRaiseTo : legal.minBetTo) ?? 0;
      const hi = (aggressive === "raise" ? legal.maxRaiseTo : legal.maxBetTo) ?? lo;
      // Raising BY a fraction of the pot as it would stand after the call —
      // the ordinary way a bet is sized, and it keeps a bot from firing three
      // big bets into a pot that never grew.
      const wanted = jam ? hi : betTo + Math.round(persona.size * (pot + facing));
      return {
        action: aggressive,
        amount: clamp(wanted, lo, hi),
        why: jam ? "jam" : value ? "value" : "bluff",
      };
    }
  }

  // Nothing to pay. Never fold a free card — a bot that does is not a loose or
  // tight bot, it is a broken one, and it is the kind of thing that reads as a
  // server bug from the other side of the table.
  if (facing <= 0) return can("check") ? { action: "check", why: "free" } : { action: "fold", why: "no-check" };

  // Pot odds: calling `facing` to win `pot + facing`, so the break-even share
  // is facing / (pot + facing). The persona's bar moves that line.
  const odds = facing / (pot + facing);
  if (can("call") && eq >= odds * persona.callBar) {
    return { action: "call", why: eq >= 0.7 ? "strong" : "odds" };
  }

  if (can("check")) return { action: "check", why: "cheap" };
  return { action: "fold", why: "priced-out" };
}
