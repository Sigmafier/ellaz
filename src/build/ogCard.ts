/* Open Graph share cards - the picture a link grows when someone sends it.
   ===========================================================================

   WHY THIS EXISTS. Until 2026-08-08 no page carried an `og:image`, so every
   link shared to WhatsApp - which is how an Israeli parent actually passes a
   game to another parent - previewed as a bare line of text. That is a
   distribution problem rather than a ranking one, and distribution is worth
   more to this site than any amount of markup.

   WHY IT IS BUILT FROM `gameArt` AND NOT A SCREENSHOT. The same reason the
   home grid is: the art is authored in this repo as flat SVG, it already says
   what each game looks like, and there is exactly one answer to that question.
   A screenshot pipeline would be a second answer, and it would need a browser.

   THE TRAP THIS FILE IS SHAPED AROUND: NEITHER RENDERER DOES BIDI. A
   rasteriser is not a browser. `resvg` lays `<text>` out in LOGICAL order, so
   "נחש" rasterises as "שחנ" - a perfectly clean PNG of nonsense - and
   `direction="rtl"` does not fix it. `satori` gets it wrong the same way, and
   its `direction: "rtl"` style does not fix it either. Both were measured, not
   assumed: rendering single glyphs, matching their outlines inside the merged
   path of the full word, and sorting by x. An eyeball check passed this bug,
   which is exactly why the check is mechanical now.

   So the visual order is computed HERE, by `bidi-js` (UAX#9), and the renderer
   only ever receives a string already in the order it should paint. Naive
   reversal is NOT a substitute and two shipping titles prove it: "2048" must
   stay "2048" rather than "8402", and "מה בא אחר כך?" must put its question
   mark on the LEFT. `ogCard.test.ts` pins both.

   Kept DOM-free and satori-free on purpose. This module returns plain data;
   `ogImages.ts` owns the async, native, font-loading half. That split is what
   lets the layout be unit-tested without a rasteriser. */

import { createHash } from "node:crypto";
import bidiFactory from "bidi-js";
import { gameName } from "./gameName";
import type { GameMeta } from "@sdk/index";
import type { Locale } from "../content/types";
import { dirOf } from "../i18n/locales";
import { SITE } from "../content/site";
import { CATEGORY_CONTENT } from "../content/categories";
import { artGround, gameArt, registerArt } from "../ui/gameArt";
import { GAMES } from "../portal/games";
import { REST } from "../ui/gameArtRest";
import type { Route } from "./routes";

// EVERY scene, synchronously, before a card is drawn. `gameArt.ts` carries only
// the ones a first visit needs and fetches the rest at runtime; this module
// runs in Node at build time, is never bundled, and must not draw a blank card
// for a game whose scene happens to be in the lazy half. A static import of the
// lazy half costs a visitor nothing precisely because this file never reaches
// them. Idempotent, so importing this module twice is harmless.
registerArt(REST);

const bidi = bidiFactory();

/**
 * Logical order in, VISUAL order out - the order the glyphs must be painted.
 *
 * This is the whole Hebrew story on a share card. Everything downstream paints
 * left to right in the order it is handed, so the reordering has to happen
 * before the renderer sees a single character.
 */
export function toVisualOrder(value: string, locale: Locale): string {
  // The base direction is a property of the SCRIPT, not of Hebrew specifically -
  // `dirOf` already knows Arabic is RTL too, so promoting `ar` needs no edit
  // here and cannot silently rasterise a card of reversed Arabic.
  const base = dirOf(locale);
  return bidi.getReorderedString(value, bidi.getEmbeddingLevels(value, base));
}

/** 1200x630 is the size every platform documents, and WhatsApp's 4:1 cap allows. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * WhatsApp refuses an image over 600 KB, silently - the preview simply arrives
 * with no picture, which looks exactly like having no `og:image` at all. Flat
 * art lands two orders of magnitude under this; the gate exists for the day
 * someone adds a gradient.
 */
export const OG_MAX_BYTES = 600 * 1024;

/**
 * `game-snake-he`. What the card IS, with nothing about what it looks like.
 *
 * The discriminator is `id` OR `category`, and both are needed. With `id`
 * alone all five category pages in a language resolved to `og/category-en.png`
 * - one file, five pages, four of them advertising the wrong group in every
 * share and every preview. Caught by the distinctness assertion in
 * `ogCard.test.ts`, which is the only thing in the build that could have.
 */
export function ogCardKey(route: Route): string {
  const what = route.id ?? route.category;
  return (what ? [route.kind, what, route.locale] : [route.kind, route.locale]).join("-");
}

