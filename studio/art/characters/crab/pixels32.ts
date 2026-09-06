// The crab at 32 pixels (small-enemy size): a wide orange shell lit from the upper-left, eyes on stalks, two claws, three legs a side.
//
// Painted 2026-09-06 with the craft rules the knight set (see
// docs/pixel-characters.md): native size by role, clusters not dots, one
// light, hue-shifted ramps, its own selective outline. 40 wide x 32 tall,
// feet on the last row. rig32.ts cuts it into parts.

export const CRAB32_W = 40;
export const CRAB32_H = 32;

export const CRAB32_PALETTE: Record<string, string> = {
  O: "#1a1230",
  R: "#ff8a5a",
  r: "#f0503a",
  d: "#b02a1e",
  q: "#6e1410",
  K: "#1a1a2e",
  W: "#ffffff",
  Y: "#ffe0a0",
};

export const CRAB32_GRID: string[] = [
  "........................................",
  "........................................",
  "...............OO........OO.............",
  "..............OWWO......OWWO............",
  ".............OWWWWO....OWWWWO...........",
  ".............OWWKWO....OWWKWO...........",
  ".....O.......OWKKWO....OWKKWO.....O.....",
  "....ORO.......OWWO......OWWO.....ORO....",
  "...ORRRO......ORdO......ORdO....ORRRO...",
  "..OrrrrrO.....OrrO......OrrO...OrrrrrO..",
  "...ORRRO......OrdO......OrdO....OrrrO...",
  "...OOROO......OrrOOOOOOOOrrO....OOrOO...",
  "..ORRRRRO...OORRRRRRRRRRRROO...ORRRRRO..",
  ".ORRRRRRROOORRRRRRRRRRRRRrrrOOORRRRRRRO.",
  "OrrrrrrrrrRRRRRRRRRRRRRRrrrrrrrrrrrrrrrO",
  "OrrrrrrrrrRRRRRRRRRRRRrrrrrrrrrrrrrOOOO.",
  "OrrrrrrrrrRRRRRRRRRRrrrrrrrrrrrrrrrOOOO.",
  "OrrrrrrrrrrRRRRRRRRrrrrrrrrrrrrrrrrrrrrO",
  ".OrrrrrrrrrRRRRRRrrrrrrrrrrrrrrrrrrrrrO.",
  "..OdddddRrrRRRRrrrrrrrrrrrrrrrrddddddO..",
  "...OOOOORRRRRRrrrrrrrrrrrrrrddddOOOOO...",
  ".......ORRRRrrrrqrrrrrrrqrddddddO.......",
  "........ORdrrrrrrqqqqqqqdddddddO........",
  "........OOrrrrrrrrrrrrddddddddOO........",
  ".......OddOOrrrrrrrrddddddddOOddO.......",
  ".......OddOOOOrrrrqqqqqqqqOOOOddO.......",
  "......OddOddOOOOOOOOOOOOOOOOddOddO......",
  "......OddOddOddO........OddOddOddO......",
  ".....OddOddOOddO........OddOddOddO......",
  ".....OddOddOddO.........OddOOddddO......",
  "....OqqOqqOOqqO.........OqqOOqqOqqO.....",
  "....OqqOqqOOqqO.........OqqOOqqOqqO.....",
];
