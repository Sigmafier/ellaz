// The game page's entry point: the tournament winner (Phaser 4) on the one
// harness, with live input. `?mode=stage` plays the side-scrolling wave run,
// `?mode=versus` (the default) the one-screen match. The same three URL
// switches the cells take still work here - `?tape=versus-600&fast=1` replays
// a golden (a tape names its own mode) so run-tape.mjs can keep admitting this
// page beside the canvas bar - plus `?stats=1`, which prints the harness's own
// instruments under the stage so the reading the plan asks for (distinctDraws
// 100% on a 120 Hz display) is on the page rather than in a devtools console.
//
// `?campaign=brawl` (2026-09-13) mounts the campaign shell instead: a title, a
// pick of worlds, one stage after another through the same loop, a clear
// card, and a device-local save. A tape always wins over a campaign, because a
// tape is the admission instrument and names its own mode.

import { mountCampaign } from "../../../toybox/campaign/shell";
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

const campaign = q.get("tape") ? null : q.get("campaign");
const mode = q.get("mode") ?? "versus";
document.title = campaign ? `fight - ${campaign}` : `fight - ${mode}`;
const help = document.getElementById("help-mode");
if (help) {
  help.textContent = campaign ? "Campaign: clear every stage of a world to open the next. Coins and levels carry from stage to stage and are saved on this device."
    : mode === "stage" ? "Stage: clear each wave, then walk right when GO shows. Coins and levels are kept when a wave restarts." : "Versus: one match, best of one.";
}

const panel = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`fight page: no #${id} for the campaign shell`);
  return el;
};

if (campaign) {
  void mountCampaign({
    root: "..",
    campaignId: campaign,
    title: "Toybox Brawl",
    panels: { title: panel("campaign-title"), pick: panel("campaign-pick"), card: panel("campaign-card") },
    makeCell: () => new Phaser4Cell(),
    trace: q.get("trace") === "1",
  });
} else {
  void runCell(new Phaser4Cell(), {
    root: "..",
    mode,
    tape: q.get("tape") ?? undefined,
    boxes: q.get("boxes") === "1",
  });
}