/**
 * Every card's content hash, filled in by `renderOgImages()` at build time.
 *
 * WHY A REGISTRY AND NOT A PURE FUNCTION. A card's bytes come out of a
 * rasteriser, which is async - and `ogImageFile` is called from the head
 * emitter, the JSON-LD and the sitemap, all of which are synchronous and pure
 * by design so the gate's tests can read them without a rasteriser. So the
 * cards are rendered FIRST, their hashes registered here, and the pages built
 * afterwards. `pages.ts` does that in `generateBundle`, in that order, and the
 * comment there says why the order is load-bearing.
 *
 * WHY THE HASH AT ALL: the same reason `artFile` carries one. See the long note
 * there - the deploy's `mirror` pass can only be trusted on names that change
 * when their bytes do, and 184 stable card names were 184 forced uploads at
 * ~0.68 s each on every single deploy.
 */
const ogHashes = new Map<string, string>();

/** Called once per card, by the renderer, before any page is built. */
export function registerOgHash(route: Route, png: Uint8Array): void {
  ogHashes.set(ogCardKey(route), createHash("sha256").update(png).digest("hex").slice(0, 8));
}

/**
 * `og/game-snake-he-3f9a1c2e.png`.
 *
 * THE FALLBACK IS DELIBERATE AND IT IS FAIL-CLOSED. `allEmittedFiles` is pure
 * and synchronous on purpose, and `build.test.ts` calls it without ever
 * rendering a card - so with no hash registered this has to answer something.
 * It answers `-unhashed`, which is a name no card is ever written under, and
 * `assert-pages.mjs` REFUSES any emitted page that references one. So a test
 * keeps working and a real build that got the ordering wrong reds by name
 * rather than shipping 184 references to files that are not there.
 *
 * Returning the un-suffixed name instead would be the fail-OPEN version: every
 * page would look plausible and every card would 404, which is the shape this
 * repo has already shipped twice.
 */
export function ogImageFile(route: Route): string {
  const key = ogCardKey(route);
  return `og/${key}-${ogHashes.get(key) ?? "unhashed"}.png`;
}

/** Base-free, like every other path here. The base belongs to a host, not an identity. */
export function ogImagePath(route: Route): string {
  return `/${ogImageFile(route)}`;
}

/**
 * The art, sized for the card.
 *
 * `gameArt` emits a `viewBox`-only `<svg>` with no width or height, which is
 * right for a CSS-sized card in the app and wrong for a rasteriser that has no
 * layout engine to ask. Both dimensions are injected here rather than changed
 * at the source, because the app's copy must stay fluid.
 */
