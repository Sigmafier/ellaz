import { describe, it, expect } from "vitest";
import { CATALOG, findEntry } from "./catalog";

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
    expect(CATALOG.length).toBeGreaterThanOrEqual(10);
  });
});
