// One tick of the room. Pure: the state and the input it is handed are never
// written (step-is-pure.test.ts freezes them); it clones, advances the clone,
// and returns it. The order is fixed - the knight, then every foe in cast
// order, then the ground foes push apart, then the coins and the phase, then
// the cosmetics every phase shares - so a tape replays to one hash on every
// cell.
//
// A restart is honoured in every phase: the room is one screen and a fresh
// start is the only way back. Once the room is won or lost, only the
// cosmetics advance: the last clip plays out and the banner stands.

import { separate, tickFoe } from "./foes";
import { tickKnight } from "./knight";
import { cloneState, createState, tickCosmetics, tickRoom } from "./room";
import { ACT_INPUT_RESTART, NO_DUNGEON_INPUT, PHASE_LOST, PHASE_WON } from "./types";
import type { DungeonData, DungeonInput, DungeonState } from "./types";

export function stepDungeon(state: DungeonState, inputs: readonly DungeonInput[], data: DungeonData): DungeonState {
  const s = cloneState(state);
  s.tick += 1;
  const input = inputs[0] ?? NO_DUNGEON_INPUT;
  if (input.act === ACT_INPUT_RESTART) {
    const fresh = createState(data);
    fresh.tick = s.tick;
    return fresh;
  }
  if (s.phase !== PHASE_WON && s.phase !== PHASE_LOST) {
    tickKnight(s, data, 0, input);
    for (let i = 1; i < s.actors.length; i++) tickFoe(s, data, i);
    separate(s, data);
    tickRoom(s, data);
  }
  tickCosmetics(s);
  return s;
}
