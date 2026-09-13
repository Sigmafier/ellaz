// The campaign layer above the sim: a campaign file is worlds of levels, a
// level is a mode file the engine already plays (a fight stage, a turn battle,
// a dungeon room), and this reducer says which screen is up, which level is
// open and what purse the next level starts with. Pure over the campaign file
// and the save - no DOM, no cell, no clock - so every transition is a node test
// (flow.test.ts). shell.ts binds it to a page; save.ts keeps it.
//
// A level is open when it is its world's first and the world is open, or the
// level before it is cleared; a world is open when it is the first or the one
// before it is cleared. A won level records itself and the run's terminal
// purse; a lost level changes nothing, so TRY AGAIN starts the same level with
// the purse it started with. The purse is campaign-wide and only the fight's
// kinds read it (sim/match.ts createState's carry).

import type { Carry } from "../sim/types";

export interface World { id: string; name: string; stages: string[] }
export interface CampaignFile { id: string; worlds: World[] }

/** what a won level hands back: the sim's terminal purse (the carry unchanged for a kind with none) and the tick it ended on */
export interface StageResult { purse: Carry; ticks: number }

/** the device-local record; `version` guards the shape (save.ts discards a mismatch, never migrates) */
export interface Save { version: number; cleared: string[]; levels: string[]; purse: Carry; best: Record<string, number> }

/** 2 since 2026-09-13: `levels` joined the record when a campaign became three levels and a boss */
export const SAVE_VERSION = 2;

export type Screen =
  | { kind: "title" }
  | { kind: "pick" }
  | { kind: "stage"; world: string; index: number }
  | { kind: "clear"; world: string; index: number; result: StageResult }
  | { kind: "lost"; world: string; index: number }
  | { kind: "worldClear"; world: string };

export type Action =
  | { kind: "start" }
  | { kind: "pick"; world: string; index: number }
  | { kind: "stageDone"; result: StageResult }
  | { kind: "stageLost" }
  | { kind: "retry" }
  | { kind: "next" }
  | { kind: "back" };

export interface FlowState { screen: Screen; save: Save }

export function freshSave(): Save {
  return { version: SAVE_VERSION, cleared: [], levels: [], purse: { coins: 0, xp: 0, level: 1 }, best: {} };
}

/** the world by id; a campaign that has no such world is refused naming it */
export function worldOf(campaign: CampaignFile, id: string): World {
  const w = campaign.worlds.find((x) => x.id === id);
  if (!w) throw new Error(`campaign "${campaign.id}" has no world "${id}" (it has ${campaign.worlds.map((x) => x.id).join(", ")})`);
  return w;
}

/** a world is open when it is the campaign's first, or the world before it is cleared */
export function unlocked(save: Save, world: string, campaign: CampaignFile): boolean {
  const i = campaign.worlds.findIndex((w) => w.id === world);
  if (i < 0) throw new Error(`campaign "${campaign.id}" has no world "${world}"`);
  return i === 0 || save.cleared.includes(campaign.worlds[i - 1].id);
}

/** a level is open when its world is open and it is the first, or the level before it is cleared */
export function levelUnlocked(save: Save, world: string, index: number, campaign: CampaignFile): boolean {
  const stages = worldOf(campaign, world).stages;
  if (!Number.isInteger(index) || index < 0 || index >= stages.length) {
    throw new Error(`campaign "${campaign.id}" world "${world}" has no level ${index} (it has ${stages.length})`);
  }
  if (!unlocked(save, world, campaign)) return false;
  return index === 0 || save.levels.includes(stages[index - 1]);
}

/** the purse the next level is created with */
export const carryFor = (save: Save): Carry => save.purse;

/** the save after a won level: the level recorded once, the purse is the run's, the best tick count only ever falls */
function recordResult(save: Save, stage: string, result: StageResult): Save {
  const best = { ...save.best };
  if (!(stage in best) || result.ticks < best[stage]) best[stage] = result.ticks;
  const levels = save.levels.includes(stage) ? save.levels : [...save.levels, stage];
  return { ...save, levels, purse: { ...result.purse }, best };
}

function afterClear(s: FlowState, campaign: CampaignFile, world: string, index: number): FlowState {
  const stages = worldOf(campaign, world).stages;
  if (index + 1 < stages.length) return { ...s, screen: { kind: "stage", world, index: index + 1 } };
  const cleared = s.save.cleared.includes(world) ? s.save.cleared : [...s.save.cleared, world];
  return { screen: { kind: "worldClear", world }, save: { ...s.save, cleared } };
}

function onPick(s: FlowState, a: Extract<Action, { kind: "pick" }>, campaign: CampaignFile): FlowState {
  if (s.screen.kind !== "pick") return s;
  if (!levelUnlocked(s.save, a.world, a.index, campaign)) return s;
  return { ...s, screen: { kind: "stage", world: a.world, index: a.index } };
}

export function reduce(s: FlowState, a: Action, campaign: CampaignFile): FlowState {
  const sc = s.screen;
  switch (a.kind) {
    case "start":
      return sc.kind === "title" ? { ...s, screen: { kind: "pick" } } : s;
    case "pick":
      return onPick(s, a, campaign);
    case "stageDone": {
      if (sc.kind !== "stage") throw new Error(`campaign: stageDone while the screen is "${sc.kind}", not a level`);
      const stage = worldOf(campaign, sc.world).stages[sc.index];
      return { screen: { kind: "clear", world: sc.world, index: sc.index, result: a.result }, save: recordResult(s.save, stage, a.result) };
    }
    case "stageLost":
      if (sc.kind !== "stage") throw new Error(`campaign: stageLost while the screen is "${sc.kind}", not a level`);
      return { ...s, screen: { kind: "lost", world: sc.world, index: sc.index } };
    case "retry":
      return sc.kind === "lost" ? { ...s, screen: { kind: "stage", world: sc.world, index: sc.index } } : s;
    case "next":
      if (sc.kind === "clear") return afterClear(s, campaign, sc.world, sc.index);
      if (sc.kind === "worldClear") return { ...s, screen: { kind: "pick" } };
      return s;
    case "back":
      if (sc.kind === "clear" || sc.kind === "worldClear" || sc.kind === "lost") return { ...s, screen: { kind: "pick" } };
      if (sc.kind === "pick") return { ...s, screen: { kind: "title" } };
      return s;
  }
}
