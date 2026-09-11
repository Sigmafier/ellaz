// The canvas arm's entry point. It reads the three URL switches the
// tournament drives every cell with and hands control to the one harness;
// there is deliberately nothing else here, because anything a cell's main.ts
// does is work the other arms are not doing.

import { runCell } from "../run-cell";
import { CanvasCell } from "./cell";

const q = new URLSearchParams(location.search);

void runCell(new CanvasCell(), {
  root: "../..",
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
