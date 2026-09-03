/* The seed every printable sheet is dealt from.
   ===========================================================================

   ONE LABEL, ONE BOARD, FOREVER. A print page is the only page on this site a
   stranger might link to WITHOUT playing anything, and the link people share is
   to a sheet - "the third maze". So sheet 3 has to be the same maze next year.
   `mulberry32(seedFrom(label))` is the repo's own reproducible pair (see
   `src/shared/rng.ts`), and the label is the whole contract: `<kind>:<index>`,
   nothing else in it, no build date and no roster length, because either would
   quietly re-deal every sheet the next time something unrelated moved.

   IT HAS NO RUNTIME CALLER, AND THAT IS THE DESIGN RATHER THAN AN OVERSIGHT.
   The boards live frozen in `sheets.ts`; this module is what they were dealt
   with and what `sheets.test.ts` re-deals them with on every `npm test`. So the
   pair here and the data there are held together by a test that recomputes,
   not by a comment claiming they match. */

import { mulberry32, seedFrom } from "../../shared/rng";

/**
 * The label a sheet is dealt from. `sudoku:0`, `maze:5`.
 *
 * RELATIVE import of `rng.ts` above, not `@shared/rng`, and it is load-bearing
 * rather than a style choice: `vite.config.ts` is bundled by esbuild, which
 * externalises every bare specifier, so an aliased VALUE import anywhere in the
 * page emitter's graph fails the whole config to load. Measured 2026-09-03.
 */
export function printSeed(kind: string, index: number): string {
  if (!kind) throw new Error("printSeed: a sheet needs a kind, or every pack deals the same boards");
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`printSeed: sheet index must be a non-negative integer, got ${String(index)}`);
  }
  return `${kind}:${index}`;
}

/** The generator for one sheet. Same label in, same board out, on any machine. */
export function printRng(kind: string, index: number): () => number {
  return mulberry32(seedFrom(printSeed(kind, index)));
}
