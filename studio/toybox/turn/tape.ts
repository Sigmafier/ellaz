// A turn tape's rows are EVENTS, not held buttons. The fight reads the last
// row at or before a tick and holds it, because its inputs are buttons a hand
// keeps down; a click is over the instant it happens, so here a row fires on
// its own tick and every other tick reads as no input. Same file shape,
// different reading - which is why `inputsAt` belongs to the kind and not to
// the loop.

import type { Tape } from "../sim/tape";
import { NO_TURN_INPUT } from "./types";
import type { TurnInput } from "./types";

/** the inputs of the row at exactly `tick`, or none; one entry per player (the turn has one) */
export function inputsAtTurn(tape: Tape<TurnInput>, tick: number, players: number): TurnInput[] {
  let row: TurnInput[] = [];
  for (const [t, inputs] of tape.frames) {
    if (t > tick) break;
    if (t === tick) row = inputs;
  }
  const out: TurnInput[] = [];
  for (let i = 0; i < players; i++) out.push(row[i] ?? NO_TURN_INPUT);
  return out;
}
