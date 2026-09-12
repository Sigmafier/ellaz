// Integer arithmetic for the sim. This is the ONLY file in core/ allowed to
// divide. Every quantity is an int32-range integer in 1/256 px (FP), and
// `floorDiv` is the one rounding rule: JS `/` then `Math.floor` FLOORS, which
// is exact for integers of our magnitude and is what every other runtime the
// prior tournament ported to (GDScript truncates, Lua has no ints) had to be
// made to agree with. Never `Math.trunc`, never a bare `/` outside this file,
// never a `%` on a negative operand - docs/engine-tournament/PROBE-SPEC.md.

import { FP } from "./types";

export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/** (a * b) / FP, for FP x FP products such as a velocity scaled by a fraction */
export function mul(a: number, b: number): number {
  return floorDiv(a * b, FP);
}

/** view pixels -> FP */
export function toFP(px: number): number {
  return px * FP;
}

/** FP -> whole view pixels, floored (the view rounds; the sim never does) */
export function toPx(fp: number): number {
  return floorDiv(fp, FP);
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function sign(v: number): -1 | 0 | 1 {
  return v < 0 ? -1 : v > 0 ? 1 : 0;
}

export function abs(v: number): number {
  return v < 0 ? -v : v;
}

/** a non-negative modulo, for wrapping tick counters */
export function mod(a: number, n: number): number {
  return a - floorDiv(a, n) * n;
}
