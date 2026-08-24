import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BONUS_ARTS, BONUS_ZONES, CUPS, FILL_TARGET, HARD_HALF, HARD_Q, LEAF_MAX, LEAF_MIN,
  MEDIUM_HALF, MEDIUM_Q, STARS, SWEEP_MS, fillAt, fillQuality, gemAfter, gemQuality,
  gemSwaps, leafCount, leafQuality, starOrder, starQuality, sweepAt, sweepQuality,
  tierAt, tierOf, type BonusTier,
} from "./bonus";
import { BOXES, isLocked } from "./boxes";

const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");
const ROUND = readFileSync(new URL("./BonusRound.tsx", import.meta.url), "utf8");

/** A deterministic rng, so a shuffle can be followed rather than guessed at. */
const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
};

describe("the marker actually moves", () => {
  // The positive control, and it runs first: every assertion below is about
  // WHERE the marker is, and all of them pass on a marker pinned at zero.
  it("visits both ends and the middle", () => {
    const seen = new Set<string>();
    for (let ms = 0; ms <= SWEEP_MS * 2; ms += 10) {
      const p = sweepAt(ms);
      seen.add(p < 0.2 ? "low" : p > 0.8 ? "high" : "mid");
    }
    expect([...seen].sort()).toEqual(["high", "low", "mid"]);
  });
});

describe("one scorer, five games", () => {
  it("tierOf is the bell round's own geometry, so step 3 is unchanged", () => {
    // The refactor gate. `tierAt` used to compare distances directly; it now
    // goes through `tierOf`. If these two ever disagree, the five games were
    // unified by CHANGING what the first one paid, which is not a refactor.
    let checked = 0;
    for (let pos = 0; pos <= 1; pos += 0.001) {
      const d = Math.abs(pos - 0.5);
      const want: BonusTier = d <= HARD_HALF ? "hard" : d <= MEDIUM_HALF ? "medium" : "easy";
      // Skip the float boundary: at d = 0.08 the two sides of the centre
      // straddle HARD_HALF in IEEE754, so no implementation can agree there.
      if (Math.abs(d - HARD_HALF) < 1e-9 || Math.abs(d - MEDIUM_HALF) < 1e-9) continue;
      expect(tierAt(pos), `pos=${pos.toFixed(3)}`).toBe(want);
      checked++;
    }
    expect(checked, "the loop compared nothing").toBeGreaterThan(900);
  });

  it("clamps, so a bad caller cannot fall through", () => {
    expect(tierOf(-5)).toBe("easy");
    expect(tierOf(99)).toBe("hard");
    expect(tierAt(-1)).toBe("easy");
    expect(tierAt(2)).toBe("easy");
  });

  it("has no miss - the worst any round can do is the easy tier", () => {
    const worst = [
      sweepQuality(0), gemQuality(0, 1), starQuality(0), leafQuality(0, 7), fillQuality(1),
    ];
    for (const q of worst) expect(tierOf(q)).toBe("easy");
    expect(Math.min(...worst)).toBe(0);
  });

  it("pays the top tier for a perfect round of each game", () => {
    const best = [
      sweepQuality(0.5), gemQuality(2, 2), starQuality(STARS), leafQuality(4, 4),
      fillQuality(FILL_TARGET),
    ];
    for (const q of best) expect(tierOf(q)).toBe("hard");
    expect(Math.min(...best)).toBe(1);
  });

  it("keeps the thresholds ordered", () => {
    expect(HARD_Q).toBeGreaterThan(MEDIUM_Q);
    expect(MEDIUM_Q).toBeGreaterThan(0);
  });
});

