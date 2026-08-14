import { describe as group, expect, it } from "vitest";
import { feltBox, MAX_SCALE, MIN_SCALE, RAIL_W, seatRadius, tableScale, WIDE_RATIO } from "./scale";

// WRAPPER boxes — the element that holds the felt and the rail — because that
// is what tableScale takes. Viewport minus the 55px room header.
const PHONE_TALL = { w: 390, h: 585 }; // 390x640 portrait
const PHONE_WIDE = { w: 844, h: 335 }; // 844x390 landscape
const TABLET = { w: 1024, h: 713 };
const DESKTOP = { w: 1440, h: 745 };

group("tableScale", () => {
  it("never goes below 1, so no screen is smaller than the old fixed design", () => {
    // The floor is the whole safety property: this change can make things
    // bigger and must not be able to make anything smaller.
    for (const b of [PHONE_TALL, PHONE_WIDE, TABLET, DESKTOP, { w: 200, h: 200 }, { w: 100, h: 60 }]) {
      expect(tableScale(b.w, b.h).scale, `${b.w}x${b.h}`).toBeGreaterThanOrEqual(MIN_SCALE);
    }
  });

  it("never runs away on a huge screen", () => {
    expect(tableScale(4000, 3000).scale).toBe(MAX_SCALE);
  });

  it("answers usably for a box that has not been laid out yet", () => {
    // One frame before layout, and on a hidden tab, the box is 0x0. Answering
    // 1/tall is the old design — a usable table rather than a collapsed one.
    expect(tableScale(0, 0)).toEqual({ shape: "tall", scale: MIN_SCALE });
    expect(tableScale(-5, 100).scale).toBe(MIN_SCALE);
    expect(tableScale(NaN, NaN).scale).toBe(MIN_SCALE);
  });

  it("calls a landscape phone wide and a portrait phone tall", () => {
    expect(tableScale(PHONE_WIDE.w, PHONE_WIDE.h).shape).toBe("wide");
    expect(tableScale(PHONE_TALL.w, PHONE_TALL.h).shape).toBe("tall");
  });

  it("does not flip shape on a pixel — the threshold has hysteresis room", () => {
    // A near-square tablet must land on one side and stay there while browser
    // chrome collapses by a few pixels, or the whole table re-lays out mid-hand.
    expect(tableScale(1000, 999).shape).toBe("tall");
    expect(tableScale(1000, 810).shape).toBe("tall"); // ratio 1.23, just under
    expect(tableScale(1000, 790).shape).toBe("wide"); // ratio 1.27, just over
    expect(WIDE_RATIO).toBeGreaterThan(1);
  });

  it("actually makes a landscape phone bigger — the point of the wide layout", () => {
    // This is the assertion that would have failed before the seat boxes were
    // laid out horizontally: against the TALL budget a landscape phone cannot
    // even fit the old design, so no multiplier could have grown it.
    const wide = tableScale(PHONE_WIDE.w, PHONE_WIDE.h);
    expect(wide.shape).toBe("wide");
    expect(wide.scale).toBeGreaterThan(1.25);

    // The control: the same felt judged against the TALL budget (319) would be
    // under 1 — clamped to the floor, no bigger at all. The layout bought this,
    // not the multiplier.
    expect(feltBox(PHONE_WIDE.w, PHONE_WIDE.h, "wide").h / 319).toBeLessThan(1);
  });

  it("grows with the screen, in order", () => {
    const s = (b: { w: number; h: number }) => tableScale(b.w, b.h).scale;
    expect(s(PHONE_TALL)).toBeLessThan(s(TABLET));
    expect(s(TABLET)).toBeLessThanOrEqual(s(DESKTOP));
    // And a desktop is genuinely large, not a rounding win over a phone.
    expect(s(DESKTOP)).toBeGreaterThan(s(PHONE_TALL) * 1.5);
  });

  it("is bounded by whichever dimension is short", () => {
    // A very wide, very short strip must be limited by its height, not fed by
    // its width — otherwise the cards grow taller than the felt.
    expect(tableScale(3000, 200).scale).toBeLessThan(1.6);
  });
});

group("seatRadius", () => {
  it("spreads seats sideways when the felt is wide", () => {
    const wide = seatRadius("wide");
    const tall = seatRadius("tall");
    expect(wide.rx).toBeGreaterThan(wide.ry);
    expect(tall.rx).toBe(tall.ry);
    // Wide must reach further across than tall does, or the extra width the
    // side rail freed up goes unused.
    expect(wide.rx).toBeGreaterThan(tall.rx);

    // And it must NOT pull the seats IN vertically, which is what this
    // assertion originally demanded. The reasoning sounded right — the height
    // is the short dimension, so use less of it — and a render settled it the
    // other way: at ry 30 the top seat's committed-chips pill sat on top of
    // the pot. Seats have to be pushed to the RIM to leave the middle free for
    // the board, in both dimensions. The old assertion is kept here inverted
    // rather than deleted, because the plausible-and-wrong version is the one
    // someone will reach for again.
    expect(wide.ry).toBeGreaterThanOrEqual(tall.ry);

    // Both radii stay inside the felt: a seat centred past ~45% hangs its box
    // over the rail and off the cloth.
    for (const r of [wide, tall]) {
      expect(r.rx).toBeLessThanOrEqual(45);
      expect(r.ry).toBeLessThanOrEqual(45);
    }
  });
});

group("the rail cannot make the shape oscillate", () => {
  it("decides shape from the wrapper, which the rail does not change", () => {
    // The loop this prevents: rail appears -> felt narrows -> ratio drops below
    // WIDE_RATIO -> shape flips to tall -> rail disappears -> felt widens ->
    // wide again, forever, mid-hand.
    //
    // Proof that the danger is real rather than theoretical: take a wrapper
    // that is wide, and check that its FELT alone would have been judged tall.
    // If shape were derived from the felt, this box would oscillate.
    const w = 560;
    const h = 420;
    expect(tableScale(w, h).shape).toBe("wide"); // wrapper ratio 1.33

    const felt = feltBox(w, h, "wide");
    expect(felt.w / felt.h).toBeLessThan(WIDE_RATIO); // felt ratio 1.18 — tall!

    // And the same call is stable: the answer does not depend on what the
    // previous answer was, because nothing about the rail feeds back into it.
    expect(tableScale(w, h)).toEqual(tableScale(w, h));
  });

  it("charges the rail its real width, and only when it is shown", () => {
    expect(feltBox(1000, 400, "wide").w).toBeCloseTo((1000 - RAIL_W) * 0.92, 5);
    expect(feltBox(1000, 400, "tall").w).toBeCloseTo(1000 * 0.92, 5);
    expect(RAIL_W).toBeGreaterThanOrEqual(96); // a 44px tap target plus padding
  });
});
