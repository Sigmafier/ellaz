import { describe as group, expect, it } from "vitest";
import { cards, cardCode, RANK_CHARS } from "@shared/engine/cards";
import { best5, handName, _ranks } from "./handName";

group("handName", () => {
  it("names every category in English", () => {
    // Seven cards each time — hole + board, the real shape at a showdown.
    const cases: [string, string][] = [
      ["Ah Kd 9c 4s 2h 7d 5c", "Ace high"],
      ["Ah Ad 9c 4s 2h 7d 5c", "Pair of aces"],
      ["Ah Ad 9c 9s 2h 7d 5c", "Two pair, aces and nines"],
      ["Ah Ad Ac 9s 2h 7d 5c", "Three aces"],
      ["9h 8d 7c 6s 5h Ad 2c", "Straight to the nine"],
      ["Ah 9h 7h 4h 2h Kd 3c", "Flush, ace high"],
      ["Ah Ad Ac 9s 9h 7d 5c", "Full house, aces over nines"],
      ["Ah Ad Ac As 9h 7d 5c", "Four aces"],
      ["9h 8h 7h 6h 5h Ad 2c", "Straight flush to the nine"],
      ["Ah Kh Qh Jh Th 2d 3c", "Royal flush"],
    ];
    for (const [spec, want] of cases) {
      expect(handName(cards(spec), "en"), spec).toBe(want);
    }
  });

  it("names the categories in Hebrew, using card symbols for the ranks", () => {
    expect(handName(cards("Ah Ad 9c 4s 2h 7d 5c"), "he")).toBe("זוג A");
    expect(handName(cards("Ah Ad 9c 9s 2h 7d 5c"), "he")).toBe("שתי זוגות: A ו-9");
    expect(handName(cards("Ah Ad Ac 9s 9h 7d 5c"), "he")).toBe("פול האוס: A על 9");
    expect(handName(cards("9h 8d 7c 6s 5h Ad 2c"), "he")).toBe("רצף 9");
  });

  it("returns null rather than inventing a hand when nobody showed", () => {
    // The fold-to-a-bet case. There is no hand, and saying one would be a lie
    // at a table where the name of the winning hand is load-bearing.
    expect(handName([], "en")).toBeNull();
    expect(handName(cards("Ah Kd"), "en")).toBeNull();
    expect(handName(cards("Ah Kd 9c 4s"), "en")).toBeNull();
    // Five is enough — an all-in shown on the flop.
    expect(handName(cards("Ah Ad 9c 4s 2h"), "en")).toBe("Pair of aces");
  });

  it("reads the low straight as a five, not as an ace", () => {
    // A-2-3-4-5 is the wheel: the ace plays low, so the straight is to the
    // FIVE. Naming it "straight to the ace" is the classic off-by-one here.
    expect(handName(cards("Ah 2d 3c 4s 5h Kd 9c"), "en")).toBe("Straight to the five");
  });

  group("best5", () => {
    it("picks the five cards that actually made the hand", () => {
      // Two pair aces and nines, kicker seven. The 4 and the 2 are not in it.
      const got = best5(cards("Ah Ad 9c 9s 7h 4d 2c")).map(cardCode).sort();
      expect(got).toEqual(["7h", "9c", "9s", "Ad", "Ah"].sort());
    });

    it("prefers the flush over the pair when both are available", () => {
      const got = best5(cards("Ah 9h 7h 4h 2h Ad 2c")).map(cardCode).sort();
      expect(got).toEqual(["2h", "4h", "7h", "9h", "Ah"].sort());
    });

    it("returns what it was given when there is nothing to choose", () => {
      expect(best5(cards("Ah Ad 9c 4s 2h"))).toHaveLength(5);
      expect(best5(cards("Ah Ad"))).toHaveLength(2);
    });

    it("agrees with handName on the same seven cards", () => {
      // The two must never disagree: highlighting five cards while naming a
      // hand those five do not make is worse than highlighting nothing.
      const seven = cards("Ah Ad Ac 9s 9h 7d 5c");
      expect(handName(best5(seven), "en")).toBe(handName(seven, "en"));
    });
  });
});

group("the rank tables line up with the engine", () => {
  it("has one entry per rank, in the engine's own order", () => {
    // A table one entry short renders `undefined` into the banner, and a table
    // in the wrong ORDER renders a confident wrong hand — which is the failure
    // that would never be noticed, because it reads perfectly.
    expect(_ranks.SYMBOL).toHaveLength(RANK_CHARS.length);
    expect(_ranks.ONE).toHaveLength(RANK_CHARS.length);
    expect(_ranks.MANY).toHaveLength(RANK_CHARS.length);
    for (let r = 0; r < RANK_CHARS.length; r++) {
      // "T" displays as "10"; every other symbol is the engine's own char.
      const want = RANK_CHARS[r] === "T" ? "10" : RANK_CHARS[r];
      expect(_ranks.SYMBOL[r], `rank ${r}`).toBe(want);
    }
    expect(_ranks.ONE[12]).toBe("ace");
    expect(_ranks.MANY[12]).toBe("aces");
    expect(_ranks.ONE[0]).toBe("two");
  });
});
