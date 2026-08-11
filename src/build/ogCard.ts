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

import bidiFactory from "bidi-js";
import type { GameMeta } from "@sdk/index";
import type { Locale } from "../content/types";
import { dirOf } from "../i18n/locales";
import { SITE } from "../content/site";
import { artGround, gameArt } from "../ui/gameArt";
import type { Route } from "./routes";

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

/** `og/game-snake-he.png`. Flat, because a nested tree buys nothing for 48 files. */
export function ogImageFile(route: Route): string {
  const parts = route.id ? [route.kind, route.id, route.locale] : [route.kind, route.locale];
  return `og/${parts.join("-")}.png`;
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
export function artSvgSized(id: string): string {
  // `xmlns` as well as the dimensions. `gameArt` emits a fragment meant to be
  // INLINED into an HTML document, where the namespace is implied and a
  // viewBox is all the sizing a CSS box needs. Handed to a rasteriser as a
  // standalone document, the same string is not an SVG at all - resvg rejects
  // it with "the document does not have a root node".
  const sized = gameArt(id).replace(
    "<svg ",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" `,
  );

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
  const resolved = sized.replace(/var\(\s*--[\w-]+\s*,\s*([^)]*)\)/g, "$1");
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
export function ogCardTree(route: Route, meta?: GameMeta, artPngUri?: string): CardNode {
  const site = SITE[route.locale];
  const rtl = dirOf(route.locale) === "rtl";
  const ground = meta ? artGround(meta.id) : "#241C3B";
  const title = toVisualOrder(meta ? meta.title[route.locale] : site.brand, route.locale);
  const sub = toVisualOrder(meta ? site.brand : site.tagline, route.locale);

  // The art arrives already RASTERISED, and that is not an optimisation.
  // Satori embeds an SVG `<image>` happily and resvg then drops it on the
  // floor - no warning, no error, just a flat colour card that looks like a
  // game whose art was never drawn. So the art is rendered to PNG first, by
  // the one component that is definitely willing to read SVG: resvg itself.
  const art: CardNode[] = artPngUri
    ? [
        {
          type: "img",
          props: {
            style: { position: "absolute", top: 0, left: 0 },
            src: artPngUri,
            width: OG_WIDTH,
            height: OG_HEIGHT,
          } as CardNode["props"],
        },
      ]
    : [];

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
              alignItems: rtl ? "flex-end" : "flex-start",
              gap: "8px",
              width: `${OG_WIDTH}px`,
              padding: "40px 64px",
              backgroundColor: "#241C3B",
            },
            children: [
              text(title, { fontSize: 82, fontWeight: 800, color: "#FFF7EC", lineHeight: 1.1 }),
              text(sub, { fontSize: 34, fontWeight: 400, color: "#FFF7EC", opacity: 0.85 }),
            ],
          },
        },
      ],
    },
  };
}
