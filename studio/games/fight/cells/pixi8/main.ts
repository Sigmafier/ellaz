// The pixi8 arm's entry point. Byte-for-byte the same job as the canvas
// arm's: read the three URL switches the tournament drives every cell with
// and hand control to the one harness. Anything else here would be work the
// other arms are not doing.

import { runCell } from "../run-cell";
import { Pixi8Cell } from "./cell";

const q = new URLSearchParams(location.search);

void runCell(new Pixi8Cell(), {
  root: "../..",
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
