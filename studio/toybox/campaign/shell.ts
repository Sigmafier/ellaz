// The campaign shell: flow.ts's reducer bound to a page. It owns three DOM
// panels the page provides (the title, the pick, the card) and, per LEVEL
// screen, builds a fresh cell and runs the game's kind through the one loop,
// with the save's purse as the carry when the kind has one and `until` set to
// the kind's outcome. When the handle's `done` settles it stops the run (the
// cell unmounts, so the page holds ONE canvas) and dispatches stageDone for a
// won level or stageLost for a lost one. Every transition is stored and
// published on window.__fightCampaign for the headless probe; `?trace=1`
// prints one line per transition.
//
// Only the ellaz laws the app itself keeps: a locked level stays pressable
// and answers with a wiggle (never a disabled button); every control is a
// <button>; no text is built with innerHTML.

import type { Cell, SimKind } from "../cells/contract";
import { fightKind } from "../cells/kinds/fight";
import { runCell } from "../cells/run-cell";
import { loadCampaignHttp } from "../cells/shared/assets";
import { carryFor, freshSave, levelUnlocked, reduce, worldOf } from "./flow";
import type { Action, CampaignFile, FlowState, Screen } from "./flow";
import { load, store } from "./save";
import type { Storage } from "./save";

export interface ShellPanels { title: HTMLElement; pick: HTMLElement; card: HTMLElement }

// the kind is any one of the three; its type parameters are the kind's business, not the shell's
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyKind = SimKind<any, any, any, any, { kind: string }>;

export interface ShellOptions {
  /** base URL holding data/ and assets/ (the game's root, ".." from a built page) */
  root: string;
  campaignId: string;
  /** what the title screen says */
  title: string;
  panels: ShellPanels;
  /** a fresh cell per level; the previous one is unmounted before the next is built */
  makeCell: () => Cell;
  /** the game's sim; absent is the fight's */
  kind?: AnyKind;
  storage?: Storage;
  trace?: boolean;
}

/** what every renderer reads: the options, the campaign, the live flow state and the one way to change it */
interface Shell { opts: ShellOptions; kind: AnyKind; campaign: CampaignFile; st: FlowState; dispatch(a: Action): void }

const w = window as unknown as Record<string, unknown>;

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

/** a pressed locked level answers with a wiggle, never a disabled button */
function wiggle(el: HTMLElement): void {
  el.classList.remove("campaign-wiggle");
  void el.offsetWidth;
  el.classList.add("campaign-wiggle");
}

function show(panels: ShellPanels, panel: HTMLElement | null): void {
  for (const p of [panels.title, panels.pick, panels.card]) p.hidden = p !== panel;
}

/** a level's name on its button and its card: the last level of a world is its boss */
const levelName = (index: number, count: number): string => (index + 1 === count ? "BOSS" : `LEVEL ${index + 1}`);

const lastWorld = (campaign: CampaignFile, world: string): boolean => campaign.worlds[campaign.worlds.length - 1].id === world;

function publish(st: FlowState, campaign: CampaignFile): void {
  const sc = st.screen;
  const world = "world" in sc ? sc.world : null;
  const stage = "index" in sc ? worldOf(campaign, sc.world).stages[sc.index] : null;
  const screen = sc.kind === "worldClear" && lastWorld(campaign, sc.world) ? "victory" : sc.kind;
  w.__fightCampaign = { screen, world, stage, purse: { ...st.save.purse }, cleared: [...st.save.cleared], levels: [...st.save.levels], best: { ...st.save.best } };
}

function renderTitle(sh: Shell): void {
  const { save } = sh.st;
  const total = sh.campaign.worlds.reduce((n, wd) => n + wd.stages.length, 0);
  const progress = save.levels.length ? `${save.levels.length} of ${total} levels cleared` : "a new game";
  sh.opts.panels.title.replaceChildren(line(sh.opts.title, "campaign-title"), line(progress), button("START", () => sh.dispatch({ kind: "start" })));
  show(sh.opts.panels, sh.opts.panels.title);
}