describe("bell - stop", () => {
  it("reads the same on a 60Hz and a 120Hz display", () => {
    // The whole reason `sweepAt` takes elapsed ms. A per-frame accumulator runs
    // at the display's speed, so the same tap would be a different game.
    for (let f = 0; f < 78; f++) {
      const at60 = sweepAt(f * (1000 / 60));
      const at120 = sweepAt(Math.round(f * 2) * (1000 / 120));
      expect(at120).toBeCloseTo(at60, 3);
    }
  });

  it("comes back, rather than sticking at the far edge", () => {
    // Found by a mutation that SURVIVED: `2 - t` written as `1` sweeps out and
    // freezes against the right-hand wall. Every other assertion in this file
    // passes on it, because the outbound leg is byte-identical - the round is
    // simply unplayable after the first 1.3 seconds.
    expect(sweepAt(SWEEP_MS * 1.5)).toBeCloseTo(0.5, 6);
    expect(sweepAt(SWEEP_MS * 1.9)).toBeCloseTo(0.1, 6);
    expect(sweepAt(SWEEP_MS * 2)).toBeCloseTo(0, 6);
    expect(sweepAt(SWEEP_MS * 2.5)).toBeCloseTo(0.5, 6);
  });

  it("draws the zones it scores", () => {
    for (const z of BONUS_ZONES) {
      const mid = (z.from + z.to) / 2;
      expect(tierAt(mid), `${z.tier} zone at ${mid}`).toBe(z.tier);
    }
  });

  it("draws a band with no holes and no overlap", () => {
    expect(BONUS_ZONES[0].from).toBe(0);
    expect(BONUS_ZONES[BONUS_ZONES.length - 1].to).toBe(1);
    for (let i = 1; i < BONUS_ZONES.length; i++) {
      expect(BONUS_ZONES[i].from).toBeCloseTo(BONUS_ZONES[i - 1].to, 12);
    }
  });
});

describe("gem - remember", () => {
  it("never swaps the same pair twice running", () => {
    // A-B then A-B again is a no-op that LOOKS like two moves, so a player who
    // tracked it correctly is told they were wrong. That is a lie, not a level.
    for (let seed = 1; seed < 60; seed++) {
      const sw = gemSwaps(seeded(seed), 6);
      for (let i = 1; i < sw.length; i++) {
        const a = [...sw[i]].sort().join("-");
        const b = [...sw[i - 1]].sort().join("-");
        expect(a, `seed ${seed} step ${i}`).not.toBe(b);
      }
    }
  });

  it("never swaps a cup with itself", () => {
    for (let seed = 1; seed < 40; seed++)
      for (const [a, b] of gemSwaps(seeded(seed), 8)) {
        expect(a).not.toBe(b);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(CUPS);
      }
  });

  it("follows the gem through the swaps", () => {
    expect(gemAfter(0, [[0, 1]])).toBe(1);
    expect(gemAfter(0, [[1, 2]])).toBe(0);
    expect(gemAfter(0, [[0, 1], [1, 2]])).toBe(2);
    expect(gemAfter(2, [[0, 1], [1, 2], [0, 1]])).toBe(0);
  });

  it("keeps the gem on the table wherever it starts", () => {
    for (let seed = 1; seed < 40; seed++) {
      const sw = gemSwaps(seeded(seed), 5);
      for (let from = 0; from < CUPS; from++) {
        const at = gemAfter(from, sw);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThan(CUPS);
      }
    }
  });

  it("has no near miss - three cups are right or wrong", () => {
    expect(gemQuality(1, 1)).toBe(1);
    expect(gemQuality(0, 1)).toBe(0);
    expect(tierOf(gemQuality(0, 1))).toBe("easy");
  });
});

describe("star - speed", () => {
  it("never lights the same star twice running", () => {
    // A repeat is a free hit, and a game that scores free hits stops measuring.
    for (let seed = 1; seed < 60; seed++) {
      const o = starOrder(seeded(seed), 12);
      for (let i = 1; i < o.length; i++) expect(o[i], `seed ${seed}`).not.toBe(o[i - 1]);
    }
  });

  it("only ever names a real star", () => {
    for (let seed = 1; seed < 40; seed++)
      for (const k of starOrder(seeded(seed), 12)) {
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(STARS);
      }
  });

  it("scores the hit rate, and three of five is the middle tier", () => {
    expect(starQuality(5)).toBe(1);
    expect(starQuality(0)).toBe(0);
    expect(tierOf(starQuality(3))).toBe("medium");
    expect(tierOf(starQuality(1))).toBe("easy");
  });

  it("cannot divide by nothing", () => {
    expect(starQuality(3, 0)).toBe(0);
  });
});

