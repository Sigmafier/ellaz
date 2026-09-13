// A tick-indexed input tape: the admission instrument of the tournament. A
// row `[tick, inputs]` holds until the next row, so the same file drives the
// same simulation on every display and in every engine cell. The wall-clock
// Playwright tape (a steps-*.json under the game's tapes/) is a different file for a
// different job - screenshots - and never reaches the sim.

import { NO_INPUT } from "./types";
import type { Carry, InputFrame } from "./types";

/** a tape is shaped by the sim kind that plays it: `I` is one player's input for one tick (the fight's InputFrame when unsaid); `carry` is the purse a mid-campaign stage starts with, absent on a fresh one */
export interface Tape<I = InputFrame> { mode: string; seed: number; ticks: number; frames: [number, I[]][]; carry?: Carry }

/** a carry is three non-negative integers with a level of at least 1, or the sim could not seed from it */
function readCarry(raw: unknown): Carry {
  const c = raw as Carry;
  const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
  if (!c || typeof c !== "object" || !whole(c.coins) || !whole(c.xp) || !whole(c.level) || c.level < 1) {
    throw new Error(`tape: a carry is { coins, xp, level } - non-negative integers, level >= 1 - got ${JSON.stringify(raw)}`);
  }
  return { coins: c.coins, xp: c.xp, level: c.level };
}

export function readTape<I = InputFrame>(raw: unknown): Tape<I> {
  const t = raw as Tape<I>;
  if (!t || typeof t.mode !== "string" || !Number.isInteger(t.seed) || !Number.isInteger(t.ticks) || !Array.isArray(t.frames)) {
    throw new Error("tape: expected { mode, seed, ticks, frames: [[tick, inputs[]], ...] }");
  }
  if (t.carry !== undefined) t.carry = readCarry(t.carry);
  let last = -1;
  for (const [tick, inputs] of t.frames) {
    if (!Number.isInteger(tick) || tick <= last) throw new Error(`tape: rows must be ascending ticks, got ${tick} after ${last}`);
    if (!Array.isArray(inputs)) throw new Error(`tape: row ${tick} carries no inputs array`);
    last = tick;
  }
  return t;
}

/** the inputs in force at `tick`: the last row at or before it, or none */
export function inputsAtTick(tape: Tape, tick: number, players: number): InputFrame[] {
  let row: InputFrame[] = [];
  for (const [t, inputs] of tape.frames) {
    if (t > tick) break;
    row = inputs;
  }
  const out: InputFrame[] = [];
  for (let i = 0; i < players; i++) out.push(row[i] ?? NO_INPUT);
  return out;
}
