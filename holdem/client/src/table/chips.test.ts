import { describe as group, expect, it } from "vitest";
import { chipStack, DENOMS, stackValue, visibleColumns } from "./chips";

group("chipStack", () => {
  it("always sums to the amount it represents", () => {
    // The one invariant that matters. A stack that does not add up is a
    // picture of a lie at a poker table, and it looks completely normal.
    for (let n = 1; n <= 1000; n++) {
      expect(stackValue(chipStack(n)), `amount ${n}`).toBe(n);
    }
    for (const n of [1234, 9999, 100_000, 200]) {
      expect(stackValue(chipStack(n)), `amount ${n}`).toBe(n);
    }
  });

  it("uses the fewest chips it can", () => {
    // Greedy is optimal for 1/5/25/100 — every denomination divides the next.
    // Worth pinning, because it stops being true the moment somebody adds a
    // 3 or a 40 to DENOMS, and the failure would be a silently uglier pile.
    const chips = (n: number) => chipStack(n).reduce((s, c) => s + c.count, 0);
    expect(chips(100)).toBe(1);
    expect(chips(125)).toBe(2);
    expect(chips(99)).toBe(3 + 4 + 4); // 3x25 + 4x5 + 4x1
    expect(chips(4)).toBe(4);
  });

  it("emits columns largest denomination first, and never an empty one", () => {
    const cols = chipStack(137);
    expect(cols.map((c) => c.value)).toEqual([100, 25, 5, 1]);
    expect(cols.map((c) => c.count)).toEqual([1, 1, 2, 2]);
    for (const c of chipStack(role())) expect(c.count).toBeGreaterThan(0);
    function role() {
      return 100 + 5; // a value with a GAP in the middle: no 25s
    }
    expect(chipStack(105).map((c) => c.value)).toEqual([100, 5]);
  });

  it("gives no chips at all rather than a wrong pile", () => {
    // These arrive from the wire. An honest empty picture beside an exact
    // number beats a guess that renders confidently.
    for (const bad of [0, -1, -100, 0.5, 12.7, NaN, Infinity, -Infinity]) {
      expect(chipStack(bad as number), `amount ${bad}`).toEqual([]);
      expect(stackValue(chipStack(bad as number))).toBe(0);
    }
  });

  it("keeps its denominations sorted largest-first, which greedy depends on", () => {
    expect([...DENOMS]).toEqual([...DENOMS].sort((a, b) => b - a));
    expect(DENOMS).toContain(1); // or some amounts cannot be represented at all
  });

  it("can represent every whole amount, because 1 is a denomination", () => {
    // The control for the line above: without a 1-chip, greedy leaves a
    // remainder and the sum invariant breaks for most numbers.
    for (const n of [1, 2, 3, 4, 6, 7, 26, 101]) expect(stackValue(chipStack(n))).toBe(n);
  });
});

group("visibleColumns", () => {
  it("keeps the largest denominations when it cannot show them all", () => {
    // Dropping the small change is fine — the exact number is drawn beside it.
    // Dropping the black chips would make a 300 bet look like a 12.
    const cols = chipStack(137); // 100, 25, 5, 1
    expect(visibleColumns(cols, 2).map((c) => c.value)).toEqual([100, 25]);
    expect(visibleColumns(cols, 1).map((c) => c.value)).toEqual([100]);
  });

  it("returns everything when there is room, and nothing when there is none", () => {
    const cols = chipStack(137);
    expect(visibleColumns(cols, 4)).toHaveLength(4);
    expect(visibleColumns(cols, 99)).toHaveLength(4);
    expect(visibleColumns(cols, 0)).toEqual([]);
    expect(visibleColumns(cols, -3)).toEqual([]);
    expect(visibleColumns([], 4)).toEqual([]);
  });

  it("never mutates what it was given", () => {
    const cols = chipStack(137);
    const before = JSON.stringify(cols);
    visibleColumns(cols, 2);
    expect(JSON.stringify(cols)).toBe(before);
  });
});
