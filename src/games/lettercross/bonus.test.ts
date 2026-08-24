import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BONUS_ARTS, HARD_Q, MEDIUM_Q, tierOf, type BonusTier } from "./bonus";
import { BOXES, isLocked } from "./boxes";

const SRC = readFileSync(new URL("./Lettercross.tsx", import.meta.url), "utf8");
const ROUND = readFileSync(new URL("./BonusRound.tsx", import.meta.url), "utf8");

describe("the scorer", () => {
  it("is the only thing that names a tier", () => {
    expect(tierOf(0)).toBe<BonusTier>("easy");
    expect(tierOf(MEDIUM_Q)).toBe<BonusTier>("medium");
    expect(tierOf(HARD_Q)).toBe<BonusTier>("hard");
    expect(tierOf(1)).toBe<BonusTier>("hard");
  });

  it("has NO miss - the worst a round pays is the smallest tier", () => {
    // The platform law: losing gives nothing and never takes anything away.
    // A bonus that can pay zero is a trap wearing a prize's clothes.
    for (const q of [-5, -0.001, 0, 0.0001]) expect(tierOf(q)).toBe<BonusTier>("easy");
  });

  it("clamps rather than trusting its caller", () => {
    expect(tierOf(99)).toBe<BonusTier>("hard");
    expect(tierOf(Number.NaN)).toBe<BonusTier>("easy");
  });

  it("rises - a better round is never worth less", () => {
    const rank = { easy: 0, medium: 1, hard: 2 };
    let last = -1;
    for (let q = 0; q <= 1.0001; q += 0.01) {
      const r = rank[tierOf(q)];
      expect(r, `tier fell at q=${q.toFixed(2)}`).toBeGreaterThanOrEqual(last);
      last = r;
    }
    expect(last, "never reached hard - the sweep is blind").toBe(2);
  });
});

describe("every prize box has a round", () => {
  it("covers every art on the board except the padlock", () => {
    const arts = new Set(BOXES.filter((b) => !isLocked(b)).map((b) => b.art));
    expect(arts.size, "read no prize arts at all - the filter is blind").toBeGreaterThan(0);
    for (const a of arts)
      expect(BONUS_ARTS, `${a} is on the board with no round`).toContain(a);
  });

  it("gives the padlock none - that is step 4", () => {
    expect(BONUS_ARTS).not.toContain("lock" as never);
  });
});

describe("the round is a WORD round, not an arcade one", () => {
  // The five arcade games here were built from a summary of BONUS and were the
  // wrong genre - its own BON.EXE carries five word-game instruction strings
  // and no reflex test at all. This pins the correction so a later revert of
  // `bonusBoard.ts` cannot quietly restore them.
  it("draws a board off the shared dictionary, not a sweep or a cup", () => {
    expect(ROUND).toMatch(/from "\.\/bonusBoard"/);
    expect(ROUND).toMatch(/scoreMini/);
  });

  it("keeps no reflex round behind", () => {
    for (const gone of ["sweepAt", "gemSwaps", "starOrder", "leafCount", "fillAt"])
      expect(ROUND, `${gone} is still drawn`).not.toContain(gone);
  });

  it("waits for a START before the clock runs", () => {
    // BONUS: "להתחלת המשימה הקש על התחל" - a round that starts itself is
    // asking a player to read the rules against their own timer.
    expect(ROUND).toMatch(/phase === "ready"/);
    expect(ROUND).toMatch(/onClick=\{start\}/);
  });

  it("derives the clock from wall-clock time, never from a frame count", () => {
    // .claude/rules/fixed-timestep-must-match-display.md - a per-frame
    // accumulator runs a 120Hz display's clock at twice the speed.
    expect(ROUND).toMatch(/performance\.now\(\) - t0/);
    expect(ROUND).not.toMatch(/\+\+\s*frames|frames\s*\+\+/);
  });

  it("decides no tier of its own - only tierOf does", () => {
    expect(ROUND.match(/tierOf\(/g)?.length ?? 0).toBe(1);
    for (const t of ['"hard"', '"medium"']) expect(ROUND).not.toContain(t);
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
    expect(SRC).toMatch(/version: 6,/);
  });

});
