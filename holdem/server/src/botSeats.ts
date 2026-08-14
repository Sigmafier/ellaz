// Opponents that live in the table instead of in somebody's terminal.
//
// WHY THIS EXISTS AT ALL
// `scripts/bots.ts` already plays a perfectly good game, and it runs on a
// laptop. That is right for testing a change and wrong for a table somebody
// should be able to open at any hour and find a game at — the moment the
// terminal closes, the seats empty and the room is collected. This is the same
// brain (`shared/src/bot/`, unit-tested) driven by the Durable Object's own
// alarm, so the table is playable whether or not anyone is at a keyboard.
//
// THE COST RULE, WHICH SHAPES EVERYTHING BELOW
// This project must stay on the free plan, and a table that DEALS around the
// clock is the fastest way off it: about ten actions a hand, a hand every half
// minute, is roughly forty thousand alarm wake-ups and storage writes a day,
// for hands nobody is watching. So the bots SLEEP. They sit out while no
// human socket is connected — which means no eligible players, no inter-hand
// alarm, and a table that costs exactly nothing while it waits. They sit in
// when somebody arrives. The table is always THERE; it is not always playing,
// and those are different promises.
//
// A BOT IS NOT A SPECIAL KIND OF PLAYER
// It sits with `sit`, acts with `act`, and is refused by the same engine that
// refuses everyone. Nothing here reaches around the rules — a bug in this file
// can make a bot play badly, and cannot make it play illegally.

import { computeLegal } from "../../shared/src/engine/betting";
import type { Command, TableState } from "../../shared/src/engine/types";
import { equity } from "../../shared/src/bot/equity";
import { decide, PERSONAS, type Persona } from "../../shared/src/bot/policy";
import { NOUNS, pickName, type PlayerName } from "../../shared/src/names";

/**
 * What marks a seat as ours.
 *
 * A prefix rather than a flag on the seat because the engine's `playerId` is
 * an opaque string it never interprets, and keeping it that way is what lets
 * bots ride the ordinary seat lifecycle instead of needing one of their own.
 */
export const BOT_PREFIX = "bot:";

export const isBot = (playerId: string | null | undefined): boolean =>
  typeof playerId === "string" && playerId.startsWith(BOT_PREFIX);

export const botId = (index: number): string => `${BOT_PREFIX}${index}`;

/** Which persona a bot index plays. Stable, so a seat keeps its character. */
export const personaFor = (index: number): Persona => PERSONAS[index % PERSONAS.length];

/**
 * How long a bot appears to think, in ms.
 *
 * Deliberately well under any real action clock: this is the deadline the
 * table arms for a bot's turn, and if it ever exceeded `actionTimeMs` the
 * timeout path would fold the bot before it decided.
 */
export function thinkMs(persona: Persona, rng: () => number): number {
  const [lo, hi] = persona.think;
  return Math.round(lo + rng() * (hi - lo));
}

/**
 * How many run-outs a decision is worth, inside a Worker.
 *
 * 200 rather than the 300 the terminal bots use. The standard error is under
 * four points either way, which is finer than the gaps between the decisions
 * it feeds — and this one runs on somebody else's CPU budget.
 */
const ITERS = 200;

/**
 * The command this bot seat should issue, or null if it cannot act.
 *
 * Null is not an error: it is the honest answer when the seat is not to act,
 * has no cards, or the hand moved on between the alarm being armed and it
 * firing. The caller re-arms and waits rather than forcing something.
 */
export function botCommand(table: TableState, seat: number, rng: () => number): Command | null {
  const hand = table.hand;
  if (!hand || hand.toAct !== seat) return null;

  const legal = computeLegal(table, seat);
  if (!legal) return null;

  const hole = hand.holes[seat];
  if (!hole) return null;

  const opponents = table.seats.filter(
    (s, i) => i !== seat && s.inHand && !s.folded,
  ).length;
  // Everything in the middle, matching what `publicView` calls potTotal — the
  // policy prices a call against it, so the two must mean the same thing.
  const pot = table.seats.reduce((a, s) => a + (s.inHand ? s.totalCommitted : 0), 0);

  const eq = equity(hole, hand.board, opponents, ITERS, rng);
  const d = decide({ legal, eq, pot, betTo: hand.betTo }, personaFor(seat), rng());

  const action =
    d.action === "bet"
      ? ({ kind: "bet", to: d.amount! } as const)
      : d.action === "raise"
        ? ({ kind: "raise", to: d.amount! } as const)
        : ({ kind: d.action } as const);

  return { type: "act", seat, actionSeq: hand.actionSeq, action };
}

/**
 * A name whose ANIMAL nobody at this table is already wearing.
 *
 * The animal is the seat's face, so two players in one room wearing the same
 * one is a real defect and not a rare one: with twenty animals drawn
 * independently it is 27% at four seats and 56% at six, and the operator hit
 * it on the first table these bots ever sat at — Nimble Squirrel beside Brave
 * Squirrel, told apart only by a word.
 *
 * Falls back to an ordinary draw once every animal is taken, which needs more
 * seats than any table has. `taken` is the set of animal ids already in the
 * room; the ADJECTIVE is free to repeat, because it is not the picture.
 */
export function pickDistinctName(taken: ReadonlySet<string>, rng: () => number): PlayerName {
  if (taken.size >= NOUNS.length) return pickName(rng);
  for (let tries = 0; tries < 40; tries++) {
    const name = pickName(rng);
    if (!taken.has(name.noun)) return name;
  }
  // A degenerate rng is the only way here. Take the first free animal rather
  // than looping forever — a name is not worth hanging a table for.
  const free = NOUNS.find((n) => !taken.has(n.id));
  const fallback = pickName(rng);
  return free ? { adj: fallback.adj, noun: free.id } : fallback;
}

/**
 * The one room that is always there.
 *
 * A real code from the real alphabet — P, R, A, C and T are all in it — so it
 * travels through `normalizeCode` and the join box exactly like any other, and
 * nothing anywhere needs a special case for it. `makeCode` can in principle
 * draw it too; that collision is caught by the same 409 retry as every other.
 *
 * It lives HERE and not in `index.ts` because the worker's entry module cannot
 * export a constant: every export of it is a runtime binding, and the runtime
 * refuses anything that is not a handler or a Durable Object class. Adding one
 * for tidiness stops the whole worker from booting.
 */
export const PRACTICE_CODE = "PRACT";