function renderPick(sh: Shell): void {
  const { save } = sh.st;
  const rows = sh.campaign.worlds.flatMap((wd) => {
    const head = sh.campaign.worlds.length > 1 ? [line(wd.name, "campaign-line")] : [];
    return [...head, ...wd.stages.map((stage, index) => {
      const open = levelUnlocked(save, wd.id, index, sh.campaign);
      const done = save.levels.includes(stage);
      const label = `${levelName(index, wd.stages.length)}${done ? "  -  cleared" : open ? "" : "  -  locked"}`;
      const b = button(label, () => (open ? sh.dispatch({ kind: "pick", world: wd.id, index }) : wiggle(b)));
      return b;
    })];
  });
  const purse = sh.kind.purse ? [line(`purse: ${save.purse.coins} coins, level ${save.purse.level}`)] : [];
  sh.opts.panels.pick.replaceChildren(line("pick a level", "campaign-title"), ...rows, ...purse, button("BACK", () => sh.dispatch({ kind: "back" }), "campaign-btn campaign-btn-quiet"));
  show(sh.opts.panels, sh.opts.panels.pick);
}

function renderCard(sh: Shell, sc: Extract<Screen, { kind: "clear" | "lost" | "worldClear" }>): void {
  const world = worldOf(sh.campaign, sc.world);
  const quiet = "campaign-btn campaign-btn-quiet";
  const back = button("BACK", () => sh.dispatch({ kind: "back" }), quiet);
  const { card } = sh.opts.panels;
  if (sc.kind === "clear") {
    const count = world.stages.length;
    const last = sc.index + 1 === count;
    const purse = sh.kind.purse ? `${sc.result.purse.coins} coins, level ${sc.result.purse.level}, ` : "";
    card.replaceChildren(
      line(`${levelName(sc.index, count)} CLEAR`, "campaign-title"),
      line(`${purse}${sc.result.ticks} ticks (best ${sh.st.save.best[world.stages[sc.index]]})`),
      button(last ? "FINISH" : "NEXT", () => sh.dispatch({ kind: "next" })),
      back,
    );
  } else if (sc.kind === "lost") {
    card.replaceChildren(line("TRY AGAIN", "campaign-title"), line(levelName(sc.index, world.stages.length)), button("RETRY", () => sh.dispatch({ kind: "retry" })), back);
  } else {
    const victory = lastWorld(sh.campaign, sc.world);
    card.replaceChildren(line(victory ? "VICTORY" : "WORLD CLEAR", "campaign-title"), line(victory ? sh.opts.title : world.name), button("NEXT", () => sh.dispatch({ kind: "next" })));
  }
  show(sh.opts.panels, card);
}

/** one level, one run: a fresh cell through the loop with the purse as the carry (for a kind with a purse), stopped on its outcome */
async function runLevel(sh: Shell, sc: Extract<Screen, { kind: "stage" }>): Promise<void> {
  show(sh.opts.panels, null);
  const { kind } = sh;
  const mode = worldOf(sh.campaign, sc.world).stages[sc.index];
  const carry = kind.purse ? carryFor(sh.st.save) : undefined;
  const handle = await runCell(sh.opts.makeCell(), { root: sh.opts.root, mode, kind, carry, until: (s) => kind.outcome(s) !== null });
  let end: unknown;
  try { end = await handle.done; } finally { handle.stop(); }
  if (kind.outcome(end) === "lost") return sh.dispatch({ kind: "stageLost" });
  const purse = kind.purse ? kind.purse(end) : { ...sh.st.save.purse };
  sh.dispatch({ kind: "stageDone", result: { purse, ticks: kind.tick(end) } });
}

function render(sh: Shell): void {
  const sc = sh.st.screen;
  if (sc.kind === "title") renderTitle(sh);
  else if (sc.kind === "pick") renderPick(sh);
  else if (sc.kind === "stage") void runLevel(sh, sc);
  else renderCard(sh, sc);
}

export async function mountCampaign(opts: ShellOptions): Promise<void> {
  const campaign = await loadCampaignHttp(opts.root, opts.campaignId);
  const sh: Shell = {
    opts,
    kind: opts.kind ?? fightKind,
    campaign,
    st: { screen: { kind: "title" }, save: load(opts.campaignId, opts.storage) },
    dispatch: (a) => {
      sh.st = reduce(sh.st, a, campaign);
      store(opts.campaignId, sh.st.save, opts.storage);
      publish(sh.st, campaign);
      if (opts.trace) console.log(`campaign ${a.kind} -> ${JSON.stringify(sh.st.screen)} levels ${JSON.stringify(sh.st.save.levels)} purse ${JSON.stringify(sh.st.save.purse)}`);
      render(sh);
    },
  };
  if (sh.st.save.version !== freshSave().version) sh.st = { ...sh.st, save: freshSave() };
  publish(sh.st, campaign);
  render(sh);
}
