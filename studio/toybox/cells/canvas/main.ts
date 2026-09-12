// The canvas arm's entry point. It reads the three URL switches the
// tournament drives every cell with, plus `?game=` - the game under
// studio/games/ whose data, assets and tapes this cell plays (fight, the one
// game today, when absent) - and hands control to the one harness; there is
// deliberately nothing else here, because anything a cell's main.ts does is
// work the other arms are not doing.

import { runCell } from "../run-cell";
import { CanvasCell } from "./cell";

const q = new URLSearchParams(location.search);
const game = q.get("game") ?? "fight";

void runCell(new CanvasCell(), {
  root: `../../../games/${game}`,
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
