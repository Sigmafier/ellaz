// The turn machine as a SimKind: the second kind the one loop can drive. Every
// value is the turn sim's own export (toybox/turn/) handed through the
// contract; the two things a cell page needs that the sim does not carry are
// here - the http loader and the pointer. The battle file is the field, so
// `arena` returns its view and art.

import { compileTurn } from "../../turn/compile";
import { createState } from "../../turn/battle";
import { hashTurnEvents, hashTurnState } from "../../turn/hash";
import { stepTurn } from "../../turn/step";
import { inputsAtTurn } from "../../turn/tape";
import { viewTurn } from "../../turn/view";
import type { LoadedTurn, TurnData, TurnEvent, TurnInput, TurnState } from "../../turn/types";
import type { SimKind } from "../contract";
import { loadTurnHttp } from "../shared/assets-turn";
import { attachPointer } from "../shared/pointer";

export const turnKind: SimKind<LoadedTurn, TurnData, TurnState, TurnInput, TurnEvent> = {
  id: "turn",
  load: loadTurnHttp,
  compile: compileTurn,
  sets: (loaded) => Object.keys(loaded.sets),
  arena: (loaded) => ({ view: loaded.battle.view, art: loaded.battle.art }),
  // a turn battle has no purse to carry between stages; a campaign handing one over has the wrong kind
  create: (data, carry) => { if (carry) throw new Error("turn kind: a carry was handed to a turn battle, which has no purse to seed"); return createState(data); },
  step: stepTurn,
  hashState: hashTurnState,
  hashEvents: hashTurnEvents,
  tick: (s) => s.tick,
  events: (s) => s.events,
  players: () => 1,
  inputsAt: inputsAtTurn,
  view: viewTurn,
  attachInput: attachPointer,
  publish: (s) => ({ __fightTurn: { turn: s.turn, phase: s.phase, sel: s.sel, hp: s.units.map((u) => u.hp) } }),
};
