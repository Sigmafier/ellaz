// The bat at 32 pixels (small-enemy size): purple, wings spread, yellow eyes, two fangs, claws on the ground line.
//
// Painted 2026-09-06 with the craft rules the knight set (see
// docs/pixel-characters.md): native size by role, clusters not dots, one
// light, hue-shifted ramps, its own selective outline. 40 wide x 32 tall,
// feet on the last row. rig32.ts cuts it into parts.

export const BAT32_W = 40;
export const BAT32_H = 32;

export const BAT32_PALETTE: Record<string, string> = {
  O: "#1a1230",
  P: "#9a78d0",
  p: "#6a4aa0",
  q: "#432a6a",
  M: "#563a86",
  m: "#33205a",
  Y: "#ffe680",
  K: "#1a1a2e",
  W: "#ffffff",
  N: "#ff6a8a",
};

export const BAT32_GRID: string[] = [
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "..O............O........O............O..",
  ".OPO..........OPO......OPO..........OMO.",
  ".OPPOO........OPPO....OPqO........OOMMO.",
  ".OPPPPOO......OPPPOOOOPqO.......OOMMMMO.",
  "OMMMpMMMO......OPPPPPPpqO......OMMpMMMMO",
  "OMMMMpppMOO....OPPPPPppqO....OOpppMMMMMO",
  "OMMMMMMMpMMOO..OPPPPpppqO..OOMpMMMMMMMMO",
  "OMMMMMMMMpppMO.OPPPppppqO.OqppMMMMMMMMMO",
  "OMMMMMMMMMMMpMOPPYYppYYqqOqMMMMMMMMMMMMO",
  "OMMMMMMMMMMMMPPPPYKppYKqqqMMMMMMMMMMMMO.",
  ".OMMMMMMMMMMMPPOpppppppqOqMMMMMMMMMMMMO.",
  ".OmmmmmmmppppmmppppNNppqqmqqppmmmmmmmmO.",
  ".OmmmmmppmmmmmmpppWppWpqqmmmmmppmmmmmmO.",
  ".OmmmmOmmmmmmmmppppppppqqmmmmmmmmmmmmmO.",
  ".OmmmO.OmmmmmmmppppppppqqmmmmmmmOOmmmO..",
  "..OmO...OmmmmmOppppppppqqmmmmmmO..OmmO..",
  "...O....OmmmmOOppppppppqqOmmmmmO...OmO..",
  ".........OmmO.OppppppppqqOOmmmO.....O...",
  "..........OO...OpppppppqO..OmO..........",
  "...............OpppppppqO...O...........",
  "................OqqqqqqO................",
  ".................OqqqqO.................",
  "................OqqOOqqO................",
  "................OqqOOqqO................",
  "................OqqOOqqO................",
  "................OqqOOqqO................",
  "...............OqqqOOqqqO...............",
];
