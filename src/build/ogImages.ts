/* The rasterising half of the share cards. Build-time only, never the app.
   ===========================================================================

   `ogCard.ts` decides what a card looks like and returns plain data. This file
   owns everything that makes that hard to test: a native rasteriser, two font
   binaries, and async.

   THE ORDER IS LOAD-BEARING. satori shapes text and emits PATHS; resvg then
   rasterises geometry it does not have to understand. Handing resvg `<text>`
   instead would render Hebrew reversed - see the header of `ogCard.ts`. The
   assertion below fails the build if satori ever stops embedding fonts, which
   is the one upstream change that would reintroduce it silently. */

import { Resvg } from "@resvg/resvg-js";
import opentype from "@shuding/opentype.js";
import satori from "satori";
import { readFileSync } from "node:fs";
import type { GameMeta } from "@sdk/index";
import { metaFor } from "../portal/games";
import {
  artSvgSized,
  cardArt,
  type ArtTile,
  OG_HEIGHT,
  OG_MAX_BYTES,
  OG_WIDTH,
  ogCardTree,
  ogCardText,
  ogImageFile,
} from "./ogCard";
import { OG_ROUTES, type Route } from "./routes";

/**
 * Heebo covers Hebrew and Latin in one family, which is why the site already
 * uses it. These are the static instances: satori's opentype fork cannot parse
 * a VARIABLE font (it throws inside `parseFvarAxis`), so the variable Heebo
 * that Google serves by default is not usable here.
 *
 * SIL Open Font License 1.1 - see `assets/Heebo-LICENSE.txt`. Bundled rather
 * than fetched so a build never depends on the network, and read through
 * `import.meta.url` so it resolves the same from the Vite plugin and a test.
 */
const FONTS = [
  { family: "Heebo", file: "./assets/Heebo-400.woff", weight: 400 as const },
  { family: "Heebo", file: "./assets/Heebo-800.woff", weight: 800 as const },
  // Arabic and Cyrillic, because Heebo has NEITHER - measured, 0 of 256
  // codepoints in each block. See the block comment below.
  { family: "Cairo", file: "./assets/Cairo-400.woff", weight: 400 as const },
  { family: "Cairo", file: "./assets/Cairo-700.woff", weight: 800 as const },
  { family: "Noto Sans", file: "./assets/NotoSans-Cyrillic-400.woff", weight: 400 as const },
  { family: "Noto Sans", file: "./assets/NotoSans-Cyrillic-700.woff", weight: 800 as const },
];

/**
 * WHY THREE FAMILIES, AND WHY THESE THREE.
 *
 * Heebo covers Latin and Hebrew and nothing else. Measured on the bundled
 * files: **zero** Arabic codepoints and **zero** Cyrillic. Satori does not
 * throw on a missing glyph - it emits a rectangle - so an Arabic or Russian
 * card rasterises as a clean PNG full of tofu boxes. Measured through the real
 * rasteriser, path geometry per character: Latin 457-703, Hebrew 289, and
 * **Russian 150, Arabic 128**. Those two are the boxes.
 *
 * And `checkOgCard()` in `assert-pages.mjs` asserts only that the file is
 * between 4 KB and the WhatsApp ceiling. A real card is ~21 KB dominated by the
 * game art, so a card whose entire title bar is empty rectangles passes with
 * room to spare. 32 broken cards per language, every gate green. The glyph
 * gate beside that byte check is what closes it.
 *
 * REGISTERED UNDER THEIR OWN FAMILY NAMES, which is not cosmetic. Measured:
 * adding a font under the SAME family name changes nothing at all - satori
 * takes the first match for a family+weight and never falls back within it, so
 * Arabic stayed at 128/char. Under its own name it falls back per glyph and
 * Cyrillic went 150 -> 645/char.
 *
 * CAIRO RATHER THAN NOTO SANS ARABIC, and this one cost the most to find.
 * Satori's opentype fork **throws** on Noto Sans Arabic, Noto Kufi Arabic and
 * Amiri: `lookupType: 5 - substFormat: 3 is not yet supported`. The obvious
 * choice is the one that breaks the build. Cairo, Tajawal and Almarai all parse;
 * Cairo is the pick because it is a rounded, friendly face that sits beside
 * Fredoka and Heebo without looking like a different product.
 *
 * ARABIC JOINING WORKS - do not add a shaper. It is easy to assume this fork
 * does bidi but not shaping, and that is wrong. Tested by rendering one letter
 * and the same letter doubled: if no shaper ran, the pair's outline would be
 * the isolated outline twice. It is not, while the LATIN control ("n" vs "nn")
 * IS exactly doubled - so the method can report "no shaping" and simply does
 * not here. Contextual forms are being substituted.
 *
 * All three families are SIL Open Font License 1.1; see the `*-LICENSE.txt`
 * files beside them. Bundled rather than fetched so a build never depends on
 * the network, and BUILD-TIME ONLY - `src/build` ships to nobody, so these
 * 68 KB cost a first visit exactly zero.
 */
