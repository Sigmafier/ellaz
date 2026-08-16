import { describe, it, expect } from "vitest";
import { SHIPPED_LOCALES } from "@i18n/locales";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "./rng";
import { TIER_COINS, coinsFor, starsFor } from "@sdk/economy";
import type { RewardTier } from "@sdk/economy";
import { renderName } from "@sdk/names";
import {
  SEAT_COLORS,
  SEAT_TINT_PERCENT,
  VERSUS_REASON,
  VERSUS_WORDS,
  finish,
  leader,
  newVersus,
  nextMatch,
  other,
  pass,
  take,
  seatTint,
  versusWinOptions,
  versusWords,
  type Seat,
  type VersusState,
} from "./versus";
import { contrastRatio } from "@ui/ink";

const TIERS: RewardTier[] = ["easy", "medium", "hard"];

/** A deterministic match, so nothing here depends on the draw. */
function seeded(seed = 7): VersusState {
  return newVersus(mulberry32(seed));
}

describe("the two players", () => {
  it("are drawn from the name pool, so nobody types anything", () => {
    const v = seeded();
    for (const p of v.players) {
      expect(typeof p.name.adj).toBe("string");
      expect(typeof p.name.noun).toBe("string");
      // A drawn name renders in every authored language.
      expect(renderName(p.name, "he")).toBeTruthy();
      expect(renderName(p.name, "en")).toBeTruthy();
    }
  });

  it("are never the same name, at any seed", () => {
    for (let seed = 0; seed < 300; seed++) {
      const [a, b] = newVersus(mulberry32(seed)).players;
      expect(`${a.name.adj}/${a.name.noun}`).not.toBe(`${b.name.adj}/${b.name.noun}`);
    }
  });

  it("wear two different colours, because colour is how a pre-reader tells them apart", () => {
    expect(SEAT_COLORS[0]).not.toBe(SEAT_COLORS[1]);
    const v = seeded();
    expect(v.players[0].color).toBe(SEAT_COLORS[0]);
    expect(v.players[1].color).toBe(SEAT_COLORS[1]);
  });

  it("opens on seat 0 with an empty match and an empty sitting", () => {
    const v = seeded();
    expect(v.turn).toBe(0);
    expect(v.starts).toBe(0);
    expect(v.taken).toEqual([0, 0]);
    expect(v.wins).toEqual([0, 0]);
    expect(v.draws).toBe(0);
    expect(v.matches).toBe(0);
  });
});

describe("taking turns", () => {
  it("other() is the seat that is not this one", () => {
    expect(other(0)).toBe(1);
    expect(other(1)).toBe(0);
  });

  it("pass() hands the turn over and touches nothing else", () => {
    const v = seeded();
    const p = pass(v);
    expect(p.turn).toBe(1);
    expect(pass(p).turn).toBe(0);
    expect({ ...p, turn: v.turn }).toEqual(v);
  });

  it("take() credits only the seat named", () => {
    const v = take(take(seeded(), 0), 0, 2);
    expect(v.taken).toEqual([3, 0]);
    expect(take(v, 1).taken).toEqual([3, 1]);
  });

  it("never mutates the state it was handed", () => {
    const v = seeded();
    const snapshot = JSON.stringify(v);
    pass(v);
    take(v, 1, 4);
    finish(v, 1);
    nextMatch(v);
    expect(JSON.stringify(v)).toBe(snapshot);
  });
});

describe("who is ahead", () => {
  it("is the bigger pile", () => {
    let v = seeded();
    expect(leader(v)).toBe("draw");
    v = take(v, 1, 3);
    expect(leader(v)).toBe(1);
    v = take(v, 0, 4);
    expect(leader(v)).toBe(0);
  });

  it("is a draw when the piles are equal, including at zero", () => {
    const v = take(take(seeded(), 0, 5), 1, 5);
    expect(leader(v)).toBe("draw");
  });
});

