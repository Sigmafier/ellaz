import { createHash } from "node:crypto";
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
    //
    // Written against `artFile` rather than a literal, because the name gained
    // a content hash on 2026-08-26 and a literal here would have to be
    // re-typed every time a scene is redrawn - which is the same hand-kept
    // mirror this repo keeps writing rules about. What is asserted is the
    // RELATIONSHIP: one carries the base, the other never does, and the file
    // part of both is the same string.
    const file = artFile("snake");
    expect(artHref("/ellaz/", "snake")).toBe(`/ellaz/${file}`);
    expect(artHref("/", "snake")).toBe(`/${file}`);
    expect(artPath("snake")).toBe(`/${file}`);
    // ...and the base is genuinely the only difference, so a bug that dropped
    // it from both would not pass the three lines above.
    expect(artHref("/ellaz/", "snake")).not.toBe(artPath("snake"));
  });

  it("names the file after its own BYTES, so the deploy can skip an unchanged one", () => {
    // The hash is what lets `og/` and `art/` ride lftp's `mirror` pass instead
    // of being force-uploaded on every deploy - 222 files at ~0.68 s each. It
    // only works if the name really tracks the content, so: the same art twice
    // is the same name, and two different games are two different names.
    expect(artFile("snake")).toBe(artFile("snake"));
    expect(artFile("snake")).not.toBe(artFile("sudoku"));
    expect(artFile("snake")).toMatch(/^art\/snake-[0-9a-f]{8}\.svg$/);
    // The emitted set really is what the names claim - a hash computed off
    // something OTHER than the bytes on disk would pass every line above.
    const bySource = new Map(files.map((f) => [f.fileName, f.source]));
    for (const meta of GAMES) {
      const name = artFile(meta.id);
      expect(bySource.has(name), `${name} was named but never emitted`).toBe(true);
      expect(createHash("sha256").update(bySource.get(name)!).digest("hex")).toContain(
        name.slice(name.lastIndexOf("-") + 1, -4),
      );
    }
  });
});
