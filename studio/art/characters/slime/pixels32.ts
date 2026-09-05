// The slime at 32 pixels (small-enemy size): a wide green blob lit from the upper-left, a shine, two eyes with a glint, a small mouth, a drip at each side.
//
// Painted 2026-09-05 with the craft rules the knight set (see
// docs/pixel-characters.md): native size by role, clusters not dots, one
// light, hue-shifted ramps, its own selective outline. 40 wide x 32 tall,
// feet on the last row. rig32.ts cuts it into parts.

export const SLIME32_W = 40;
export const SLIME32_H = 32;

export const SLIME32_PALETTE: Record<string, string> = {
  O: "#1a1230",
  G: "#5fcf3a",
  g: "#7ee04a",
  D: "#3e9a26",
  Q: "#2d6b1b",
  S: "#c8ffb0",
  K: "#111111",
  W: "#ffffff",
  M: "#1f4f12",
};

export const SLIME32_GRID: string[] = [
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "........................................",
  "...............OOOOOOOOOO...............",
  "...........OOOOGGGGGGGGGGOOOO...........",
  ".........OOGggggggggggggggGGGOO.........",
  ".......OOgSSSSgggggggggggggggGGOO.......",
  "......OGgSSSSSSgggggggggggggggGGGO......",
  ".....OGgggSSSSgggggggggggggggggGGGO.....",
  "....OGgggSggggggggggggggggggggggGGGO....",
  "...OGggggggggggggggggggggggggggggGGGO...",
  "..OGGggggggggWKKgggggggggWKKgggggGGGDO..",
  "..OGGggggggggKKKgggggggggKKKgggggGGDDO..",
  "..OGGggggggggKKKgggggggggKKKgggggGDDDO..",
  ".OGGGGggggggggggggggggggggggggggGDDDDDO.",
  "..OGGGGggggggggggggggggggggggggDDDDDDO..",
  "..OGGGGGggggggggggggggggggggggDDDDDDDO..",
  "..OGGGGGGgggggggggMMMMMggggggDDDDDDDDO..",
  "..OOGGGGGGGGgggggggMMMggggGGDDDDDDDDO...",
  ".OggggGGGGGGGGGGGGGGGGGGGGGDDDDDDDDOO...",
  "OggggggGGGGGGGGGGGGGGGGGGDDDDDDDDDOOgO..",
  "OggggggGGGGGGGGGGGGGGGGGDDDDDDDDDOggggO.",
  "OggggggOOGGGGGGGGGGGGGGDDDDDDDDOOOggggO.",
  ".OggggO..OOGGGGGGGGGQQQQQQQQQQQO.OggggO.",
  "..OOOO.....OOOOGGGGGQQQQQQQQQQQO..OOOO..",
  "...............OOOOOOOOOOOOOOOO.........",
];