describe("finishing a match", () => {
  it("records the win and counts the match", () => {
    const v = finish(seeded(), 1);
    expect(v.wins).toEqual([0, 1]);
    expect(v.draws).toBe(0);
    expect(v.matches).toBe(1);
  });

  it("gives the NEXT first move to whoever just lost", () => {
    // The whole consolation, and it needs no words: you lost, so you go first.
    const v = finish(seeded(), 0);
    expect(v.starts).toBe(1);
    expect(nextMatch(v).turn).toBe(1);
  });

  it("alternates the first move on a draw, so it cannot stick to one seat", () => {
    let v = finish(seeded(), "draw");
    expect(v.draws).toBe(1);
    expect(v.wins).toEqual([0, 0]);
    expect(v.starts).toBe(1);
    v = nextMatch(v);
    expect(v.turn).toBe(1);
    v = finish(v, "draw");
    expect(v.starts).toBe(0);
  });

  it("keeps the final piles on screen until the next match is dealt", () => {
    const v = finish(take(seeded(), 0, 6), 0);
    expect(v.taken).toEqual([6, 0]);
    expect(nextMatch(v).taken).toEqual([0, 0]);
  });

  it("carries the sitting's tally into the next match", () => {
    const v = nextMatch(finish(finish(seeded(), 0), 1));
    expect(v.wins).toEqual([1, 1]);
    expect(v.matches).toBe(2);
  });
});

describe("the payout — and why this mode cannot be farmed", () => {
  it("pays one flat coin for finishing a match, whatever tier is asked for", () => {
    for (const tier of TIERS) {
      expect(coinsFor({ reason: VERSUS_REASON, tier })).toBe(1);
    }
    expect(coinsFor({ reason: VERSUS_REASON })).toBe(1);
  });

  it("pays STRICTLY LESS than the weakest solo win, at every tier", () => {
    // The guard, and the reason it is a guard rather than a preference: two
    // players share ONE profile, so a child can tap both sides and end a match
    // in a handful of taps. This assertion says the fastest versus loop can
    // never out-earn the solo path that already exists — so there is nothing to
    // gain by farming it. Route the reason through the tier table instead and a
    // "hard" versus match pays 8 against easy solo's 3, and this goes red.
    const weakestSolo = Math.min(...Object.values(TIER_COINS));
    for (const tier of TIERS) {
      expect(coinsFor({ reason: VERSUS_REASON, tier })).toBeLessThan(weakestSolo);
    }
  });

  it("pays no star, so a shared trophy count cannot be farmed either", () => {
    // Stars gate the premium shop items and drive the profile's win count.
    // Beating a sibling is not a solo achievement and must not mint one.
    for (const tier of TIERS) {
      expect(starsFor({ reason: VERSUS_REASON, tier })).toBe(0);
    }
  });

  it("reports NO score and NO tier, so no personal best can come out of a match", () => {
    // `ctx.score` is a fact about the PROFILE. A versus result is a fact about
    // two people, one of whom is not the profile — and a best is published to a
    // real leaderboard, so a farmed one would travel. Adding `score` here is the
    // one change that would make that possible, and it goes red.
    const o = versusWinOptions({ x: 1, y: 2 });
    expect(o.reason).toBe(VERSUS_REASON);
    expect(o).not.toHaveProperty("score");
    expect(o).not.toHaveProperty("tier");
    expect(o.at).toEqual({ x: 1, y: 2 });
  });
});

