// The littlejs arm's entry point. Byte-for-byte the same shape as the canvas
// arm's: read the three URL switches the tournament drives every cell with,
// hand control to the one harness, and do nothing else - anything a cell's
// main.ts does is work the other arms are not doing.

import { runCell } from "../run-cell";
import { LittleJsCell } from "./cell";

const q = new URLSearchParams(location.search);

void runCell(new LittleJsCell(), {
  root: "../..",
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