describe("leaf - count", () => {
  it("only asks for a number the answer buttons offer", () => {
    for (let seed = 1; seed < 200; seed++) {
      const n = leafCount(seeded(seed));
      expect(n).toBeGreaterThanOrEqual(LEAF_MIN);
      expect(n).toBeLessThanOrEqual(LEAF_MAX);
    }
  });

  it("uses the whole range", () => {
    // Control: an off-by-one in the generator that never reaches LEAF_MAX
    // passes every bound check above.
    //
    // Driven with the rng's OWN extremes rather than a seed sweep, because a
    // seed sweep here measured the TEST. `seeded`'s first output is bounded
    // below by the LCG's additive constant (~0.236), so leafCount could not
    // return LEAF_MIN however many seeds were tried - a red test over correct
    // code, and the same shape as any probe that cannot express the answer.
    expect(leafCount(() => 0)).toBe(LEAF_MIN);
    expect(leafCount(() => 0.999999)).toBe(LEAF_MAX);
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) seen.add(leafCount(() => i / 100));
    expect(seen.size).toBe(LEAF_MAX - LEAF_MIN + 1);
  });

  it("gives half marks for off by one", () => {
    // Six leaves for 800ms answered "five" is a good look at a hard question.
    expect(leafQuality(5, 5)).toBe(1);
    expect(leafQuality(4, 5)).toBe(0.5);
    expect(leafQuality(6, 5)).toBe(0.5);
    expect(leafQuality(3, 5)).toBe(0);
    expect(tierOf(leafQuality(4, 5))).toBe("medium");
  });
});

describe("drop - hold", () => {
  it("fills on wall-clock time and stops at the brim", () => {
    expect(fillAt(0)).toBe(0);
    expect(fillAt(-500)).toBe(0);
    expect(fillAt(1100, 2200)).toBeCloseTo(0.5, 6);
    expect(fillAt(99999)).toBe(1);
  });

  it("scores a spill as zero, so holding for ever is not the winning play", () => {
    expect(fillQuality(1)).toBe(0);
    expect(fillQuality(1.5)).toBe(0);
    expect(tierOf(fillQuality(1))).toBe("easy");
  });

  it("is best exactly at the line and falls off either side", () => {
    expect(fillQuality(FILL_TARGET)).toBe(1);
    expect(fillQuality(FILL_TARGET - 0.05)).toBeLessThan(1);
    expect(fillQuality(FILL_TARGET + 0.05)).toBeLessThan(1);
    expect(fillQuality(0)).toBe(0);
  });

  it("does not make 'let go straight away' a good answer", () => {
    expect(tierOf(fillQuality(0))).toBe("easy");
    expect(tierOf(fillQuality(0.1))).toBe("easy");
  });
});

describe("every prize box has a round", () => {
  it("covers every art on the board except the padlock", () => {
    // The step-5 completeness gate. A sixth art added later fails here rather
    // than shipping a box that opens nothing and looks like it worked.
    const prize = new Set(BOXES.filter((b) => !isLocked(b)).map((b) => b.art));
    expect(prize.size, "found no prize arts - the matcher is blind").toBeGreaterThan(0);
    for (const art of prize) expect(BONUS_ARTS, `${art} has no round`).toContain(art);
  });

  it("gives the padlock none - that is step 4", () => {
    expect(BONUS_ARTS).not.toContain("lock");
  });

  it("draws every one of them", () => {
    for (const art of BONUS_ARTS)
      expect(ROUND, `${art} has no branch in BonusRound`).toContain(`art === "${art}"`);
  });
});

