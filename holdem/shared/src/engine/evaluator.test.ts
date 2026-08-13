import { describe as suite, expect, it } from "vitest";
import { cards } from "./cards";
import { CATEGORY, describe, evaluate, rank5 } from "./evaluator";

const score = (spec: string) => evaluate(cards(spec));

suite("rank5 / evaluate", () => {
  it("orders the wheel correctly: above everything below a straight, below the 6-high straight", () => {
    const wheel = score("As 2c 3d 4h 5s");
    const sixHigh = score("2c 3d 4h 5s 6c");
    const trips = score("Ks Kd Kh 2c 7s");
    expect(describe(wheel).category).toBe(CATEGORY.straight);
    expect(describe(wheel).ranks[0]).toBe(3); // five-high
    expect(wheel).toBeGreaterThan(trips);
    expect(sixHigh).toBeGreaterThan(wheel);
  });

  it("ranks the steel wheel below the 6-high straight flush", () => {
    const steelWheel = score("As 2s 3s 4s 5s");
    const sixHighSF = score("2h 3h 4h 5h 6h");
    expect(describe(steelWheel).category).toBe(CATEGORY.straightFlush);
    expect(sixHighSF).toBeGreaterThan(steelWheel);
  });

  it("splits when the board plays for both", () => {
    const board = "As Ks Qd Jh Tc";
    const a = evaluate(cards(`2c 3d ${board}`));
    const b = evaluate(cards(`7h 8s ${board}`));
    expect(a).toBe(b);
    expect(describe(a).category).toBe(CATEGORY.straight);
  });

  it("breaks two pair by the kicker, and splits when the kicker matches", () => {
    const board = "Ah Ac 9d 9c 4s";
    const kickKing = evaluate(cards(`Ks 2h ${board}`));
    const kickQueen = evaluate(cards(`Qs 2d ${board}`));
    expect(kickKing).toBeGreaterThan(kickQueen);
    const same1 = evaluate(cards(`Ks 2h ${board}`));
    const same2 = evaluate(cards(`Kd 3h ${board}`));
    expect(same1).toBe(same2);
  });

  it("picks the best two of three pairs among 7 cards", () => {
    const s = evaluate(cards("Ah Ac 9d 9c 4s 4d Kh"));
    const d = describe(s);
    expect(d.category).toBe(CATEGORY.twoPair);
    expect(d.ranks).toEqual([12, 7, 11]); // aces and nines, king kicker
  });

  it("compares flushes down to the fifth card", () => {
    const a = evaluate(cards("Ah Kh 9h 7h 3h 2c 2d"));
    const b = evaluate(cards("Ad Kd 9d 7d 2d 3c 3s"));
    expect(a).toBeGreaterThan(b);
  });

  it("caps the quads kicker at the board when the board kicker is best", () => {
    const board = "9s 9d 9c 9h Kd";
    const withAce = evaluate(cards(`Ac 2c ${board}`)); // ace beats the king kicker
    const withQueen = evaluate(cards(`Qc 2d ${board}`)); // king on board is the kicker
    const withJack = evaluate(cards(`Jc 2h ${board}`));
    expect(withAce).toBeGreaterThan(withQueen);
    expect(withQueen).toBe(withJack); // both play the board's king
  });

  it("builds a full house from two sets and counterfeits two pair", () => {
    const s = evaluate(cards("8c 8d 8h 5s 5d 5c Kh"));
    expect(describe(s).category).toBe(CATEGORY.fullHouse);
    expect(describe(s).ranks).toEqual([6, 3]); // eights full of fives

    // two pair counterfeited by the river pairing the board
    const before = evaluate(cards("6h 5c 6d 5d 9s Kc Kd"));
    expect(describe(before).category).toBe(CATEGORY.twoPair);
    expect(describe(before).ranks[0]).toBe(11); // kings play
  });

  it("keeps category ordering monotone across a fixture ladder", () => {
    const ladder = [
      "2c 5d 9h Jc Ks", // high card
      "2c 2d 9h Jc Ks", // pair
      "2c 2d 9h 9c Ks", // two pair
      "2c 2d 2h Jc Ks", // trips
      "2c 3d 4h 5c 6s", // straight
      "2h 5h 9h Jh Kh", // flush
      "2c 2d 2h Kc Ks", // full house
      "2c 2d 2h 2s Ks", // quads
      "2h 3h 4h 5h 6h", // straight flush
    ];
    const scores = ladder.map((l) => rank5(cards(l)));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it("evaluates 5, 6 and 7 card inputs consistently", () => {
    const five = evaluate(cards("Ah Kh Qh Jh Th"));
    const six = evaluate(cards("Ah Kh Qh Jh Th 2c"));
    const seven = evaluate(cards("Ah Kh Qh Jh Th 2c 3d"));
    expect(six).toBe(five);
    expect(seven).toBe(five);
    expect(() => evaluate(cards("Ah Kh Qh Jh"))).toThrow();
  });
});
