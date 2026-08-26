import { createHash } from "node:crypto";
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

/**
 * The SVG for one game, computed once per build.
 *
 * `artFile` and `artFiles` both need it - the first to hash it, the second to
 * emit it - and `artSvgSized` walks the whole scene, so asking twice per game
 * per base is work nobody sees and everybody waits for.
 */
const svgCache = new Map<string, string>();
function artSvg(id: string): string {
  let svg = svgCache.get(id);
  if (svg === undefined) {
    svg = artSvgSized(id, ART_WIDTH, ART_HEIGHT);
    svgCache.set(id, svg);
  }
  return svg;
}

/**
 * `art/snake-3f9a1c2e.svg`. Flat, base-free, and CONTENT-HASHED.
 *
 * WHY THE HASH. The deploy uploads `assets/` with lftp's `mirror`, which sends
 * only what the server does not already have - and that is EXACT there, and
 * only there, because every name under `assets/` carries a content hash, so a
 * changed file is a NEW file and "does the remote have this name" is the whole
 * question. Every other file is FORCED, because mirror otherwise decides by
 * comparing SIZE and TIME, and an HTML file differing only in a hash is
 * byte-identical in length. That defect skipped all 49 pages once.
 *
 * A stable `art/snake.svg` therefore had to be forced on every deploy, 38 files
 * at ~0.68 s each. Hashed, it joins the mirror pass and is sent once, ever.
 * The invariant is not "no ledgers" - it is that THE THING DECIDING WHAT TO
 * SEND MUST NOT BE ABLE TO BE WRONG ABOUT WHAT IS ALREADY THERE, and a content
 * hash is the only comparison here that cannot.
 *
 * Old hashes accumulate on the server and are never deleted, deliberately -
 * that is what keeps a stale page working if a run dies between passes.
 *
 * See `.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`.
 */
export function artFile(id: string): string {
  return `art/${id}-${createHash("sha256").update(artSvg(id)).digest("hex").slice(0, 8)}.svg`;
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
    source: artSvg(meta.id),
  }));
  // A file walk that silently produces nothing emits nothing and exits 0 - the
  // shape every gate in this repo exists to catch.
  if (files.length === 0) throw new Error("artFiles: produced no art - refusing to emit");
  return files;
}