export function artSvgSized(
  id: string,
  w = OG_WIDTH,
  h = OG_HEIGHT,
  fit?: "meet" | "slice",
): string {
  // `xmlns` as well as the dimensions. `gameArt` emits a fragment meant to be
  // INLINED into an HTML document, where the namespace is implied and a
  // viewBox is all the sizing a CSS box needs. Handed to a rasteriser as a
  // standalone document, the same string is not an SVG at all - resvg rejects
  // it with "the document does not have a root node".
  const raw = gameArt(id);
  if (!raw) {
    throw new Error(
      `game art for "${id}" is empty - its scene is in neither gameArt.ts nor gameArtRest.ts, ` +
        `or registerArt(REST) has not run. An empty string emits a 0-byte file that nothing else here would notice.`,
    );
  }
  const sized = raw.replace(
    "<svg ",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `,
  );

  // `gameArt` hardcodes `xMidYMid slice`, which is the app's answer and not
  // this one. REPLACED rather than appended: two `preserveAspectRatio`
  // attributes on one element is not an error anywhere in the chain - the
  // parser keeps the FIRST - so appending would emit a card that still crops
  // while every assertion about the string passed.
  const fitted = fit
    ? sized.replace(/preserveAspectRatio="[^"]*"/, `preserveAspectRatio="xMidYMid ${fit}"`)
    : sized;
  if (fit && !fitted.includes(`xMidYMid ${fit}`)) {
    throw new Error(
      `game art for "${id}" declares no preserveAspectRatio, so the requested "${fit}" was never applied`,
    );
  }

  // Every scene ends with a full-bleed veil rect painted
  // `fill:var(--art-veil,transparent)` - invisible in a browser, because the
  // property is unset and the fallback wins. A rasteriser does not implement
  // CSS custom properties, so the declaration never resolves and the rect
  // falls back to the SVG INITIAL fill, which is BLACK. The result is a
  // perfectly rendered scene under an opaque black rectangle.
  //
  // Resolved to the fallback here rather than removed, so a future veil that
  // is deliberately painted still works. The assertion is the point: an
  // unresolved `var()` must stop the build rather than quietly paint black.
  const resolved = fitted.replace(/var\(\s*--[\w-]+\s*,\s*([^)]*)\)/g, "$1");
  if (resolved.includes("var(")) {
    throw new Error(
      `game art for "${id}" carries a CSS var() with no fallback; a rasteriser paints that black`,
    );
  }
  return resolved;
}

/** A satori node. Structural only - satori owns the real type. */
export interface CardNode {
  type: string;
  props: { style?: Record<string, unknown>; children?: CardNode[] | string };
}

function text(value: string, style: Record<string, unknown>): CardNode {
  return { type: "div", props: { style: { display: "flex", ...style }, children: value } };
}

/**
 * The card.
 *
 * Full-bleed art with a solid bar across the foot carrying the title and the
 * domain. The bar is opaque rather than a wash: a share preview is looked at
 * for a fraction of a second on a phone, and translucent ink over 21 different
 * scenes gives 21 different contrast ratios, one of which will be unreadable.
 *
 * The bar aligns to the reading edge - right for Hebrew, left for English -
 * which is the only thing about this layout that is locale-aware. The text
 * itself needs no help: satori runs the bidi algorithm.
 */
/**
 * The two strings a card actually draws.
 *
 * Split out so the glyph-coverage check in `ogImages.ts` asks THIS rather than
 * rebuilding the same two expressions. A second copy would be right today and
 * wrong the first time the layout changes, and the failure it guards - a title
 * rasterised as empty rectangles - is invisible to every other check.
 */
export function ogCardText(route: Route, meta?: GameMeta): { title: string; sub: string } {
  const site = SITE[route.locale];
  // A category card names the GROUP. Falling through to the brand would give
  // twenty pages one identical picture, and a share of "Thinking games" that
  // shows the site's own tagline is a preview that says nothing about the link
  // it is previewing. The count is not filled in here: `{games}` never reaches
  // an h1, and a card is not the place to start.
  const group = route.category
    ? CATEGORY_CONTENT[route.locale][route.category].h1
    : undefined;

  // `/world/` and `/boards/` used to fall through to the brand, so home, world
  // and boards rendered the SAME two strings and - measured 2026-08-23 - the
  // same three BYTES: `sha256(home-en.png) === sha256(world-en.png) ===
  // sha256(boards-en.png)`. The distinctness assertion in `ogCard.test.ts`
  // compares FILE NAMES, which were always distinct, so nothing could see it.
  const screen =
    route.kind === "world"
      ? site.worldPage.h1
      : route.kind === "boards"
        ? site.boardsPage.h1
        : undefined;

  const title = meta ? gameName(meta.id, route.locale) : (group ?? screen ?? site.brand);

  // THE SECOND LINE NEVER CARRIES A COUNT, and that is a rule rather than a
  // preference. A card is a BAKED PNG that WhatsApp, Facebook and iMessage
  // cache on their own infrastructure for weeks; a number baked into one goes
  // stale in caches this repo cannot reach or invalidate. `{games}` is safe in
  // HTML precisely because the page is rebuilt on every deploy - an image
  // sitting in someone else's scraper cache is not.
  //
  // `site.tagline` is the countless line, already written in every page
  // locale, and it says what the reader GETS rather than repeating the brand.
  // It used to be `site.brand` here, which spent the card's only spare line on
  // a word the preview already prints under the picture as the domain.
  const sub = site.tagline;
  return {
    title: toVisualOrder(title, route.locale),
    sub: toVisualOrder(sub, route.locale),
  };
}

/** One tile of a card's picture: which scene, and the box it fills. */
export interface ArtTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** `meet` shows the WHOLE composition; `slice` fills the box and crops. */
  fit: "meet" | "slice";
}

/** The bar across the foot. Everything above it is picture. */
export const OG_BAR = 210;
const BAND = OG_HEIGHT - OG_BAR;

/** Up to ten scenes - past that a tile is too small to read as anything. */
export const MONTAGE_MAX = 10;

/**
 * The grid for `n` scenes, chosen so the tiles fill the band EXACTLY.
 *
 * A mosaic with a short last row reads as a broken image rather than as a
 * deliberate one, so the count is padded by cycling instead (see `montage`).
 * One row under five scenes, because a 2x2 of 600px tiles is two enormous
 * crops and `speed` really does hold only three games.
 */
export function montageGrid(n: number): { cols: number; rows: number } {
  const rows = n <= 4 ? 1 : 2;
  return { cols: Math.ceil(n / rows), rows };
}

/**
 * Which scenes a card's picture shows.
 *
 * DERIVED from the roster, never listed, so a new game joins the home mosaic
 * the moment `games.ts` names it and a new category page gets a real picture
 * with no edit here. A category shows its OWN games - a "Kids games" card
 * showing minesweeper would be a preview that misdescribes the link.
 */
