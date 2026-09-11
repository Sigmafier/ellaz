// The kaplay arm's entry point. The same shape as the canvas and phaser arms':
// read the three URL switches the tournament drives every cell with, hand
// control to the one harness, and do nothing else - anything a cell's main.ts
// does is work the other arms are not doing.

import { runCell } from "../run-cell";
import { KaplayCell } from "./cell";

const q = new URLSearchParams(location.search);

void runCell(new KaplayCell(), {
  root: "../..",
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
