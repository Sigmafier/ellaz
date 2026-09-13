// The turn state's checksum: the same FNV-1a over the same byte stream the
// fight's hash.ts folds (sim/hash.ts's pushU32, exported for exactly this),
// so a cell's __fightHash means one thing across kinds. The field lists are
// the contract - hash-discriminates.test.ts reads the fixture's own keys back
// and goes red when a field is missing from its list.
//
// Layout: the state scalars; the log's four; the unit count then each unit's
// scalars followed by its path (count then each index); the float count then
// each float's scalars. `events` are the tick's output, hashed apart.

import { fnv1a, hex8, pushU32 } from "../sim/hash";
import type { FloatState, LogState, TurnEvent, TurnState, UnitState } from "./types";

export type HashedTurnStateField = Exclude<keyof TurnState, "units" | "floats" | "events" | "log">;
export type HashedUnitField = Exclude<keyof UnitState, "path">;
export type HashedLogField = keyof LogState;
export type HashedFloatField = keyof FloatState;

export const HASHED_TURN_STATE_FIELDS: readonly HashedTurnStateField[] = [
  "tick", "rng", "phase", "phaseT", "sub", "turn", "sel", "actor", "cursor", "banner", "bannerT",
];

export const HASHED_LOG_FIELDS: readonly HashedLogField[] = ["kind", "a", "b", "n"];

export const HASHED_UNIT_FIELDS: readonly HashedUnitField[] = [
  "c", "r", "x", "y", "hp", "acted", "moved", "face", "clip", "clipT", "act", "actT", "fromX", "fromY", "pathIdx", "target", "strikes",
];

export const HASHED_FLOAT_FIELDS: readonly HashedFloatField[] = ["x", "y", "value", "t"];

export function hashTurnState(s: TurnState): string {
  const bytes: number[] = [];
  for (const k of HASHED_TURN_STATE_FIELDS) pushU32(bytes, s[k]);
  for (const k of HASHED_LOG_FIELDS) pushU32(bytes, s.log[k]);
  pushU32(bytes, s.units.length);
  for (const u of s.units) {
    for (const k of HASHED_UNIT_FIELDS) pushU32(bytes, u[k]);
    pushU32(bytes, u.path.length);
    for (const idx of u.path) pushU32(bytes, idx);
  }
  pushU32(bytes, s.floats.length);
  for (const f of s.floats) for (const k of HASHED_FLOAT_FIELDS) pushU32(bytes, f[k]);
  return hex8(fnv1a(bytes));
}

const EVENT_CODE: Record<TurnEvent["kind"], number> = { hit: 1, ko: 2, phase: 3, turn: 4 };

export function hashTurnEvents(events: readonly TurnEvent[]): string {
  const bytes: number[] = [];
  for (const e of events) {
    pushU32(bytes, EVENT_CODE[e.kind]);
    switch (e.kind) {
      case "hit":
        pushU32(bytes, e.attacker); pushU32(bytes, e.target); pushU32(bytes, e.x); pushU32(bytes, e.z); pushU32(bytes, e.h); pushU32(bytes, e.damage);
        break;
      case "ko": pushU32(bytes, e.target); break;
      case "phase": pushU32(bytes, e.phase); break;
      case "turn": pushU32(bytes, e.turn); break;
    }
  }
  return hex8(fnv1a(bytes));
}
