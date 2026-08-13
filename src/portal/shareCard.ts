/* The picture a player sends - PURE, a string in and a string out.
   ===========================================================================

   Sibling of `src/build/ogCard.ts`, and the differences are all consequences of
   ONE fact: that file runs in NODE at build time, this one runs in a BROWSER on
   a phone. Everything below follows from that, and the three traps `ogCard.ts`
   is shaped around behave DIFFERENTLY here rather than identically:

   1. BIDI - INVERTED, and this is the one that would have shipped wrong.
      `ogCard.ts` reorders Hebrew itself with `bidi-js`, because neither satori
      nor resvg implements UAX#9 and both lay `<text>` out in logical order. A
      BROWSER implements it: that is what a browser IS. So this file must NOT
      reorder - pre-reordering here would hand the browser a reversed string to
      reverse again, and "נחש" would rasterise as "שחנ" for exactly the reason
      the build path avoids. The fix there is the bug here. `bidi-js` is
      deliberately not imported.

   2. `var(--art-veil)` - SAME TRAP, same fix. An `<img>` pointing at an SVG is
      an isolated document: it has no `:root`, so the custom property never
      resolves and the full-bleed veil rect falls back to the SVG initial fill,
      which is BLACK. A perfectly drawn scene under an opaque black rectangle.
      `resolveVars` below is our own copy of `artSvgSized`'s replacement, NOT an
      import - the app may never import `src/build/**` (it reads `src/content`,
      and one import puts every word of every page into the precached shell).

   3. `xmlns` - SAME TRAP. `gameArt` emits a FRAGMENT meant to be inlined into
      HTML, where the namespace is implied. As a standalone document it is not
      an SVG at all, and a browser refuses to decode it just as resvg does.

   And two that are new here, because a build machine has neither:

   4. NO BUNDLED FONT. `ogImages.ts` reads two Heebo binaries off disk and hands
      them to satori. An SVG inside an `<img>` cannot fetch anything - and this
      platform forbids an external request from a game regardless - so the card
      names a SYSTEM stack and the device draws Hebrew with its own Hebrew font.
      That is why nothing here measures text: we do not know the metrics, so
      lines are CAPPED by character count rather than fitted.

   5. NO `<foreignObject>`. It taints a canvas in some engines, and a tainted
      canvas makes `toBlob` throw - so the rasteriser would fail at the last
      step, after everything looked right. Plain shapes and `<text>` only.

   The rasteriser lives in `shareCardRender.ts`; this file stays DOM-free so the
   layout is unit-testable without a browser. */

import { gameArt, registerArt } from "@ui/gameArt";
import { REST } from "@ui/gameArtRest";
import { INK_DARK, inkFor } from "@ui/ink";
import { containsSecret } from "@sdk/share";

// The card can be asked for ANY game, and the shell only carries the scenes
// above the fold. A static import is right here and would be wrong one file
// over: this module already lives in the lazy `share-*` chunk, opened from a
// button that only appears once a child has played something today, so the
// scenes ride along with a chunk a first visit never fetches.
registerArt(REST);

/**
 * Square, not 1200x630.
 *
 * A link unfurl is a wide strip because that is the box WhatsApp draws around
 * a preview. This is not an unfurl - it is an image file sent INTO a chat,
 * where the box is roughly square and a 1200x630 strip arrives as a letterbox
 * with two grey bands. 1080 is the size every phone camera already sends, so
 * nothing downsamples it on the way.
 */
export const CARD_SIZE = 1080;

/** Where the art stops and the words start. */
const ART_HEIGHT = 648;

const PAD = 64;

/**
 * The bar, and the ink on it.
 *
 * NOT theme tokens, and not literals either. A `var()` cannot work: this
 * document is decoded by an `<img>` with no `:root` to read from, which is the
 * same fact that makes the veil rect paint black. And a hex here would be a
 * colour the theme cannot reach, which `ui/token-hygiene.test.ts` correctly
 * refuses - it caught both of these on the first full run.
 *
 * `ui/ink.ts` is the module that already owns "a strip sits on a colour and
 * something has to stay readable on it", and it is exempt from that gate for
 * exactly this reason. Deriving the ink rather than picking it means the pair
 * stays legible if the bar ever moves: measured 15.9:1, well past AA.
 *
 * It is a shade off `ogCard.ts`'s `#241C3B`, so a link unfurl and a sent
 * picture are near-identical rather than byte-identical. At card scale the two
 * near-black plums are indistinguishable, and one theme-reachable answer beats
 * two literals that agree today.
 */
const BAR = INK_DARK;
const INK = inkFor(BAR);

/**
 * A system stack, because there is no font to bundle (see the header).
 * `Arial` last rather than a bare `sans-serif` so an old Android that resolves
 * neither still lands somewhere with Hebrew coverage.
 */
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * How many characters fit on a line at the sizes below, on the narrowest
 * plausible font. A CAP rather than a fit: with no font loaded we cannot
 * measure, and a guess that runs long draws a title straight off the card.
 */
const MAX_LINE = 26;

