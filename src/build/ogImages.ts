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
import satori from "satori";
import { readFileSync } from "node:fs";
import type { GameMeta } from "@sdk/index";
import { metaFor } from "../portal/games";
import {
  artSvgSized,
  OG_HEIGHT,
  OG_MAX_BYTES,
  OG_WIDTH,
  ogCardTree,
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
  { file: "./assets/Heebo-400.woff", weight: 400 as const },
  { file: "./assets/Heebo-800.woff", weight: 800 as const },
];

let cached: Array<{ name: string; data: Buffer; weight: 400 | 800; style: "normal" }> | null = null;

function fonts() {
  cached ??= FONTS.map(({ file, weight }) => ({
    name: "Heebo",
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
function artPngUri(id: string): string {
  const png = new Resvg(artSvgSized(id), {
    fitTo: { mode: "width", value: OG_WIDTH },
  })
    .render()
    .asPng();
  return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
}

/** One card, as PNG bytes. */
export async function renderOgPng(route: Route, meta?: GameMeta): Promise<Uint8Array> {
  const svg = await satori(ogCardTree(route, meta, meta && artPngUri(meta.id)) as never, {
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
