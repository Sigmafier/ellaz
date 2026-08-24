import { describe, expect, it } from "vitest";
import { medalFor, placingPoints, MEDAL_POINTS, BOARD_POINT } from "./medals";

describe("medalFor", () => {
  it("rank 1 is always gold, even on a small board", () => {
    // The measured defect this rule exists to fix: a percentile-only rule
    // gives NO gold on a board of five (top 10% of 5 is half a player).
    expect(medalFor(1, 5)).toBe("gold");
    expect(medalFor(1, 2)).toBe("gold");
  });

  it("a board of one is never a medal", () => {
    expect(medalFor(1, 1)).toBe("none");
    expect(medalFor(1, 0)).toBe("none");
  });

  it("percentile tiers apply past rank 1", () => {
    // 100 players: rank 10 is exactly the 10% cutoff (gold), rank 11 is not.
    expect(medalFor(10, 100)).toBe("gold");
    expect(medalFor(11, 100)).toBe("silver");
    expect(medalFor(25, 100)).toBe("silver");
    expect(medalFor(26, 100)).toBe("bronze");
    expect(medalFor(50, 100)).toBe("bronze");
    expect(medalFor(51, 100)).toBe("none");
  });

  it("junk counts resolve to none rather than throwing", () => {
    expect(medalFor(NaN, 10)).toBe("none");
    expect(medalFor(1, NaN)).toBe("none");
    expect(medalFor(0, 10)).toBe("none");
    expect(medalFor(11, 10)).toBe("none");
  });
});

describe("placingPoints", () => {
  it("a board with no medal is still worth the board point", () => {
    expect(placingPoints(60, 100)).toBe(BOARD_POINT);
  });

  it("a gold is the board point plus the gold medal", () => {
    expect(placingPoints(1, 5)).toBe(BOARD_POINT + MEDAL_POINTS.gold);
  });
});
