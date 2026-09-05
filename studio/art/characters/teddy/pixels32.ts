// The angry teddy at 32 pixels (small-enemy size): round head with ears, thick angry brows, a light muzzle and belly, stubby arms, dark feet.
//
// Painted 2026-09-05 with the craft rules the knight set (see
// docs/pixel-characters.md): native size by role, clusters not dots, one
// light, hue-shifted ramps, its own selective outline. 30 wide x 32 tall,
// feet on the last row. rig32.ts cuts it into parts.

export const TEDDY32_W = 30;
export const TEDDY32_H = 32;

export const TEDDY32_PALETTE: Record<string, string> = {
  O: "#1a1230",
  F: "#8a5a2b",
  f: "#d9a06a",
  d: "#5c3a18",
  q: "#3d2510",
  L: "#f0c896",
  K: "#111111",
  W: "#ffffff",
  N: "#2a1a0e",
  D: "#4a2c12",
  E: "#7a4a20",
};

export const TEDDY32_GRID: string[] = [
  "..............................",
  ".....OOOO............OOOO.....",
  "....OFFFFO..OOOOOO..OFFFFO....",
  "...OFFffffOOFFFFFFOOFddddFO...",
  "...OFFffffFFFFFFFFFFFdffdFO...",
  "..OFFfffffFFFFFFFFFFFffffFFO..",
  "...OFFffffFFqqFFFqqFFdffdFO...",
  "...OFFffffFqqqFFFqqqFddddFO...",
  "....OFffffqqFFFFFFFqqddddO....",
  ".....OOfffFKWFFFFFKWFddOO.....",
  "......OFFFFKKFFFFFKKFddO......",
  "......OFFFFFFFFFFFFFFddO......",
  "......OFFFFFLLLLLLFFFddO......",
  "......OFFFFLLLNNNLLFFddO......",
  ".......OFFFLLLLNLLLFFdO.......",
  ".......OFFFLLLLLLLLFFdO.......",
  "........OFFFLLLLLLFFFO........",
  ".........OFFFFFFFFFFO.........",
  ".....OO..OFFFFFFFFFFO..OO.....",
  "....OFFOOFFFFFFFFFFFFOOddO....",
  "...OFFFFFFFFFFLLFFFFFdddddO...",
  "..OFFFFFFFFFLLLLLLFFFddddddO..",
  "...OFFFFFFFLLLLLLLLFddddddO...",
  "....OFFFFFFLLLLLLLLFdddddO....",
  ".....OOFFFFLLLLLLLLddddOO.....",
  ".......OFFFLLLLLLLLdddO.......",
  ".......OFFDDLLLLLLDDddO.......",
  ".......ODDDDDDLLDDDDDDO.......",
  ".......ODEEDDDLLDEDDDDO.......",
  ".......ODDDDDDFFDDDDDDO.......",
  "........OODDOOOOOODDOO........",
  "..........OO......OO..........",
];
