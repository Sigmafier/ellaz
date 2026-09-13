// Ember Hollow Crypt's page: the engine's Phaser cell on the one harness, with
// live input, playing this game's data (../data, ../assets, ../tapes). The one
// mode is `crypt` - the knight in the stone room against four slimes and two
// bats; clear them, the door opens, walk out - and it is the default; the loop
// reads the mode file's `kind` and runs the dungeon sim. `?tape=<name>&fast=1`
// replays a golden so run-tape.mjs can admit this page beside the canvas bar,
// and `?stats=1` prints the harness's instruments under the stage, as the other
// pages do.

import { runCell } from "../../../toybox/cells/run-cell";
import { Phaser4Cell } from "../../../toybox/cells/phaser/cell";

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

const mode = q.get("mode") ?? "crypt";
document.title = `Ember Hollow Crypt - ${mode}`;
const help = document.getElementById("help-mode");
if (help) help.textContent = "Ember Hollow Crypt: one room, six foes. Clear them and the door on the right opens; stand in it to leave.";

void runCell(new Phaser4Cell(), {
  root: "..",
  mode,
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
