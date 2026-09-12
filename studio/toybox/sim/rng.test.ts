// The generator's whole state is one number that lives inside FightState, so
// "resume from a snapshot" and "replay from the start" have to produce the
// same stream. That is the property the last block here pins; the rest pin the
// ranges every caller assumes without checking.

import { nextRng, rngByte, rngRange, seedRng } from "./rng";

const U32 = 4294967296; // 2^32

/** the next `n` values, and the state left behind */
function draw(state: number, n: number): { state: number; values: number[] } {
  const values: number[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const [next, v] = nextRng(s);
    s = next;
    values.push(v);
  }
  return { state: s, values };
}

describe("seedRng", () => {
  it("coerces to uint32 so a negative seed is still a state", () => {
    expect(seedRng(0)).toBe(0);
    expect(seedRng(1)).toBe(1);
    expect(seedRng(-1)).toBe(U32 - 1);
    expect(seedRng(U32 + 5)).toBe(5);
  });
});

describe("nextRng", () => {
  it("gives the same 20 values for the same seed", () => {
    const a = draw(seedRng(12345), 20);
    const b = draw(seedRng(12345), 20);
    expect(a.values).toEqual(b.values);
    expect(a.state).toBe(b.state);
    expect(a.values).toHaveLength(20);
  });

  it("gives different values for different seeds", () => {
    // The control for the test above: without this, a generator stuck on one
    // constant would pass "same seed, same stream" perfectly.
    const a = draw(seedRng(12345), 20).values;
    const b = draw(seedRng(12346), 20).values;
    expect(a).not.toEqual(b);
    const overlap = a.filter((v, i) => v === b[i]).length;
    expect(overlap).toBe(0);
  });

  it("never repeats itself inside a short run", () => {
    const { values } = draw(seedRng(7), 500);
    expect(new Set(values).size).toBe(500);
  });

  it("returns an integer in [0, 2^32) every time, state included", () => {
    let s = seedRng(999);
    for (let i = 0; i < 2000; i++) {
      const [next, v] = nextRng(s);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(U32);
      expect(Number.isInteger(next)).toBe(true);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(U32);
      s = next;
    }
  });
});

describe("rngByte", () => {
  it("stays in [0, 255] - the unit every probability in ai.json is authored in", () => {
    let s = seedRng(4242);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const [next, b] = rngByte(s);
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
      seen.add(b);
      s = next;
    }
    // ... and actually spreads, or a byte pinned to 0 would pass the bounds.
    expect(seen.size).toBeGreaterThan(200);
  });

  it("advances the state exactly as nextRng does", () => {
    const s = seedRng(31);
    expect(rngByte(s)[0]).toBe(nextRng(s)[0]);
    expect(rngByte(s)[1]).toBe(nextRng(s)[1] % 256);
  });
});

describe("rngRange", () => {
  it("stays inside [lo, hi] INCLUSIVE over 1000 draws", () => {
    for (const [lo, hi] of [
      [0, 0],
      [0, 1],
      [3, 9],
      [1, 255],
      [-5, 5],
      [10, 10],
    ] as const) {
      let s = seedRng(lo * 1000 + hi);
      for (let i = 0; i < 1000; i++) {
        const [next, v] = rngRange(s, lo, hi);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
        s = next;
      }
    }
  });

  it("reaches both ends, so the bounds check above means something", () => {
    let s = seedRng(77);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const [next, v] = rngRange(s, 3, 9);
      seen.add(v);
      s = next;
    }
    expect(seen.has(3)).toBe(true);
    expect(seen.has(9)).toBe(true);
    expect(seen.size).toBe(7);
  });
});

describe("snapshot and resume", () => {
  it("reproduces the tail: 50 + 50 from the snapshot equals the last 50 of 100", () => {
    const seed = seedRng(0xc0ffee);
    const whole = draw(seed, 100);

    const first = draw(seed, 50);
    const snapshot = first.state; // the one number a FightState carries
    const rest = draw(snapshot, 50);

    expect(rest.values).toEqual(whole.values.slice(50));
    expect(rest.state).toBe(whole.state);
    expect(first.values).toEqual(whole.values.slice(0, 50));
  });

  it("a snapshot taken mid-stream is not the seed - the resume is real", () => {
    // Control: if `state` were ignored and the stream came from somewhere
    // hidden, the assertion above would hold and this one would not.
    const seed = seedRng(0xc0ffee);
    const snapshot = draw(seed, 50).state;
    expect(snapshot).not.toBe(seed);
    expect(draw(snapshot, 5).values).not.toEqual(draw(seed, 5).values);
  });
});
