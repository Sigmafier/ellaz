import { describe, it, expect } from "vitest";
import { LOCALES } from "@i18n/index";
import { ALL_ITEMS, CATEGORIES, defaultFor, artFor, itemById } from "./items";

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
      for (const locale of LOCALES) {
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
