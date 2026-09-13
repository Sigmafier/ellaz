// The dungeon state's checksum: the same FNV-1a over the same byte stream the
// fight's hash.ts folds (sim/hash.ts's pushU32, exported for exactly this),
// so a cell's __fightHash means one thing across kinds. The field lists are
// the contract - hash-discriminates.test.ts reads the fixture's own keys back
// and goes red when a field is missing from its list.
//
// Layout: the state scalars; the actor count then each actor's scalars
// followed by its path (count then each index); the drop, float and marker
// counts, each followed by their rows. The cosmetic rows (floats, markers,
// flash) are folded too: they are deterministic, and one list with no
// exceptions is one list nobody forgets to extend. `events` are the tick's
// output, hashed apart.

import { fnv1a, hex8, pushU32 } from "../sim/hash";
import type { ActorState, DropState, DungeonEvent, DungeonState, FloatState, MarkerState } from "./types";

export type HashedDungeonStateField = Exclude<keyof DungeonState, "actors" | "drops" | "floats" | "markers" | "events">;
export type HashedActorField = Exclude<keyof ActorState, "path">;
export type HashedDropField = keyof DropState;
export type HashedFloatField = keyof FloatState;
export type HashedMarkerField = keyof MarkerState;

export const HASHED_DUNGEON_STATE_FIELDS: readonly HashedDungeonStateField[] = ["tick", "rng", "phase", "bannerT", "banner", "coins"];

export const HASHED_ACTOR_FIELDS: readonly HashedActorField[] = [
  "x", "y", "vx", "vy", "hp", "mp", "face", "state", "stateT", "cd", "pause", "since", "swoopT", "alt", "aimX", "aimY",
  "target", "repath", "struck", "dropped", "flash", "goalX", "goalY",
];

export const HASHED_DROP_FIELDS: readonly HashedDropField[] = ["x", "y", "value", "t"];
export const HASHED_FLOAT_FIELDS: readonly HashedFloatField[] = ["x", "y", "z", "value", "t"];
export const HASHED_MARKER_FIELDS: readonly HashedMarkerField[] = ["i", "j", "t"];

export function hashDungeonState(s: DungeonState): string {
  const bytes: number[] = [];
  for (const k of HASHED_DUNGEON_STATE_FIELDS) pushU32(bytes, s[k]);
  pushU32(bytes, s.actors.length);
  for (const a of s.actors) {
    for (const k of HASHED_ACTOR_FIELDS) pushU32(bytes, a[k]);
    pushU32(bytes, a.path.length);
    for (const idx of a.path) pushU32(bytes, idx);
  }
  pushU32(bytes, s.drops.length);
  for (const d of s.drops) for (const k of HASHED_DROP_FIELDS) pushU32(bytes, d[k]);
  pushU32(bytes, s.floats.length);
  for (const f of s.floats) for (const k of HASHED_FLOAT_FIELDS) pushU32(bytes, f[k]);
  pushU32(bytes, s.markers.length);
  for (const m of s.markers) for (const k of HASHED_MARKER_FIELDS) pushU32(bytes, m[k]);
  return hex8(fnv1a(bytes));
}

const EVENT_CODE: Record<DungeonEvent["kind"], number> = { hit: 1, ko: 2, coin: 3, phase: 4 };

export function hashDungeonEvents(events: readonly DungeonEvent[]): string {
  const bytes: number[] = [];
  for (const e of events) {
    pushU32(bytes, EVENT_CODE[e.kind]);
    switch (e.kind) {
      case "hit":
        pushU32(bytes, e.attacker); pushU32(bytes, e.target); pushU32(bytes, e.x); pushU32(bytes, e.z); pushU32(bytes, e.h); pushU32(bytes, e.damage);
        break;
      case "ko": pushU32(bytes, e.target); break;
      case "coin": pushU32(bytes, e.x); pushU32(bytes, e.z); pushU32(bytes, e.coins); break;
      case "phase": pushU32(bytes, e.phase); break;
    }
  }
  return hex8(fnv1a(bytes));
}
