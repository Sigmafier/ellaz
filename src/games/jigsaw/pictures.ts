/**
 * THE PICTURES this jigsaw cuts up, and why they are these eight.
 *
 * They are the key art of other games in this catalogue, which is cheap on
 * purpose - every scene is already drawn, already built from one shared
 * vocabulary, and already in the bundle, so a jigsaw of them costs this game
 * zero new art and zero new bytes.
 *
 * ALL EIGHT COME FROM THE SHELL HALF OF THE ART SPLIT, never the lazy half.
 * `gameArtRest.ts` arrives over the network on browser idle, and a jigsaw whose
 * picture has not landed is not a slow jigsaw - it is eight blank rectangles
 * with nothing to solve. `pictures.test.ts` pins that against `SHELL_ART_COUNT`
 * and the roster's own order, so reordering the roster fails the build naming
 * the picture to change rather than quietly emptying this board.
 *
 * It is its own module, importing NOTHING, so that gate can read it without
 * loading a renderer - and so `logic.ts` can stay the picture-free permutation
 * it is meant to be.
 */
export const PICTURES: readonly string[] = [
  "coloring",
  "finddiff",
  "hidden",
  "memory",
  "snake",
  "sudoku",
  "math",
  "tictactoe",
];
