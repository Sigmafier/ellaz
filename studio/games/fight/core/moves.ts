// Reading a compiled state. Pure lookups over the frozen tables compile.ts
// produced - no state, no clock of its own, nothing that could disagree between
// the sim and the view. step() asks these questions every tick and so does the
// cell when it draws, and both must get the same answer from the same `stT`.
//
// There are TWO timing rules, and which one a state uses was decided at compile
// time by whether its moves file authored `wait`:
//
//   fps rule    starts is empty. The clip's fps alone places the frame.
//   wait rule   starts holds a tick per frame. The clip's fps is ignored.
//
// Keeping both is what lets an attack hold its active frames for an exact
// number of ticks (a fighting game needs that) while an idle just breathes at
// whatever rate it was drawn for.

import { TICK_RATE } from "./types";
import type { CFighter, CFrame, CState } from "./types";
import { floorDiv, mod } from "./fixed";

/**
 * Which frame of `st` is showing after `stT` ticks in it.
 *
 * A one-shot state HOLDS its last frame past the end rather than running off
 * the array - the state machine decides when to leave, not this function, and
 * returning -1 or undefined here would put that decision in every caller.
 */
export function frameIndexAt(st: CState, stT: number): number {
  const n = st.frames.length;
  if (n <= 1) return 0;

  if (st.starts.length > 0) {
    const t = st.loop ? mod(stT, st.total) : stT;
    let i = 0;
    // the LAST start at or before t; the loop runs forward so the last win
    for (let k = 0; k < n; k++) if (st.starts[k] <= t) i = k;
    return i;
  }

  const raw = floorDiv(stT * st.fps, TICK_RATE);
  return st.loop ? mod(raw, n) : Math.min(raw, n - 1);
}

/** has a one-shot state run out? A looping state never does. */
export function stateDone(st: CState, stT: number): boolean {
  return !st.loop && stT >= st.total;
}

/**
 * The frame record showing after `stT` ticks in state `st` of fighter `f`.
 *
 * `st` is the INDEX, not the state - that is what FighterState carries, so the
 * two call sites that matter read `frameAt(cf, f.st, f.stT)` with no lookup of
 * their own. Passing the state object instead would compile (both are objects
 * to nobody) and index `f.states` with NaN, so the type is load-bearing.
 */
export function frameAt(f: CFighter, st: number, stT: number): CFrame {
  const state = f.states[st];
  return state.frames[frameIndexAt(state, stT)];
}

/** the index of `name` in `f.states`, or -1. States are sorted by name. */
export function stateIndex(f: CFighter, name: string): number {
  for (let i = 0; i < f.states.length; i++) if (f.states[i].name === name) return i;
  return -1;
}

/**
 * May an input interrupt this state on this frame? `cancelFrom` is -1 when the
 * moves file authored none, and -1 must mean NEVER rather than "from frame -1
 * onward", which is why this is a function and not a comparison at each caller.
 */
export function canCancel(st: CState, frameIdx: number): boolean {
  return st.cancelFrom >= 0 && frameIdx >= st.cancelFrom;
}
