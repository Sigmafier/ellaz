import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// SHIPPED_LOCALES, not LOCALES. A shop item's name is AUTHORED text, so it has
// the two languages somebody wrote it in - not the eleven the interface
// speaks. Iterating the app list here would demand a Turkish name for every
// rug, which is the payload mistake this whole split exists to avoid.
import { SHIPPED_LOCALES } from "@i18n/locales";
import {
  ALL_ITEMS,
  CATEGORIES,
  STREAK_ITEMS,
  artFor,
  defaultFor,
  isUnlocked,
  itemById,
} from "./items";
import { milestoneFor } from "@sdk/daily";

// The catalogue is persisted data: an id here ends up in a player's
// localStorage and can never change. These are the invariants the room and the
// shop both assume, checked over the whole table rather than a sample.

describe("catalogue integrity", () => {
  it("has no duplicate ids", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every category exactly one free default", () => {
    for (const category of CATEGORIES) {
      const free = ALL_ITEMS.filter((i) => i.category === category && i.price === 0);
      expect(free, `category "${category}" free defaults`).toHaveLength(1);
    }
  });

  it("represents every category in the union", () => {
    for (const category of CATEGORIES) {
      expect(
        ALL_ITEMS.some((i) => i.category === category),
        `category "${category}" has no items`,
      ).toBe(true);
    }
  });

  it("uses only declared categories", () => {
    const known = new Set<string>(CATEGORIES);
    for (const item of ALL_ITEMS) {
      expect(known.has(item.category), `${item.id} category`).toBe(true);
    }
  });

  it("names every item in both locales", () => {
    for (const item of ALL_ITEMS) {
      for (const locale of SHIPPED_LOCALES) {
        expect(item.name[locale], `${item.id}.name.${locale}`).toBeTruthy();
        expect(item.name[locale].trim().length, `${item.id}.name.${locale}`).toBeGreaterThan(0);
      }
    }
  });

  it("prices every item at a non-negative whole number", () => {
    for (const item of ALL_ITEMS) {
      expect(Number.isInteger(item.price), `${item.id} price integer`).toBe(true);
      expect(item.price, `${item.id} price`).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps requiresStars non-negative when present", () => {
    for (const item of ALL_ITEMS) {
      if (item.requiresStars === undefined) continue;
      expect(Number.isInteger(item.requiresStars), `${item.id} requiresStars integer`).toBe(true);
      expect(item.requiresStars, `${item.id} requiresStars`).toBeGreaterThanOrEqual(0);
    }
  });

  it("never star-locks a free default — the room must be reachable from zero", () => {
    for (const item of ALL_ITEMS) {
      if (item.price === 0) expect(item.requiresStars, `${item.id}`).toBeUndefined();
    }
  });

  it("gives every item a non-empty art key", () => {
    for (const item of ALL_ITEMS) {
      expect(item.art.length, `${item.id} art`).toBeGreaterThan(0);
    }
  });
});

describe("lookup helpers", () => {
  it("finds an item by id and misses cleanly", () => {
    expect(itemById("hat_crown")?.category).toBe("hat");
    expect(itemById("nope_not_a_thing")).toBeUndefined();
  });

  it("returns a free item of the right category from defaultFor", () => {
    for (const category of CATEGORIES) {
      const item = defaultFor(category);
      expect(item.category).toBe(category);
      expect(item.price).toBe(0);
    }
  });

  it("draws the equipped item when it belongs to the slot", () => {
    expect(artFor("hat", "hat_crown")).toBe("hat_crown");
  });

  it("falls back to the default for empty, unknown, and cross-slot ids", () => {
    for (const category of CATEGORIES) {
      const fallback = defaultFor(category).art;
      expect(artFor(category, undefined)).toBe(fallback);
      expect(artFor(category, "")).toBe(fallback);
      expect(artFor(category, "retired_in_a_later_release")).toBe(fallback);
      // A hat id in the rug slot is a corrupt profile, not a rug.
      if (category !== "hat") expect(artFor(category, "hat_crown")).toBe(fallback);
    }
  });
});