describe("the active seat's card stays readable", () => {
  // Read the THEMES rather than hardcoding four hexes, so this cannot quietly
  // go stale the day a theme is retuned — the whole point of the gate is that
  // it re-measures whatever is actually shipping.
  const css = readFileSync(
    fileURLToPath(new URL("../ui/tokens.css", import.meta.url)),
    "utf8",
  );
  const blocks = [...css.matchAll(/:root([^{]*)\{([^}]*)\}/g)].map((m) => ({
    name: m[1].trim() || ":root",
    decl: m[2],
  }));
  const tokenIn = (decl: string, name: string) =>
    new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`).exec(decl)?.[1];

  /** `color-mix(in srgb, a P%, b)` — plain per-channel lerp of the sRGB bytes. */
  function mix(a: string, b: string, percent: number): string {
    const bytes = (h: string) =>
      [0, 1, 2].map((i) => parseInt(h.replace("#", "").slice(i * 2, i * 2 + 2), 16));
    const [A, B] = [bytes(a), bytes(b)];
    const p = percent / 100;
    return `#${A.map((v, i) => Math.round(v * p + B[i] * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
  }

  const themed = blocks
    .map((b) => ({
      name: b.name,
      surface: tokenIn(b.decl, "--surface"),
      text: tokenIn(b.decl, "--text"),
      seats: [tokenIn(b.decl, "--brand-2"), tokenIn(b.decl, "--teal")],
    }))
    .filter((t) => t.surface && t.text && t.seats.every(Boolean));

  it("finds the themes to measure — a vacuous pass is not a pass", () => {
    expect(themed.length).toBeGreaterThanOrEqual(2);
  });

  it("clears WCAG AA on every seat in every theme", () => {
    const worst: string[] = [];
    for (const t of themed) {
      for (const seat of t.seats) {
        const bg = mix(seat!, t.surface!, SEAT_TINT_PERCENT);
        const ratio = contrastRatio(bg, t.text!);
        if (ratio < 4.5) worst.push(`${t.name} ${seat} -> ${bg} = ${ratio.toFixed(2)}:1`);
      }
    }
    expect(worst).toEqual([]);
  });

  it("fires if the tint is turned up past what was measured", () => {
    // The control. At 100% the card IS the raw accent, which is the arrangement
    // that needed a hardcoded ink and failed the token gate — so this proves the
    // check above can actually go red rather than passing on everything.
    const failures = themed.flatMap((t) =>
      t.seats.filter((seat) => contrastRatio(mix(seat!, t.surface!, 100), t.text!) < 4.5),
    );
    expect(failures.length).toBeGreaterThan(0);
  });

  it("builds a color-mix against the surface, not a raw fill", () => {
    expect(seatTint(SEAT_COLORS[0])).toBe(
      `color-mix(in srgb, var(--brand-2) ${SEAT_TINT_PERCENT}%, var(--surface))`,
    );
  });
});

describe("the words", () => {
  it("exist in every authored language", () => {
    for (const locale of SHIPPED_LOCALES) {
      const w = VERSUS_WORDS[locale];
      expect(w.two.length).toBeGreaterThan(0);
      expect(w.one.length).toBeGreaterThan(0);
      expect(w.matches.length).toBeGreaterThan(0);
      expect(w.tie.length).toBeGreaterThan(0);
      expect(w.turnOf("X")).toContain("X");
      expect(w.wonBy("X")).toContain("X");
    }
  });

  it("says something different in each language", () => {
    const twos = SHIPPED_LOCALES.map((l) => VERSUS_WORDS[l].two);
    expect(new Set(twos).size).toBe(twos.length);
  });

  it("falls back to English for a language the app speaks but nobody wrote for", () => {
    // `ctx.locale` is TYPED as a page locale and can be any of the eleven at
    // runtime. Reading the record directly returns undefined, and `.matches` on
    // undefined is a white screen inside a render — so the lookup goes through
    // one function that cannot return undefined.
    expect(versusWords("tr")).toBe(VERSUS_WORDS.en);
    expect(versusWords("he")).toBe(VERSUS_WORDS.he);
  });
});

describe("a whole sitting", () => {
  it("alternates who starts while a child keeps losing, and never takes anything away", () => {
    let v = seeded();
    const seats: Seat[] = [];
    for (let i = 0; i < 5; i++) {
      seats.push(v.turn);
      v = nextMatch(finish(v, 0)); // seat 0 wins every time
    }
    // Seat 1 lost all five, so seat 1 opened four of them.
    expect(seats).toEqual([0, 1, 1, 1, 1]);
    expect(v.wins).toEqual([5, 0]);
    // Nothing is ever subtracted: no negative anywhere, ever.
    expect(v.taken.every((n) => n >= 0)).toBe(true);
    expect(v.wins.every((n) => n >= 0)).toBe(true);
  });
});