export function montageIds(route: Route): string[] {
  const pool = route.category
    ? GAMES.filter((g) => g.category === route.category)
    : // A spread rather than the first ten, so the home mosaic is not four
      // shades of one category. `GAMES` is roster ORDER, which groups by
      // category, so an even stride crosses the whole catalogue.
      (() => {
        const step = Math.max(1, Math.floor(GAMES.length / MONTAGE_MAX));
        return GAMES.filter((_, i) => i % step === 0);
      })();
  return pool.slice(0, MONTAGE_MAX).map((g) => g.id);
}

/**
 * The picture for any card: one whole scene for a game, a mosaic for every
 * other kind.
 *
 * Until 2026-08-23 the art-less kinds - home, the five category pages, the
 * room and the boards, 32 of 164 cards - drew NOTHING, so a shared
 * `ellaz.fun` link previewed as a flat dark slab. Every tag was correct
 * throughout, which is why no gate here could see it: they all read the
 * markup, and the defect was that the markup pointed at an empty picture.
 */
export function cardArt(route: Route, meta?: GameMeta): ArtTile[] {
  // A GAME shows its own scene WHOLE. `gameArt` declares
  // `preserveAspectRatio="xMidYMid slice"`, which is right for a CSS-sized
  // card in the app and wrong here: a 200x150 scene sliced into 1200x630
  // renders 900px tall, so 135px is cut off each end and the bar covers 230px
  // more - 44.4% of the composition survived, measured, and snake's tail and
  // half the apple were among the casualties. `meet` letterboxes instead, and
  // the letterbox is INVISIBLE because the card's ground already IS the
  // scene's own ground colour.
  if (meta) return [{ id: meta.id, x: 0, y: 0, w: OG_WIDTH, h: BAND, fit: "meet" }];

  const ids = montageIds(route);
  if (!ids.length) return [];
  const { cols, rows } = montageGrid(ids.length);
  const w = Math.ceil(OG_WIDTH / cols);
  const h = Math.ceil(BAND / rows);
  return Array.from({ length: cols * rows }, (_, i) => ({
    // Cycle to fill. A short last row looks like a failed render; a repeated
    // scene in a mosaic reads as pattern.
    id: ids[i % ids.length]!,
    x: (i % cols) * w,
    y: Math.floor(i / cols) * h,
    w,
    h,
    // A tile is a thumbnail, not a composition, so filling the box beats
    // showing every pixel - `meet` here would ring each tile with its own
    // letterbox and turn the mosaic into a grid of postage stamps.
    fit: "slice" as const,
  }));
}

export function ogCardTree(
  route: Route,
  meta?: GameMeta,
  /** One rasterised PNG data URI per `cardArt` tile, in the same order. */
  artUris: string[] = [],
): CardNode {
  const rtl = dirOf(route.locale) === "rtl";
  const tiles = cardArt(route, meta);
  // The ground is the card's floor wherever a tile does not reach - the
  // letterbox on a game card, and nothing at all on a mosaic. A game uses its
  // OWN ground, which is what makes the letterbox invisible rather than a bar.
  const ground = meta ? artGround(meta.id) : "#241C3B";
  const { title, sub } = ogCardText(route, meta);

  // The art arrives already RASTERISED, and that is not an optimisation.
  // Satori embeds an SVG `<image>` happily and resvg then drops it on the
  // floor - no warning, no error, just a flat colour card that looks like a
  // game whose art was never drawn. So the art is rendered to PNG first, by
  // the one component that is definitely willing to read SVG: resvg itself.
  const art: CardNode[] = tiles.flatMap((t, i) => {
    const src = artUris[i];
    if (!src) return [];
    return [
      {
        type: "img",
        props: {
          style: { position: "absolute", top: t.y, left: t.x },
          src,
          width: t.w,
          height: t.h,
        } as CardNode["props"],
      },
    ];
  });

  return {
    type: "div",
    props: {
      style: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        backgroundColor: ground,
      },
      children: [
        ...art,
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 0,
              left: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: rtl ? "flex-end" : "flex-start",
              gap: "10px",
              width: `${OG_WIDTH}px`,
              height: `${OG_BAR}px`,
              padding: "0 64px",
              backgroundColor: "#241C3B",
            },
            children: [
              text(title, { fontSize: 76, fontWeight: 800, color: "#FFF7EC", lineHeight: 1.1 }),
              text(sub, { fontSize: 34, fontWeight: 400, color: "#FFF7EC", opacity: 0.85 }),
            ],
          },
        },
      ],
    },
  };
}