let cached: Array<{ name: string; data: Buffer; weight: 400 | 800; style: "normal" }> | null = null;

function fonts() {
  cached ??= FONTS.map(({ family, file, weight }) => ({
    name: family,
    data: readFileSync(new URL(file, import.meta.url)),
    weight,
    style: "normal" as const,
  }));
  return cached;
}

/**
 * The game's art, rasterised, as a `data:` URI satori can embed.
 *
 * resvg reads SVG; it will NOT read an SVG nested inside an `<image>` that
 * satori produced, and it fails by painting nothing. PNG in an `<image>` is
 * the path both tools agree on.
 */
function artPngUri(tile: ArtTile): string {
  const png = new Resvg(artSvgSized(tile.id, tile.w, tile.h, tile.fit), {
    // Rasterise at the tile's OWN width, not the card's. Rendering every
    // mosaic tile at 1200 and letting satori scale it down is ten full-size
    // PNGs base64'd into one card, and the 600 KB WhatsApp ceiling is real.
    fitTo: { mode: "width", value: tile.w },
  })
    .render()
    .asPng();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

/**
 * Every character this card draws must have a glyph in one of the bundled
 * fonts. Returns the characters that do not, deduped, in order.
 *
 * THE FAILURE THIS EXISTS FOR IS SILENT AND TOTAL. Satori does not throw on a
 * missing glyph; it emits a rectangle. So the card is a valid PNG of the right
 * size with a title bar full of tofu, and `checkOgCard()` - which asserts only
 * `4096 < bytes < ceiling` - passes it comfortably, because the game art is
 * ~21 KB on its own. Promoting Russian or Arabic without the right font would
 * have shipped 32 broken cards per language with every gate green.
 *
 * It asks the font's cmap through **satori's own parser**, so this check and
 * the rasteriser cannot disagree about what a font contains. And it is an
 * EXACT question - is this codepoint mapped - rather than a threshold on how
 * much path geometry came out, so there is no tuned number here to go stale.
 */
export function missingGlyphs(text: string): string[] {
  const parsed = (parsedFonts ??= FONTS.map(({ file }) => {
    const buf = readFileSync(new URL(file, import.meta.url));
    return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }));
  const out: string[] = [];
  for (const ch of text) {
    // Whitespace is laid out, never drawn, and a font need not map it.
    if (/\s/u.test(ch)) continue;
    if (parsed.some((f) => f.charToGlyphIndex(ch) > 0)) continue;
    if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

let parsedFonts: ReturnType<typeof opentype.parse>[] | null = null;

/** One card, as PNG bytes. */
export async function renderOgPng(route: Route, meta?: GameMeta): Promise<Uint8Array> {
  const { title, sub } = ogCardText(route, meta);
  const missing = missingGlyphs(`${title}${sub}`);
  if (missing.length) {
    throw new Error(
      `og card ${ogImageFile(route)}: no glyph for ${missing.map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ")}. ` +
        `Satori would draw an empty rectangle for each and the PNG would still be the right SIZE, ` +
        `so the byte check in assert-pages.mjs cannot see this. Add a font covering that script to ` +
        `FONTS in this file - and note that Noto Sans Arabic, Noto Kufi Arabic and Amiri all CRASH ` +
        `satori's opentype fork ("lookupType: 5 - substFormat: 3"); Cairo, Tajawal and Almarai parse.`,
    );
  }

  const svg = await satori(ogCardTree(route, meta, cardArt(route, meta).map(artPngUri)) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: fonts(),
  });

  // Text must have become geometry before resvg sees it. A `<text>` element
  // here means Hebrew is about to render reversed, and nothing downstream
  // would notice - the PNG is valid, the build is green, the words are wrong.
  if (svg.includes("<text")) {
    throw new Error(
      "og card still contains <text>: satori did not embed the font, so Hebrew would rasterise reversed",
    );
  }

  const png = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();

  // WhatsApp drops an oversized image silently - the preview arrives with no
  // picture, indistinguishable from having no `og:image` at all.
  if (png.length > OG_MAX_BYTES) {
    throw new Error(
      `og card ${ogImageFile(route)} is ${png.length} B, over the ${OG_MAX_BYTES} B WhatsApp ceiling`,
    );
  }
  return png;
}

/**
 * Every card the route table implies, one per emitted page.
 *
 * Serial rather than `Promise.all`: 48 rasterisations at once buys nothing on
 * a build machine and makes a failure report which card died much harder to
 * read. The whole set takes a couple of seconds.
 */
export async function renderOgImages(): Promise<Array<{ fileName: string; png: Uint8Array }>> {
  const out: Array<{ fileName: string; png: Uint8Array }> = [];
  for (const route of OG_ROUTES) {
    out.push({
      fileName: ogImageFile(route),
      png: await renderOgPng(route, route.id ? metaFor(route.id) : undefined),
    });
  }
  return out;
}
