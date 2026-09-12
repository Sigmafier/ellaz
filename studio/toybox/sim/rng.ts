// A uint32 generator whose whole state is ONE number that lives inside
// FightState, so the sim has no hidden state: snapshot-and-resume reproduces
// the same stream. mulberry32 on Math.imul; every intermediate is brought back
// to uint32 with `>>> 0` so it stays exact. The AI draws from this and never
// from Math.random (ai-is-in-the-sim.test.ts plants that and expects red).

export function seedRng(seed: number): number {
  return seed >>> 0;
}

/** advance once; returns [nextState, uint32 value] */
export function nextRng(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
  const value = (t ^ (t >>> 14)) >>> 0;
  return [a, value];
}

/** one byte 0-255, the unit every probability in ai.json is authored in */
export function rngByte(state: number): [number, number] {
  const [s, v] = nextRng(state);
  return [s, v % 256];
}

/** an integer in [lo, hi] inclusive */
export function rngRange(state: number, lo: number, hi: number): [number, number] {
  const [s, v] = nextRng(state);
  return [s, lo + (v % (hi - lo + 1))];
}
