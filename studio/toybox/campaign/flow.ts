// The campaign layer above the sim: a campaign file is worlds of stages, a
// stage is a fight mode file the engine already plays, and this reducer says
// which screen is up and what purse the next stage starts with. Pure over the
// campaign file and the save - no DOM, no cell, no clock - so every transition
// is a node test (flow.test.ts). shell.ts binds it to a page; save.ts keeps it.
//
// The purse is campaign-wide: a cleared stage's terminal coins, xp and level
// are what the next stage is created with (sim/match.ts createState's carry),
// whichever world it is in. A world is open when it is the first or the one
// before it has been cleared; clearing a world records it once.

import type { Carry } from "../sim/types";

export interface World { id: string; name: string; stages: string[] }
export interface CampaignFile { id: string; worlds: World[] }

/** what a cleared stage hands back: the sim's terminal purse and the tick it cleared on */
export interface StageResult { purse: Carry; ticks: number }

/** the device-local record; `version` guards the shape (save.ts discards a mismatch, never migrates) */
export interface Save { version: number; cleared: string[]; purse: Carry; best: Record<string, number> }

export const SAVE_VERSION = 1;

export type Screen =
  | { kind: "title" }
  | { kind: "pick" }
  | { kind: "stage"; world: string; index: number }
  | { kind: "clear"; world: string; index: number; result: StageResult }
  | { kind: "worldClear"; world: string };

export type Action =
  | { kind: "start" }
  | { kind: "pick"; world: string }
  | { kind: "stageDone"; result: StageResult }
  | { kind: "next" }
  | { kind: "back" };

export interface FlowState { screen: Screen; save: Save }

export function freshSave(): Save {
  return { version: SAVE_VERSION, cleared: [], purse: { coins: 0, xp: 0, level: 1 }, best: {} };
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

/** the purse the next stage is created with */
export const carryFor = (save: Save): Carry => save.purse;

/** the save after a stage cleared: the purse is the run's, the best tick count for that stage only ever falls */
function recordResult(save: Save, stage: string, result: StageResult): Save {
  const best = { ...save.best };
  if (!(stage in best) || result.ticks < best[stage]) best[stage] = result.ticks;
  return { ...save, purse: { ...result.purse }, best };
}

function afterClear(s: FlowState, campaign: CampaignFile, world: string, index: number): FlowState {
  const stages = worldOf(campaign, world).stages;
  if (index + 1 < stages.length) return { ...s, screen: { kind: "stage", world, index: index + 1 } };
  const cleared = s.save.cleared.includes(world) ? s.save.cleared : [...s.save.cleared, world];
  return { screen: { kind: "worldClear", world }, save: { ...s.save, cleared } };
}

export function reduce(s: FlowState, a: Action, campaign: CampaignFile): FlowState {
  const sc = s.screen;
  switch (a.kind) {
    case "start":
      return sc.kind === "title" ? { ...s, screen: { kind: "pick" } } : s;
    case "pick": {
      if (sc.kind !== "pick") return s;
      if (!unlocked(s.save, a.world, campaign)) return s;
      return { ...s, screen: { kind: "stage", world: a.world, index: 0 } };
    }
    case "stageDone": {
      if (sc.kind !== "stage") throw new Error(`campaign: stageDone while the screen is "${sc.kind}", not a stage`);
      const stage = worldOf(campaign, sc.world).stages[sc.index];
      return { screen: { kind: "clear", world: sc.world, index: sc.index, result: a.result }, save: recordResult(s.save, stage, a.result) };
    }
    case "next":
      if (sc.kind === "clear") return afterClear(s, campaign, sc.world, sc.index);
      if (sc.kind === "worldClear") return { ...s, screen: { kind: "pick" } };
      return s;
    case "back":
      if (sc.kind === "clear" || sc.kind === "worldClear") return { ...s, screen: { kind: "pick" } };
      if (sc.kind === "pick") return { ...s, screen: { kind: "title" } };
      return s;
  }
}
