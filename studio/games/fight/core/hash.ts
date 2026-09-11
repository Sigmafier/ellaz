// The checksum every port of this sim has to agree on, byte for byte.
//
// FNV-1a 32-bit over an explicit byte stream. Three rules, all of them there so
// a GDScript or Lua port can produce the same eight characters:
//
//  - the multiply is `Math.imul` and every intermediate is brought back to
//    uint32 with `>>> 0` (GDScript needs `& 0xFFFFFFFF`; Lua 5.1 needs the
//    16-bit-split imul32) - PROBE-SPEC.md trap #2;
//  - bytes come out ARITHMETICALLY, `% 256` then `floorDiv(u, 256)`, never
//    `>>` or `&`, which Lua 5.1 does not have - trap #3;
//  - every `%` operand is non-negative by construction (`v >>> 0` first), so
//    the sign of `%` cannot differ by language - trap #4.
//
// NEVER JSON.stringify a state to hash it: key order, number formatting and
// `-0` are all things a JSON writer is allowed to differ on, and none of them
// is part of the simulation.
//
// The field lists are exported because they ARE the contract. A field added to
// FighterState and not added here would be invisible to every desync check in
// the suite, so hash-discriminates.test.ts reads the fixture's own keys back
// and goes red when the two disagree.

import { floorDiv } from "./fixed";
import type { AiState, FighterState, FightEvent, FightState, HitEffect } from "./types";

export type HashedStateField = Exclude<keyof FightState, "fighters" | "events">;
export type HashedFighterField = Exclude<keyof FighterState, "ai">;
export type HashedAiField = keyof AiState;

/** the FightState scalars, in fold order. `fighters` and `events` are not scalars. */
export const HASHED_STATE_FIELDS: readonly HashedStateField[] = [
  "tick",
  "rng",
  "phase",
  "phaseT",
  "freeze",
  "shake",
  "winner",
];

/** every FighterState field except `ai`, in fold order */
export const HASHED_FIGHTER_FIELDS: readonly HashedFighterField[] = [
  "x",
  "z",
  "h",
  "vx",
  "vz",
  "vh",
  "face",
  "st",
  "stT",
  "frame",
  "hp",
  "stun",
  "inv",
  "down",
  "fall",
  "hits",
  "hitsT",
  "hitMask",
];

/** every AiState field, in fold order */
export const HASHED_AI_FIELDS: readonly HashedAiField[] = [
  "cooldown",
  "mode",
  "modeT",
  "wantMx",
  "wantMz",
  "wantAttack",
];

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

/** FNV-1a 32-bit. Exported so a test can fold a known vector without a state. */
export function fnv1a(bytes: Iterable<number>): number {
  let h = FNV_OFFSET >>> 0;
  for (const b of bytes) {
    h = (h ^ (b % 256)) >>> 0;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

/** four bytes of a value's uint32 two's complement, least significant first */
function pushU32(out: number[], v: number | boolean): void {
  let u = (typeof v === "boolean" ? (v ? 1 : 0) : v) >>> 0;
  for (let i = 0; i < 4; i++) {
    out.push(u % 256);
    u = floorDiv(u, 256);
  }
}

function hex8(h: number): string {
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Eight lowercase hex characters over the whole simulation state: the state
 * scalars in order, then each fighter's scalars in order, each followed by a
 * single marker byte (0 absent / 1 present) and the ai scalars when present.
 * `events` are NOT folded in - they are this tick's output, not its state.
 */
export function hashState(s: FightState): string {
  const bytes: number[] = [];
  for (const f of HASHED_STATE_FIELDS) pushU32(bytes, s[f]);
  for (const fighter of s.fighters) {
    for (const f of HASHED_FIGHTER_FIELDS) pushU32(bytes, fighter[f]);
    const ai = fighter.ai;
    if (ai === null) {
      bytes.push(0);
      continue;
    }
    bytes.push(1);
    for (const f of HASHED_AI_FIELDS) pushU32(bytes, ai[f]);
  }
  return hex8(fnv1a(bytes));
}

/** kind -> a small integer, so the string spelling never reaches the hash */
const EVENT_CODE: Record<FightEvent["kind"], number> = {
  hit: 1,
  block: 2,
  knockdown: 3,
  ko: 4,
  land: 5,
  phase: 6,
};

const EFFECT_CODE: Record<HitEffect, number> = { none: 0, spark: 1, dust: 2, star: 3 };

/** Eight hex characters over the tick's event list: a code per kind, then that kind's fields in a fixed order. */
export function hashEvents(events: readonly FightEvent[]): string {
  const bytes: number[] = [];
  for (const e of events) {
    pushU32(bytes, EVENT_CODE[e.kind]);
    switch (e.kind) {
      case "hit":
        pushU32(bytes, e.attacker);
        pushU32(bytes, e.target);
        pushU32(bytes, e.x);
        pushU32(bytes, e.z);
        pushU32(bytes, e.h);
        pushU32(bytes, e.damage);
        pushU32(bytes, EFFECT_CODE[e.effect]);
        break;
      case "block":
      case "knockdown":
      case "ko":
        pushU32(bytes, e.target);
        break;
      case "land":
        pushU32(bytes, e.who);
        break;
      case "phase":
        pushU32(bytes, e.phase);
        break;
    }
  }
  return hex8(fnv1a(bytes));
}

/**
 * Fold a sequence of 8-hex-char tick hashes into one word: the trajectory
 * chain. A flight that differs mid-air and lands on the same pixel moves this
 * when it moves nothing else (gravity +1: apex 7680 -> 7560 FP, hash and
 * events unchanged - measured 2026-09-12). Every cell folds the same way so
 * window.__fightChain compares to the golden's `chain`.
 */
export function chainOf(tickHashes: readonly string[]): string {
  const bytes: number[] = [];
  for (const h of tickHashes) for (let i = 0; i < h.length; i++) bytes.push(h.charCodeAt(i));
  return fnv1a(bytes).toString(16).padStart(8, "0");
}
