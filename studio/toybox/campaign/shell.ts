// The campaign shell: flow.ts's reducer bound to a page. It owns three DOM
// panels the page provides (the title, the pick, the card) and, per STAGE
// screen, builds a fresh cell and runs it through the one loop with the
// save's purse as the carry and `until` set to the stage's clear; when the
// handle's `done` settles it stops the run (the cell unmounts, so the page
// holds ONE canvas) and dispatches stageDone with the terminal purse and tick.
// Every transition is stored and published on window.__fightCampaign for the
// headless probe; `?trace=1` prints one line per transition.
//
// Only the ellaz laws the app itself keeps: a locked world stays pressable
// and answers with a wiggle (never a disabled button); every control is a
// <button>; no text is built with innerHTML.

import type { Cell } from "../cells/contract";
import { runCell } from "../cells/run-cell";
import { loadCampaignHttp } from "../cells/shared/assets";
import type { FightState } from "../sim/types";
import { carryFor, freshSave, reduce, unlocked, worldOf } from "./flow";
import type { Action, CampaignFile, FlowState, Screen } from "./flow";
import { load, store } from "./save";
import type { Storage } from "./save";

export interface ShellPanels { title: HTMLElement; pick: HTMLElement; card: HTMLElement }

export interface ShellOptions {
  /** base URL holding data/ and assets/ (the game's root, "../.." from a built page) */
  root: string;
  campaignId: string;
  /** what the title screen says */
  title: string;
  panels: ShellPanels;
  /** a fresh cell per stage; the previous one is unmounted before the next is built */
  makeCell: () => Cell;
  storage?: Storage;
  trace?: boolean;
}

/** what every renderer reads: the options, the campaign, the live flow state and the one way to change it */
interface Shell { opts: ShellOptions; campaign: CampaignFile; st: FlowState; dispatch(a: Action): void }

const w = window as unknown as Record<string, unknown>;

/** the stage's clear: wphase 2 is the wave machine's terminal state for a cleared stage (sim/stage.ts) */
export const stageCleared = (s: unknown): boolean => (s as FightState).stage?.wphase === 2;

function button(label: string, onClick: () => void, cls = "campaign-btn"): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function line(text: string, cls = "campaign-line"): HTMLElement {
  const p = document.createElement("p");
  p.className = cls;
  p.textContent = text;
  return p;
}

/** a pressed locked world answers with a wiggle, never a disabled button */
function wiggle(el: HTMLElement): void {
  el.classList.remove("campaign-wiggle");
  void el.offsetWidth;
  el.classList.add("campaign-wiggle");
}

function show(panels: ShellPanels, panel: HTMLElement | null): void {
  for (const p of [panels.title, panels.pick, panels.card]) p.hidden = p !== panel;
}

function publish(st: FlowState, campaign: CampaignFile): void {
  const sc = st.screen;
  const world = "world" in sc ? sc.world : null;
  const stage = sc.kind === "stage" || sc.kind === "clear" ? worldOf(campaign, sc.world).stages[sc.index] : null;
  w.__fightCampaign = { screen: sc.kind, world, stage, purse: { ...st.save.purse }, cleared: [...st.save.cleared], best: { ...st.save.best } };
}

function renderTitle(sh: Shell): void {
  const { save } = sh.st;
  const progress = save.cleared.length ? `${save.cleared.length} of ${sh.campaign.worlds.length} worlds cleared` : "a new game";
  sh.opts.panels.title.replaceChildren(line(sh.opts.title, "campaign-title"), line(progress), button("START", () => sh.dispatch({ kind: "start" })));
  show(sh.opts.panels, sh.opts.panels.title);
}

function renderPick(sh: Shell): void {
  const { save } = sh.st;
  const rows = sh.campaign.worlds.map((wd) => {
    const open = unlocked(save, wd.id, sh.campaign);
    const done = save.cleared.includes(wd.id);
    const b = button(`${wd.name}${done ? "  -  cleared" : open ? "" : "  -  locked"}`, () => (open ? sh.dispatch({ kind: "pick", world: wd.id }) : wiggle(b)));
    return b;
  });
  const purse = line(`purse: ${save.purse.coins} coins, level ${save.purse.level}`);
  sh.opts.panels.pick.replaceChildren(line("pick a world", "campaign-title"), ...rows, purse, button("BACK", () => sh.dispatch({ kind: "back" }), "campaign-btn campaign-btn-quiet"));
  show(sh.opts.panels, sh.opts.panels.pick);
}

function renderCard(sh: Shell, sc: Extract<Screen, { kind: "clear" | "worldClear" }>): void {
  const world = worldOf(sh.campaign, sc.world);
  const { card } = sh.opts.panels;
  if (sc.kind === "clear") {
    const stage = world.stages[sc.index];
    const last = sc.index + 1 === world.stages.length;
    card.replaceChildren(
      line("STAGE CLEAR", "campaign-title"),
      line(`${world.name}, stage ${sc.index + 1} of ${world.stages.length}`),
      line(`${sc.result.purse.coins} coins, level ${sc.result.purse.level}, ${sc.result.ticks} ticks (best ${sh.st.save.best[stage]})`),
      button(last ? "WORLD CLEAR" : "NEXT", () => sh.dispatch({ kind: "next" })),
      button("BACK", () => sh.dispatch({ kind: "back" }), "campaign-btn campaign-btn-quiet"),
    );
  } else {
    card.replaceChildren(line("WORLD CLEAR", "campaign-title"), line(world.name), button("NEXT", () => sh.dispatch({ kind: "next" })));
  }
  show(sh.opts.panels, card);
}

/** one stage, one run: a fresh cell through the loop with the purse as the carry, stopped on the clear */
async function runStage(sh: Shell, sc: Extract<Screen, { kind: "stage" }>): Promise<void> {
  show(sh.opts.panels, null);
  const mode = worldOf(sh.campaign, sc.world).stages[sc.index];
  const handle = await runCell(sh.opts.makeCell(), { root: sh.opts.root, mode, carry: carryFor(sh.st.save), until: stageCleared });
  let end: FightState;
  try { end = (await handle.done) as FightState; } finally { handle.stop(); }
  const purse = { coins: end.stage!.coins, xp: end.stage!.xp, level: end.stage!.level };
  sh.dispatch({ kind: "stageDone", result: { purse, ticks: end.tick } });
}

function render(sh: Shell): void {
  const sc = sh.st.screen;
  if (sc.kind === "title") renderTitle(sh);
  else if (sc.kind === "pick") renderPick(sh);
  else if (sc.kind === "stage") void runStage(sh, sc);
  else renderCard(sh, sc);
}

export async function mountCampaign(opts: ShellOptions): Promise<void> {
  const campaign = await loadCampaignHttp(opts.root, opts.campaignId);
  const sh: Shell = {
    opts,
    campaign,
    st: { screen: { kind: "title" }, save: load(opts.campaignId, opts.storage) },
    dispatch: (a) => {
      sh.st = reduce(sh.st, a, campaign);
      store(opts.campaignId, sh.st.save, opts.storage);
      publish(sh.st, campaign);
      if (opts.trace) console.log(`campaign ${a.kind} -> ${JSON.stringify(sh.st.screen)} purse ${JSON.stringify(sh.st.save.purse)}`);
      render(sh);
    },
  };
  if (sh.st.save.version !== freshSave().version) sh.st = { ...sh.st, save: freshSave() };
  publish(sh.st, campaign);
  render(sh);
}
