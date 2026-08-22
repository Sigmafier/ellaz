import { describe, it, expect } from "vitest";
import { GAMES } from "../portal/games";
import { ART_HEIGHT, ART_WIDTH, artFile, artFiles, artHref, artPath } from "./artFiles";

/**
 * The picture a search result can show.
 *
 * Every assertion here has one shape: the file has to be a REAL image at a REAL
 * url. Inline SVG passes an eye and fails a crawler, and that is precisely the
 * state this repo was in until 2026-08-22 - 33 games, four languages, art on
 * every page, and nothing indexable anywhere.
 */
describe("the per-game art files", () => {
  const files = artFiles();

  it("writes one file per game in the roster, and no orphans", () => {
    expect(files.length).toBe(GAMES.length);
    expect(files.map((f) => f.fileName).sort()).toEqual(GAMES.map((m) => artFile(m.id)).sort());
  });

  it("every file is a real SVG document with its box declared", () => {
    for (const f of files) {
      // `xmlns` is what makes a fragment a DOCUMENT. Without it the file is
      // markup a browser will not render as an image, and `<img>` shows the
      // broken-image glyph rather than failing loudly.
      expect(f.source, f.fileName).toContain('xmlns="http://www.w3.org/2000/svg"');
      // A vector has no intrinsic size until one is declared, and a crawler
      // measures the declared box. Undeclared, the picture is unmeasurable and
      // every pixel requirement a feature states is unanswerable.
      expect(f.source, f.fileName).toContain(`width="${ART_WIDTH}"`);
      expect(f.source, f.fileName).toContain(`height="${ART_HEIGHT}"`);
      expect(f.source.length, `${f.fileName} is too small to be a scene`).toBeGreaterThan(200);
    }
  });

  it("resolves every CSS var - an unresolved one paints the whole card black", () => {
    // Not a style point. Outside a browser there is no cascade, so
    // `fill:var(--art-veil,transparent)` falls back to the SVG INITIAL fill,
    // which is black - and the result is a perfectly rendered scene under an
    // opaque rectangle. It is the failure that looks most like success.
    for (const f of files) expect(f.source, f.fileName).not.toContain("var(");
  });

  it("gives every game its OWN picture", () => {
    // Two games sharing a file is the `og/category-en.png` defect one artifact
    // over: five pages, one image, four of them advertising the wrong thing.
    expect(new Set(files.map((f) => f.source)).size).toBe(files.length);
  });

  it("carries the base for a SRC and never for a canonical url", () => {
    // The two callers want opposite things and the distinction is not
    // cosmetic: a src without the base 404s on the GitHub Pages mirror, and a
    // canonical WITH it names a host we have told crawlers to ignore.
    expect(artHref("/ellaz/", "snake")).toBe("/ellaz/art/snake.svg");
    expect(artHref("/", "snake")).toBe("/art/snake.svg");
    expect(artPath("snake")).toBe("/art/snake.svg");
  });
});
