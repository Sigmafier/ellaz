// The crypt's page: the engine's Phaser cell on the one harness, with live
// input, playing this game's data (../data, ../assets, ../tapes). The one
// mode is `crypt` - three locked rooms joined by a door - and it is the
// default; `?tape=crypt-600&fast=1` replays the golden so run-tape.mjs can
// admit this page beside the canvas bar, and `?stats=1` prints the harness's
// instruments under the stage, as the fight's page does.

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
document.title = `crypt - ${mode}`;
const help = document.getElementById("help-mode");
if (help) help.textContent = "The crypt: clear each room, then walk into the archway when GO shows. Coins and levels are kept when a room restarts.";

void runCell(new Phaser4Cell(), {
  root: "..",
  mode,
  tape: q.get("tape") ?? undefined,
  boxes: q.get("boxes") === "1",
});
