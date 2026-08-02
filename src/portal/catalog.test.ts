import { describe, it, expect } from "vitest";
import { CATALOG, CATEGORY_ORDER, findEntry } from "./catalog";
import { STRINGS } from "@i18n/index";

// Property-based on purpose: assertions describe what EVERY entry must satisfy,
// so adding a game passes without touching this file. The count is a ratchet
// (>=), not an equality, so a game can be added but not silently lost.
const AGE_BANDS = ["kids", "all"];
const CATEGORIES = ["kids", "learn", "think", "speed", "create", "classics"];
const ORIENTATIONS = ["portrait", "landscape", "any"];
const RENDERERS = ["dom", "phaser"];

describe("catalog", () => {
  it("every entry is well-formed", () => {
    for (const e of CATALOG) {
      const { meta } = e;
      expect(meta.id).toMatch(/^[a-z0-9-]+$/);
      expect(meta.title.he).toBeTruthy();
      expect(meta.title.en).toBeTruthy();
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(RENDERERS).toContain(meta.renderer);
      expect(CATEGORIES).toContain(meta.category);
      expect(AGE_BANDS).toContain(meta.ageBand);
      expect(ORIENTATIONS).toContain(meta.orientation);
      expect(typeof e.load).toBe("function");
    }
  });

  it("has unique game ids", () => {
    const ids = CATALOG.map((e) => e.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findEntry round-trips every id and rejects unknown", () => {
    for (const e of CATALOG) {
      expect(findEntry(e.meta.id)).toBe(e);
    }
    expect(findEntry("nope")).toBeUndefined();
  });

  it("keeps at least the games we shipped (ratchet)", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(19);
  });

  // Every category a game claims must have a heading to render under, or the
  // game silently never appears: Home.tsx only renders sections listed in
  // CATEGORY_ORDER, and skips the ones with no games. A game in an unlisted
  // category is therefore invisible with no error anywhere.
  it("every category in use has a home-grid section and a title in both locales", () => {
    const rendered = new Set(CATEGORY_ORDER.map((c) => c.category));
    for (const e of CATALOG) {
      expect(rendered.has(e.meta.category)).toBe(true);
      const key = CATEGORY_ORDER.find((c) => c.category === e.meta.category)!.titleKey;
      expect(STRINGS[key]?.he).toBeTruthy();
      expect(STRINGS[key]?.en).toBeTruthy();
    }
  });
});