/**
 * The URL gets its own, longer cap and a smaller size.
 *
 * A title clipped to `Find the Differ…` is still readable; an address clipped
 * to `https://sigmafier.gith…` is a broken promise - somebody would type it.
 * 48 clears the longest address this app is served from
 * (`https://sigmafier.github.io/ellaz/`, 34) with room for a locale prefix.
 */
const MAX_URL = 48;

export interface ShareCardInput {
  /** The one line saying what this is. */
  headline: string;
  /** One per game. Plain titles - NO emoji, see `emojiFree` below. */
  lines: string[];
  /** The public address, drawn small under the list. */
  url: string;
  /** Which game's art fills the top. Falls back to a flat bar if it has none. */
  artId?: string;
  /** The reader's direction. Nothing here reorders text - the browser does. */
  rtl: boolean;
}

/** XML-escape. `'` included: an apostrophe inside an attribute we build below. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clip(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Resolve a custom-property reference to its fallback arm, and refuse one that
 * has no fallback arm to resolve to.
 *
 * (The doc deliberately describes the syntax instead of quoting it. The orphan
 * half of `ui/token-hygiene.test.ts` scans RAW source - it strips comments for
 * the colour check and not for this one - so a made-up token name written into
 * a comment here reads as a live typo and fails the build. It did.)
 *
 * The same assertion `artSvgSized` makes, for the same reason: an unresolved
 * `var()` does not error, it paints BLACK over the whole card. A build that
 * stops is better than a picture that is a black square.
 */
export function resolveVars(svg: string): string {
  const resolved = svg.replace(/var\(\s*--[\w-]+\s*,\s*([^)]*)\)/g, "$1");
  if (resolved.includes("var(")) {
    throw new Error("game art carries a CSS var() with no fallback; a rasteriser paints that black");
  }
  return resolved;
}

/**
 * The art, as a nested `<svg>` viewport.
 *
 * A nested `<svg>` with its own width/height and the original `viewBox` clips
 * to its box and keeps `preserveAspectRatio="xMidYMid slice"` working, which is
 * exactly the full-bleed crop the home grid gets from CSS.
 */
function artBlock(id: string | undefined): string {
  const raw = id ? gameArt(id) : "";
  if (!raw) return `<rect width="${CARD_SIZE}" height="${ART_HEIGHT}" fill="${BAR}"/>`;
  return resolveVars(raw.replace("<svg ", `<svg x="0" y="0" width="${CARD_SIZE}" height="${ART_HEIGHT}" `));
}

function line(
  value: string,
  y: number,
  size: number,
  weight: number,
  opacity: number,
  rtl: boolean,
  max = MAX_LINE,
) {
  const x = rtl ? CARD_SIZE - PAD : PAD;
  return (
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}"` +
    ` fill="${INK}" opacity="${opacity}" text-anchor="${rtl ? "end" : "start"}"` +
    // `direction` is what tells the browser's own bidi algorithm which way the
    // paragraph runs. Nothing here reorders the characters themselves.
    ` style="direction:${rtl ? "rtl" : "ltr"}">${esc(clip(value, max))}</text>`
  );
}

/**
 * The card, as a standalone SVG document.
 *
 * Throws on anything that must not leave the device. This is the SECOND exit -
 * `buildShare` guards the text, this guards the picture - and a guard on one
 * exit only is how the other one ships.
 */
export function shareCardSvg(input: ShareCardInput): string {
  for (const value of [input.headline, input.url, ...input.lines]) {
    if (containsSecret(value)) {
      throw new Error("share card carries a storage key or a backup code");
    }
  }

  const shown = input.lines.slice(0, 5);
  let y = ART_HEIGHT + 96;
  const body = [line(input.headline, y, 52, 800, 1, input.rtl)];
  for (const item of shown) {
    y += 66;
    body.push(line(item, y, 46, 500, 0.94, input.rtl));
  }

  return (
    // `xmlns` is not decoration - without it a browser refuses to decode the
    // document at all, and the `<img>` simply fires `onerror`.
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_SIZE}" height="${CARD_SIZE}"` +
    ` viewBox="0 0 ${CARD_SIZE} ${CARD_SIZE}">` +
    `<rect width="${CARD_SIZE}" height="${CARD_SIZE}" fill="${BAR}"/>` +
    artBlock(input.artId) +
    body.join("") +
    // The URL is always LTR: an address is not prose, and a Hebrew paragraph
    // direction would move its slashes and dots around.
    line(input.url, CARD_SIZE - PAD, 34, 500, 0.7, false, MAX_URL) +
    `</svg>`
  );
}

/**
 * Strip the leading glyph a share MESSAGE carries, because a card must not.
 *
 * Emoji are sanctioned in the text (see `sdk/share.ts` § SEPARATOR) and are a
 * bad idea in the picture: colour-emoji rendering inside an SVG drawn to a
 * canvas is inconsistent across engines, and the failure is a row of tofu
 * boxes in a picture somebody already sent. The card draws `gameArt` instead,
 * which is the same reason the home grid does.
 */
export function emojiFree(item: string): string {
  // Requires the WHITESPACE. Without it the pattern also eats the `+` from the
  // `+3` overflow line, turning "three more games" into "the number three".
  return item.replace(/^[^\p{L}\p{N}]+\s+/u, "").trim() || item.trim();
}
