// The fight as a SimKind: the six functions run-cell.ts used to import by
// name, plus the keyboard and the touch surface merged into one poll. Nothing
// here is new behaviour - every value is the sim's own export handed to the
// loop through the contract, which is why the fight's three goldens are the
// test of this file: they must print identical to the byte.
//
// The one piece of logic that MOVED here rather than being re-exported is the
// input merge (a held axis beats a resting one, a swing on either is a swing):
// it is a fact about the fight's InputFrame, not about the loop, so a turn
// kind with a pointer never sees it.

import { compileFight } from "../../sim/compile";
import { hashEvents, hashState } from "../../sim/hash";
import { createState } from "../../sim/match";
import { step } from "../../sim/step";
import { inputsAtTick } from "../../sim/tape";
import { NO_INPUT } from "../../sim/types";
import type { FightData, FightEvent, FightState, InputFrame } from "../../sim/types";
import { viewOf } from "../../sim/view";
import type { InputPoll, SimKind } from "../contract";
import { loadFightHttp } from "../shared/assets";
import type { LoadedFightHttp } from "../shared/assets";
import { attachKeyboard, attachTouch } from "../shared/input";

/** two sources of one frame: a held axis beats a resting one, a swing on either is a swing */
function mergeInput(a: InputFrame, b: InputFrame): InputFrame {
  return { mx: b.mx !== 0 ? b.mx : a.mx, mz: b.mz !== 0 ? b.mz : a.mz, attack: a.attack || b.attack };
}

/** a live run reads the keyboard AND the touch surface; whichever is moving wins the axis, and either can swing */
function attachBoth(host: HTMLElement): InputPoll<InputFrame> {
  const sources = [attachKeyboard(window), attachTouch(host)];
  return {
    read: (side) => sources.reduce((frame, s) => mergeInput(frame, s.read(side)), NO_INPUT),
    detach: () => { for (const s of sources) s.detach(); },
  };
}

export const fightKind: SimKind<LoadedFightHttp, FightData, FightState, InputFrame, FightEvent> = {
  id: "fight",
  load: loadFightHttp,
  compile: compileFight,
  sets: (loaded) => Object.keys(loaded.sets),
  arena: (loaded) => loaded.arena,
  create: createState,
  step,
  hashState,
  hashEvents,
  tick: (s) => s.tick,
  events: (s) => s.events,
  players: (s) => s.fighters.length,
  inputsAt: inputsAtTick,
  view: viewOf,
  attachInput: (host) => attachBoth(host),
  publish: (s) => ({ __fightStage: s.stage }),
};
