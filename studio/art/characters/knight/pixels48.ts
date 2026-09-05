// The knight drawn AT 48 pixels, by hand, as palette-indexed pixel strings.
//
// Bake-off arm A (2026-09-05). The scene-DSL knight is ~10 rectangles and
// circles, and every pixel style so far was a filter over that; the operator
// called all thirteen "pretty bad". This file is the other route: pixels
// placed on purpose at native resolution, following the craft rules the
// research pass collected (Pixel Logic, Saint11) - silhouette first, clusters
// not dots, one light from upper-left, hue-shifted three-tone ramps, a
// selective outline that stays dark on the shadow side, controlled diagonals.
//
// 36 wide x 52 tall. The BODY is 48 rows (plume top at row 4 (the two blade-only rows above it are 2-3), boot sole at
// row 51); the raised blade climbs into rows 0-3. Feet at (0, 0) like every
// other technique. Row composition is left | torso | right so the three
// columns can be read and edited separately; the test asserts every row is
// exactly 36 and every character is in the palette.

import { type Op } from "../../scene-ops";
import { gridToOps } from "../../techniques/pixel-strings";

export const KNIGHT48_W = 36;
export const KNIGHT48_H = 52;

/** Hue-shifted ramps: light steps warm and pale, shadow steps cool and deep. */
export const KNIGHT48_PALETTE: Record<string, string> = {
  O: "#1a1230", // outline ink (indigo, never pure black)
  P: "#e4eaf4", // plate light
  p: "#b4bed0", // plate mid
  q: "#7c86a0", // plate shadow
  Q: "#4e5670", // plate deep (under the arm, gauntlet)
  C: "#e0407a", // cape light
  c: "#c2185b", // cape mid
  x: "#7a1040", // cape shadow
  S: "#5e86ff", // shield light
  s: "#2b5cff", // shield mid
  z: "#1b3ab0", // shield shadow
  G: "#ffe680", // gold light
  g: "#ffd23f", // gold mid
  h: "#c9932a", // gold shadow
  B: "#f4f8ff", // blade edge
  b: "#c8d2e6", // blade flat
  F: "#ffd9b3", // skin
  f: "#d9a87a", // skin shadow
  K: "#1a1a2e", // eye
  M: "#ff4d8d", // plume
  V: "#6c7890", // greave
  v: "#3e4870", // greave shadow
  T: "#2a2438", // boot
  t: "#4a4260", // boot light
};

// Rows 0-18: plume, blade tip, helm. Written whole.
const HEAD: string[] = [
  ".............................O......",
  "............................OBO.....",
  "............................OBbO....",
  "............................OBbO....",
  "..............OMMO..........OBbO....",
  ".............OMMcMO.........OBbO....",
  "............OOPPPPOO........OBbO....",
  "...........OPPPPpppqO.......OBbO....",
  "..........OPPPPppppqqO......OBbO....",
  "..........OPPPpppppqqO......OBbO....",
  "..........OPpppppppqqO......OBbO....",
  "..........OpOOOOOOOOqO......OBbO....",
  "..........OpOFFKFFFKfO......OBbO....",
  "..........OpOffffffffO......OBbO....",
  "..........OpqOOOOOOOqO......OBbO....",
  "..........OppppppqqqqO......OBbO....",
  "...........OpppppqqqO.......OBbO....",
  "............OOppqqOO........OBbO....",
  "...........OOOpqOOO.........OBbO....",
];

// Rows 19-51 as three columns: left (10) | torso (13) | right (13).
const LEFT: string[] = [
  "......OCCO", // 19 cape over the shoulder
  ".....OCCcO",
  ".....OCCcO",
  "...OOOO...", // 22 shield, seen slightly from the side
  ".OOSSSSOO.",
  "OSSSSSssO.",
  "OSSSsssszO",
  "OSSGGgsszO",
  "OSGGGgsszO",
  "OSGGghsszO",
  "OSSGhhsszO",
  "OSssssszzO",
  "OsssszzzzO",
  ".OssszzzO.",
  ".OOzzzzOO.",
  "...OOOO...", // 34
  "...OCccxO.", // 35 the cape falls behind the legs
  "....OCcxO.",
  "....OCcxO.",
  ".....OcxO.",
  ".....OcxO.",
  ".....OcxO.",
  "......OxO.",
  "......OxO.",
  ".......OO.",
  "..........", // 44
  "..........",
  "..........",
  "..........",
  "..........",
  "..........",
  "..........",
  "..........", // 51
];

const TORSO: string[] = [
  "OpPPPPppppqqO", // 19 gorget and chest, lit from the left
  "OpPPPPppppqqO",
  "OpPPPPppppqqO",
  "OpPPPpppppqqO",
  "OpPPPpppppqqO",
  "OppPPpppppqqO",
  "OppPPpppppqqO",
  "OppPPpppppqqO",
  "OppPPpppppqqO",
  "OppPpppppqqqO",
  "OpppppppqqqqO",
  "OhGGGGhhhhhhO", // 30 belt
  "OqhhhhhhhhhqO",
  "OqpppppqqqqqO", // 32 fauld
  "OqpppppqqqqqO",
  "OqqppppqqqqQO",
  "OOqqqqqqqqQOO", // 35
  ".OVVvO.OVVvO.", // 36 greaves
  ".OVVvO.OVVvO.",
  ".OVVvO.OVVvO.",
  ".OVVvO.OVVvO.",
  ".OVvvO.OVvvO.", // 40 knee
  ".OVVvO.OVVvO.",
  ".OVVvO.OVVvO.",
  ".OVVvO.OVVvO.",
  ".OVVvO.OVVvO.",
  ".OVvvO.OVvvO.",
  ".OvvvO.OvvvO.", // 46
  ".OTTtO.OTTtO.", // 47 boots
  "OTTTtO.OTTTtO",
  "OtTTtO.OtTTtO",
  "OtTTTOOOtTTTO",
  ".OOOOO.OOOOO.", // 51
];

const RIGHT: string[] = [
  "ppqO.OBbO....", // 19 pauldron, the blade beside it
  "pqqO.OBbO....",
  "pqqO.OBbO....",
  "OqqO.OBbO....", // 22 upper arm reaching down to the grip
  "OqqOGggggGO..", // 23 cross-guard
  ".OqOhhhhhhO..",
  "..OqQQQhO....", // 25 gauntlet on the hilt
  "...OQQQhO....",
  "....OOOGGO...", // 27 pommel
  ".........OO..",
  "cxO..........", // 29 cape's far edge
  "cxO..........",
  "cxO..........",
  "cxO..........",
  "cxO..........",
  "cxO..........",
  "cxO..........",
  "cxO..........", // 36
  "xO...........",
  "xO...........",
  "O............",
  ".............", // 40
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............", // 51
];

export const KNIGHT48_GRID: string[] = [
  ...HEAD,
  ...LEFT.map((l, i) => l + TORSO[i] + RIGHT[i]),
];

/** The 48px knight as ops, `cell` scene units per pixel, feet at (0, 0). */
export const knight48Ops = (cell = 1): Op[] => gridToOps(KNIGHT48_GRID, KNIGHT48_PALETTE, cell);
