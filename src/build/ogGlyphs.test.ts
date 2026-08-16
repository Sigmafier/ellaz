import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { missingGlyphs } from "./ogImages";
import { SHIPPED_LOCALES } from "../i18n/locales";
import { CONTENT } from "../content/index";
import { SITE } from "../content/site";

/**
 * Every character a share card draws must have a glyph in a bundled font.
 *
 * WHY THIS TEST AND NOT THE BYTE CHECK. `checkOgCard()` in `assert-pages.mjs`
 * asserts only `4096 < bytes < ceiling`. A card is ~21 KB of game art, so one
 * whose entire title bar is empty rectangles clears that floor by a factor of
 * five. Satori does not throw on a missing glyph - it draws a box - so the
 * artifact is a valid PNG of a title nobody can read, and every existing gate
 * is green. Measured before the fonts landed: Arabic rendered at 128 bytes of
 * path per character against 457-703 for Latin. Those were the boxes.
 */
describe("the share-card fonts cover the text the cards draw", () => {
  it("covers every game name in every language that has pages", () => {
    let checked = 0;
    for (const [id, content] of Object.entries(CONTENT)) {
      for (const [locale, copy] of Object.entries(content.copy)) {
        const missing = missingGlyphs(copy.name);
        expect(missing, `${id} (${locale}): "${copy.name}" has no glyph for ${missing.join("")}`)
          .toEqual([]);
        checked++;
      }
    }
    // A loop over an empty CONTENT would pass every assertion above.
    expect(checked).toBeGreaterThan(20);
  });

  it("covers the brand and tagline every card falls back to", () => {
    for (const locale of SHIPPED_LOCALES) {
      expect(missingGlyphs(SITE[locale].brand), `brand ${locale}`).toEqual([]);
      expect(missingGlyphs(SITE[locale].tagline), `tagline ${locale}`).toEqual([]);
    }
  });

  it("covers the scripts of every language the app speaks, not just the three with pages", () => {
    // Pre-positioned deliberately. A language is promoted by writing prose, and
    // the person doing that should not also discover that the rasteriser cannot
    // draw their alphabet - especially since the obvious Arabic font CRASHES
    // satori's parser rather than failing politely.
    const SCRIPTS = {
      latin: "AaZz", hebrew: "אבתש", arabic: "كانسة الألغام",
      cyrillic: "Сапёр", turkish: "ğışİÇÖÜ", portuguese: "ãõçá",
      french: "éèêëàûî", german: "äöüß", italian: "àèéìòù", indonesian: "Penyapu",
    };
    for (const [script, sample] of Object.entries(SCRIPTS)) {
      expect(missingGlyphs(sample), `${script}: no glyph for`).toEqual([]);
    }
  });

  it("REPORTS a character no bundled font has — the control", () => {
    // Without this the three assertions above would pass identically against a
    // checker that always returned []. Devanagari and a CJK ideograph are two
    // scripts nothing here bundles, and both must be named.
    expect(missingGlyphs("हिन्दी")).not.toEqual([]);
    expect(missingGlyphs("日本語")).toContain("日");
    // ...and it reports the character, not merely "something is wrong".
    expect(missingGlyphs("Snake日")).toEqual(["日"]);
  });

  it("does not flag whitespace, which a font need not map", () => {
    expect(missingGlyphs("a b c")).toEqual([]);
  });

  it("agrees with the rasteriser: a covered string draws real outlines", async () => {
    // The bridge between "the cmap says yes" and "the picture is right". Path
    // geometry per character separates outlines from rectangles by a factor of
    // three or more, measured across every script this site can reach.
    const satori = (await import("satori")).default;
    const A = "src/build/assets";
    const fonts = [
      { name: "Heebo", data: readFileSync(`${A}/Heebo-400.woff`), weight: 400 as const, style: "normal" as const },
      { name: "Cairo", data: readFileSync(`${A}/Cairo-400.woff`), weight: 400 as const, style: "normal" as const },
      { name: "Noto Sans", data: readFileSync(`${A}/NotoSans-Cyrillic-400.woff`), weight: 400 as const, style: "normal" as const },
    ];
    const density = async (t: string) => {
      const svg = await satori(
        { type: "div", props: { style: { fontSize: 64, color: "#000" }, children: t } } as never,
        { width: 1200, height: 200, fonts },
      );
      return svg.length / [...t].filter((c) => c !== " ").length;
    };
    for (const t of ["Minesweeper", "שולה מוקשים", "كانسة الألغام", "Сапёр"]) {
      expect(await density(t), `"${t}" rasterised as boxes`).toBeGreaterThan(200);
    }
    // The control for the threshold: a script with NO font must fall under it,
    // so the number above is measuring something rather than always passing.
    expect(await density("日本語")).toBeLessThan(200);
  }, 30_000);
});
