// A dungeon tape's rows HOLD their direction and FIRE their act. The fight
// reads the last row at or before a tick and holds it, because its inputs are
// buttons a hand keeps down; the turn fires a row on its own tick and reads
// every other tick as no input, because a click is over the instant it
// happens. A dungeon input is both: `dx, dy` are keys a hand holds, `act` is a
// click, a swing or a restart that happens once. So the last row at or before
// the tick is read, and its `act` is kept only on the row's own tick.

import type { Tape } from "../sim/tape";
import { ACT_INPUT_NONE, NO_DUNGEON_INPUT } from "./types";
import type { DungeonInput } from "./types";

/** the inputs in force at `tick`: the direction of the last row at or before it, the act only on that row's tick; one entry per player (the dungeon has one) */
export function inputsAtDungeon(tape: Tape<DungeonInput>, tick: number, players: number): DungeonInput[] {
  let row: DungeonInput[] = [], rowTick = -1;
  for (const [t, inputs] of tape.frames) {
    if (t > tick) break;
    row = inputs; rowTick = t;
  }
  const out: DungeonInput[] = [];
  for (let i = 0; i < players; i++) {
    const r = row[i] ?? NO_DUNGEON_INPUT;
    out.push(rowTick === tick ? r : { ...r, act: ACT_INPUT_NONE, x: 0, y: 0 });
  }
  return out;
}