describe("the renderer holds still", () => {
  it("derives the marker from wall-clock time, never from a frame count", () => {
    expect(ROUND).toMatch(/sweepAt\(now - t0\)/);
    expect(ROUND).not.toMatch(/pos \+= |setPos\(\(p\) =>/);
  });

  it("derives the jar from wall-clock time too", () => {
    expect(ROUND).toMatch(/fillAt\(performance\.now\(\) - t0\)/);
  });

  it("decides no tier of its own - only tierOf does", () => {
    expect(ROUND).toMatch(/tierOf\(quality\)/);
    expect(ROUND).not.toMatch(/=== "hard" \?|> HARD_Q|>= 0\.84/);
  });

  it("scores one star hit per beat", () => {
    // Without the latch a player taps the lit star five times and scores five
    // of five off one finger that never moved.
    expect(ROUND).toMatch(/tookThisBeat/);
  });
});

describe("the wiring", () => {
  const playBody = () => {
    const from = SRC.indexOf("const play = useCallback(");
    const to = SRC.indexOf("\n  }, [", from);
    if (from < 0 || to < 0) return "";
    return SRC.slice(from, to).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  };

  it("can read the play handler at all", () => {
    expect(playBody().length, "the matcher is blind").toBeGreaterThan(400);
  });

  it("queues a round for every opened box that has one", () => {
    expect(playBody()).toMatch(/BONUS_ARTS[\s\S]{0,80}includes\(BOXES\[n\]\.art\)/);
    expect(playBody()).toMatch(/setRounds\(\(q\) => \[\.\.\.q, \.\.\.queued\]\)/);
  });

  it("marks a box reached when it ARRIVES, not when its round resolves", () => {
    // Otherwise a player who walks out mid-round comes back and re-opens it.
    expect(playBody()).toMatch(/setReached\(\(r\) => \[\.\.\.r, \.\.\.arrived\]\)/);
  });

  it("pays the head of the queue and then lets the next one open", () => {
    expect(SRC).toMatch(/const n = rounds\[0\];/);
    expect(SRC).toMatch(/setRounds\(\(q\) => q\.slice\(1\)\)/);
  });

  it("reports a tier and never an amount", () => {
    expect(SRC).toMatch(/reason: "level_complete",\s*\n\s*tier,/);
    expect(SRC).not.toMatch(/coins:\s*\d/);
  });

  it("stops the footer buttons firing behind a round", () => {
    const guards = SRC.match(/disabled=\{pending\.length === 0 \|\| rounds\.length > 0\}/g) ?? [];
    expect(guards.length, "both footer buttons must be guarded").toBe(2);
  });

  it("carries the queue in the snapshot", () => {
    expect(SRC).toMatch(/useGameSession\([\s\S]{0,200}?\brounds\b/);
  });

  it("checks every field the session declares", () => {
    // Pins the real risk rather than the version literal: a field added to the
    // snapshot that `validate` never reads is a field a hand-edited store can
    // set to anything, and it renders a plausible board instead of throwing.
    const decl = SRC.match(/type LettercrossSession = \{([\s\S]*?)\};/);
    expect(decl, "could not find the session type - the matcher is blind").not.toBeNull();
    const fields = [...decl![1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    expect(fields.length, "found no fields at all").toBeGreaterThan(3);
    const at = SRC.indexOf("validate: (value)");
    const gate = SRC.slice(at, SRC.indexOf("\n};", at));
    expect(gate.length, "could not slice validate - the matcher is blind").toBeGreaterThan(200);
    for (const f of fields)
      expect(gate, `the snapshot declares ${f} and validate never reads it`)
        .toMatch(new RegExp(`\\b(s\\.${f}\\b|${f}\\s*=)`));
  });

  it("bumped the snapshot version when the shape changed", () => {
    // `bonus: number | null` became `rounds: readonly number[]`. A stored v4
    // read as a v5 restores a board with no queue and a prize quietly gone.
    expect(SRC).toMatch(/version: 5,/);
  });

  it("gives every round its own hint", () => {
    for (const art of BONUS_ARTS) expect(SRC, `no hint for ${art}`).toMatch(new RegExp(`${art}: "`));
  });
});
