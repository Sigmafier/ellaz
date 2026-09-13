// One tick of the turn machine. Pure: the state and the inputs it is handed
// are never written (step-is-pure.test.ts freezes them); it clones, advances
// the clone, and returns it. The order is fixed - the player's input first,
// then whichever phase is running, then the cosmetics every phase shares -
// so a tape replays to one hash on every cell.
//
// A restart is honoured while the player holds the board (PLAYER, WON, LOST)
// and ignored while something is playing out: an animation always finishes.

import { afterHeroAction, cloneState, createState, handlePick, handleWait, tickActor, tickCosmetics, tickEnemyPhase } from "./battle";
import { ACT_INPUT_PICK, ACT_INPUT_RESTART, ACT_INPUT_WAIT, NO_TURN_INPUT, PHASE_ANIM, PHASE_ENEMY, PHASE_PLAYER, PHASE_WON } from "./types";
import type { TurnData, TurnInput, TurnState } from "./types";

export function stepTurn(state: TurnState, inputs: readonly TurnInput[], data: TurnData): TurnState {
  const s = cloneState(state);
  s.tick += 1;
  const input = inputs[0] ?? NO_TURN_INPUT;
  if (input.act === ACT_INPUT_RESTART && (s.phase === PHASE_PLAYER || s.phase >= PHASE_WON)) {
    const fresh = createState(data);
    fresh.tick = s.tick;
    return fresh;
  }
  if (s.phase === PHASE_PLAYER) {
    if (input.act === ACT_INPUT_PICK) handlePick(s, data, input.c, input.r);
    else if (input.act === ACT_INPUT_WAIT) handleWait(s, data);
  } else if (s.phase === PHASE_ANIM) {
    if (tickActor(s, data)) afterHeroAction(s, data);
  } else if (s.phase === PHASE_ENEMY) {
    tickEnemyPhase(s, data);
  }
  tickCosmetics(s, data);
  return s;
}
