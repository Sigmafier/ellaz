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
