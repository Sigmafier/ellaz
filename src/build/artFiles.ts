import { artSvgSized } from "./ogCard";
import { GAMES } from "../portal/games";

/**
 * The game's own art, as a standalone SVG file per game.
 *
 * It exists because Google had no image to feature. Measured 2026-08-22 on the
 * live site: zero `<img>` elements and zero structured-data `image` values
 * across all 33 game pages in all four languages. Google's thumbnail beside a
 * text result is chosen from images embedded ON the page, so a page carrying
 * none can never have one - and every gate here was green throughout, because
 * a missing picture breaks nothing.
 *
 * SVG rather than a raster, and that is checked rather than assumed. Google's
 * image documentation lists the formats it indexes from an `img` `src` as
 * "BMP, GIF, JPEG, PNG, WebP, SVG, and AVIF", and the structured-data
 * requirement is that the URL be crawlable, indexable and in one of those. The
 * `ORGANIZATION` node in `schema.ts` already leans on the same list for its
 * `logo`, so this is the second use of one fact rather than a new bet.
 *
 * It is a FILE and not an inline `<svg>`, and that distinction is the whole
 * point: inline SVG is markup, has no URL, and cannot be indexed as an image.
 * Only something with a `src` can be featured.
 *
 * 1200x900 rather than the art's own 200x150 viewBox. A vector has no intrinsic
 * size until one is declared, and Google's large-thumbnail guidance is stated in
 * pixels - so the declared box is what a crawler measures. 4:3 is one of the
 * three aspect ratios Google names, and 1200 wide clears the bar every
 * image-bearing feature states. It costs nothing: the path data is identical at
 * any size.
 */
export const ART_WIDTH = 1200;
export const ART_HEIGHT = 900;

/** `art/snake.svg`. Flat and base-free, exactly like `ogImageFile`. */
export function artFile(id: string): string {
  return `art/${id}.svg`;
}

/** For an `<img src>`, which is served by a HOST and therefore carries its base. */
export function artHref(base: string, id: string): string {
  return `${base}${artFile(id)}`;
}

/** For a canonical URL - JSON-LD, the sitemap. The base belongs to a host, not an identity. */
export function artPath(id: string): string {
  return `/${artFile(id)}`;
}

/**
 * One file per game in the roster.
 *
 * Pure, synchronous and string-only, so it belongs inside `allEmittedFiles`
 * with the pages rather than beside the share cards - those are split out
 * precisely because they are binary and async, and this is neither.
 *
 * `artSvgSized` throws on art it cannot resolve and on a `var()` with no
 * fallback, so a scene that would rasterise as an opaque black rectangle stops
 * the build instead of shipping as the picture of a game.
 */
export function artFiles(): Array<{ fileName: string; source: string }> {
  const files = GAMES.map((meta) => ({
    fileName: artFile(meta.id),
    source: artSvgSized(meta.id, ART_WIDTH, ART_HEIGHT),
  }));
  // A file walk that silently produces nothing emits nothing and exits 0 - the
  // shape every gate in this repo exists to catch.
  if (files.length === 0) throw new Error("artFiles: produced no art - refusing to emit");
  return files;
}
