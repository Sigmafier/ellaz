// `bidi-js` ships no types. It is a build-time-only dependency used by
// `src/build/ogCard.ts` to put Hebrew into visual order before it reaches a
// rasteriser that has no bidi algorithm of its own.
declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels): string;
  }
  export default function bidiFactory(): Bidi;
}

// `scripts/indexnow.mjs` is plain Node ESM - it runs in CI with no build step,
// so it cannot be TypeScript. Its two pure functions are unit-tested from
// `src/build/lastmod.test.ts`, which is why they need types here rather than a
// second copy of the logic living under `src/`.
declare module "*/scripts/indexnow.mjs" {
  export interface SitemapEntry {
    loc: string;
    lastmod: string;
  }
  export const INDEXNOW_KEY: string;
  export function parseSitemap(xml: string): SitemapEntry[];
  export function urlsToSubmit(
    entries: SitemapEntry[],
    sinceHours: number,
    now: number,
  ): { urls: string[]; reason: string };
}

// `@shuding/opentype.js` is satori's own fork and ships no types. It is reached
// only from `src/build/ogImages.ts`, to ask a bundled font's cmap whether it has
// a glyph for a character before a card is rasterised.
//
// Deliberately satori's parser rather than a second font library: the question
// is "will the RASTERISER find this glyph", and any other parser could answer it
// differently and be confidently wrong about a card nobody can read.
declare module "@shuding/opentype.js" {
  interface ParsedFont {
    charToGlyphIndex(char: string): number;
  }
  const opentype: { parse(buffer: ArrayBuffer): ParsedFont };
  export default opentype;
}