describe("the streak shelf", () => {
  const streak = ALL_ITEMS.filter((i) => i.requiresStreak !== undefined);

  it("exists — there is something only a streak opens", () => {
    expect(streak.length).toBeGreaterThan(0);
    expect(streak.map((i) => i.id)).toEqual(STREAK_ITEMS.map((i) => i.id));
  });

  it("keys on rungs of the ladder daily.ts actually pays at", () => {
    // Two lists, on purpose — one answers "when does a streak pay", the other
    // "what does it open" — so this is what keeps them agreeing. A shelf gated
    // on day 5 would open on a day nothing happens.
    for (const item of streak) {
      const days = item.requiresStreak as number;
      expect(milestoneFor(days), `${item.id} @ ${days} days`).toBe(days);
    }
  });

  it("is PRICED, never given — a streak buys access, not currency", () => {
    // The shop is the only coin sink in this app. A shelf deepens the bucket;
    // handing the items over would fill it.
    for (const item of streak) expect(item.price, `${item.id} price`).toBeGreaterThan(0);
  });

  it("carries whole, non-negative day counts", () => {
    for (const item of ALL_ITEMS) {
      if (item.requiresStreak === undefined) continue;
      expect(Number.isInteger(item.requiresStreak), `${item.id}`).toBe(true);
      expect(item.requiresStreak, `${item.id}`).toBeGreaterThan(0);
    }
  });

  it("never streak-locks a free default — the room must be reachable from zero", () => {
    for (const item of ALL_ITEMS) {
      if (item.price === 0) expect(item.requiresStreak, `${item.id}`).toBeUndefined();
    }
  });

  it("leaves every category exactly one free default, shelf included", () => {
    // The shelf adds to existing categories, so this is the invariant it could
    // most easily have broken.
    for (const category of CATEGORIES) {
      expect(ALL_ITEMS.filter((i) => i.category === category && i.price === 0)).toHaveLength(1);
    }
  });

  it("keeps every id unique across both halves of the catalogue", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isUnlocked — one answer, so no two screens disagree", () => {
  const none = { stars: 0, longestStreak: 0 };

  it("never locks a free default", () => {
    for (const category of CATEGORIES) expect(isUnlocked(defaultFor(category), none)).toBe(true);
  });

  it("opens an ordinary priced item to anyone — coins are the only bar", () => {
    expect(isUnlocked({ price: 25 }, none)).toBe(true);
  });

  it("holds a star-gated item until the stars are there", () => {
    expect(isUnlocked({ price: 70, requiresStars: 10 }, none)).toBe(false);
    expect(isUnlocked({ price: 70, requiresStars: 10 }, { stars: 9, longestStreak: 99 })).toBe(
      false,
    );
    expect(isUnlocked({ price: 70, requiresStars: 10 }, { stars: 10, longestStreak: 0 })).toBe(
      true,
    );
  });

  it("holds a streak-gated item until the streak has been run", () => {
    const item = { price: 45, requiresStreak: 7 };
    expect(isUnlocked(item, none)).toBe(false);
    expect(isUnlocked(item, { stars: 999, longestStreak: 6 })).toBe(false);
    expect(isUnlocked(item, { stars: 0, longestStreak: 7 })).toBe(true);
  });

  it("reads LONGEST, so a broken streak takes nothing away", () => {
    // The gate is handed `longest`, which nothing in daily.ts can reduce. This
    // is the whole no-punishment guarantee, expressed as a caller contract:
    // there is no argument here a lapse could change.
    const item = { price: 90, requiresStreak: 14 };
    const reached = { stars: 0, longestStreak: 20 };
    expect(isUnlocked(item, reached)).toBe(true);
    // Same player, a week later, having missed a day: `longest` is unchanged.
    expect(isUnlocked(item, reached)).toBe(true);
  });

  it("requires BOTH gates when an item somehow carries both", () => {
    const item = { price: 100, requiresStars: 5, requiresStreak: 7 };
    expect(isUnlocked(item, { stars: 5, longestStreak: 6 })).toBe(false);
    expect(isUnlocked(item, { stars: 4, longestStreak: 7 })).toBe(false);
    expect(isUnlocked(item, { stars: 5, longestStreak: 7 })).toBe(true);
  });
});

describe("the streak shelf draws", () => {
  it("resolves every shelf item to a real drawing", () => {
    // `Scene.tsx` merges ART with STREAK_ART and indexes it by AnyArtId, so a
    // missing drawing is a tsc failure — this is the runtime half: that the
    // item's own art key round-trips through artFor.
    for (const item of STREAK_ITEMS) {
      expect(artFor(item.category, item.id)).toBe(item.art);
    }
  });
});

describe("the shop reads LONGEST, and a type cannot say so", () => {
  // `isUnlocked` takes a plain number. Nothing in the type system stops the
  // World screen handing it `daily.current` instead of `daily.longest`, and the
  // difference is the whole no-punishment promise: gated on the running streak,
  // the shelf would vanish again the first morning a child forgets. It would
  // also look completely correct in every test above, because those pass the
  // number directly.
  //
  // Same shape as the `firstBoard()` guard in `boardsView.test.ts`: a source
  // scan for the one line that has to stay right. Mutation-proven by planting
  // `daily.current`.
  const src = readFileSync(new URL("./World.tsx", import.meta.url), "utf8");

  it("builds the gate's input from the high-water mark", () => {
    expect(src).toMatch(/longestStreak:\s*daily\.longest/);
  });

  it("never reads the RUNNING streak at all", () => {
    const offenders = src
      .split("\n")
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => /\bdaily\.current\b/.test(line) && !line.trimStart().startsWith("//"));
    expect(offenders).toEqual([]);
  });
});
