// The game page's entry point: the tournament winner (Phaser 4) on the one
// harness, with live input. The same three URL switches the cells take still
// work here - `?tape=versus-600&fast=1` replays the golden so run-tape.mjs can
// keep admitting this page beside the canvas bar - plus `?stats=1`, which
// prints the harness's own instruments under the stage so the reading the
// plan asks for (distinctDraws 100% on a 120 Hz display) is on the page
// rather than in a devtools console.

import { runCell } from "../cells/run-cell";
import { Phaser4Cell } from "./cell";

interface Stats { stepsPerFrame: number; distinctDraws: number; refresh: number | null; ttffMs: number }

const q = new URLSearchParams(location.search);

function showStats(): void {
  const el = document.getElementById("stats");
  if (!el) return;
  el.hidden = false;
  const w = window as unknown as { __fightStats?: Stats; __fightTicks?: number };
  setInterval(() => {
    const s = w.__fightStats;
    if (!s) return;
    const pct = (s.distinctDraws * 100).toFixed(1);
    el.textContent = `tick ${w.__fightTicks ?? 0} - steps/frame ${s.stepsPerFrame.toFixed(2)} - distinct draws ${pct}% - refresh ${s.refresh ?? "?"} Hz - first frame ${Math.round(s.ttffMs)} ms`;
  }, 500);
}

if (q.get("stats") === "1") showStats();

void runCell(new Phaser4Cell(), {
  root: "..",
  mode: "versus",
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
