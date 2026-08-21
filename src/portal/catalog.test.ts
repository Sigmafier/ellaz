import { describe, it, expect } from "vitest";
import { SHIPPED_LOCALES } from "@i18n/locales";
import { CATEGORY_ORDER, ensureFullCatalog, entryFor, findEntry } from "./catalog";
import { FULL_CATALOG } from "../testing/fullCatalog";
const CATALOG = FULL_CATALOG;
// The two static dictionaries, read directly. They used to be reached through a
// `STRINGS` Proxy on the old key-first table, which was kept alive purely for
// this test and shipped its whole implementation to every child on first load.
import { he } from "@i18n/dict/he";
import { en } from "@i18n/dict/en";

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
      // Every SHIPPED language, derived. Written out as `.he` and `.en` this
      // asserted nothing about Spanish for the whole time Spanish existed, and
      // a game shipping with a missing title renders a blank card.
      for (const l of SHIPPED_LOCALES) expect(meta.title[l], `${meta.id} has no ${l} title`).toBeTruthy();
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

  it("findEntry round-trips every id and rejects unknown", async () => {
    // The shell carries metadata for the games above the fold only, so before
    // the rest land `findEntry` answers undefined for most of the roster - which
    // is why anything that must MOUNT a game uses `entryFor` instead. Pinned in
    // both directions rather than awaited away: the pre-merge state is the one
    // that used to render "we couldn't find that game" on a game that works.
    const early = FULL_CATALOG.filter((e) => findEntry(e.meta.id) === undefined);
    expect(early.length, "nothing is lazy - the split has been undone").toBeGreaterThan(0);

    await ensureFullCatalog();
    for (const e of FULL_CATALOG) {
      // By id, not by identity: `FULL_CATALOG` pairs the roster fresh for the
      // build-time emitter, so its entries are equal to the catalogue's and are
      // deliberately not the same objects.
      expect(findEntry(e.meta.id)?.meta.id, e.meta.id).toBe(e.meta.id);
      expect(typeof findEntry(e.meta.id)?.load).toBe("function");
    }
    expect(findEntry("nope")).toBeUndefined();
    expect(await entryFor("nope")).toBeUndefined();
  });

  it("keeps at least the games we shipped (ratchet)", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(21);
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
      expect(he[key as keyof typeof he]).toBeTruthy();
      expect(en[key as keyof typeof he]).toBeTruthy();
    }
  });
});
