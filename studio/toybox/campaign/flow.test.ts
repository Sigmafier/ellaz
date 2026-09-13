// The campaign flow is a pure reducer over a campaign file and a save: which
// screen is up, which level is open, what purse the next level starts with.
// Nothing here touches a DOM or a cell, so every transition is a node test with
// a control beside it - a locked level stays locked, a lost level keeps what
// was cleared, a world is cleared once, a slower run never lowers a best.

import { carryFor, freshSave, levelUnlocked, reduce, SAVE_VERSION, unlocked } from "./flow";
import type { CampaignFile, FlowState, StageResult } from "./flow";

const CAMPAIGN: CampaignFile = {
  id: "brawl",
  worlds: [
    { id: "toybox", name: "The Toybox", stages: ["stage", "toybox-2", "toybox-3", "toybox-boss"] },
    { id: "shelf", name: "The Shelf", stages: ["shelf-1", "shelf-2", "shelf-boss"] },
  ],
};

const start = (): FlowState => ({ screen: { kind: "title" }, save: freshSave() });
const result = (coins: number, ticks: number): StageResult => ({ purse: { coins, xp: coins * 3, level: 1 + Math.floor(coins / 4) }, ticks });
const atPick = (): FlowState => reduce(start(), { kind: "start" }, CAMPAIGN);
const pick = (s: FlowState, world: string, index: number): FlowState => reduce(s, { kind: "pick", world, index }, CAMPAIGN);

/** walk one world to its end: pick level 0, then stageDone + next through every level */
function clearWorld(s: FlowState, world: string, ticks = 1000): FlowState {
  s = pick(s, world, 0);
  const stages = CAMPAIGN.worlds.find((w) => w.id === world)!.stages.length;
  for (let i = 0; i < stages; i++) {
    s = reduce(s, { kind: "stageDone", result: result(4 * (i + 1), ticks) }, CAMPAIGN);
    s = reduce(s, { kind: "next" }, CAMPAIGN);
  }
  return s;
}

describe("the title and the level pick", () => {
  it("opens on the title; start goes to the pick", () => {
    expect(atPick().screen).toEqual({ kind: "pick" });
  });

  it("the save carries a version the save file checks, and a fresh save has cleared no level", () => {
    expect(freshSave().version).toBe(SAVE_VERSION);
    expect(freshSave().levels).toEqual([]);
  });

  it("on a fresh save only the first world's first level is open (control: its second level is locked)", () => {
    const save = freshSave();
    expect(levelUnlocked(save, "toybox", 0, CAMPAIGN)).toBe(true);
    expect(levelUnlocked(save, "toybox", 1, CAMPAIGN)).toBe(false);
    expect(levelUnlocked(save, "shelf", 0, CAMPAIGN)).toBe(false);
  });

  it("picking a locked level is a no-op; once the level before it is cleared it opens", () => {
    let s = atPick();
    expect(pick(s, "toybox", 1)).toEqual(s);
    s = reduce(pick(s, "toybox", 0), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    s = reduce(s, { kind: "back" }, CAMPAIGN);
    expect(s.save.levels).toEqual(["stage"]);
    expect(pick(s, "toybox", 1).screen).toEqual({ kind: "stage", world: "toybox", index: 1 });
  });

  it("the boss level opens only after all three levels before it (control: two cleared keeps it locked)", () => {
    let s = atPick();
    for (let i = 0; i < 2; i++) s = reduce(reduce(pick(s, "toybox", i), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN), { kind: "back" }, CAMPAIGN);
    expect(levelUnlocked(s.save, "toybox", 3, CAMPAIGN)).toBe(false);
    s = reduce(reduce(pick(s, "toybox", 2), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN), { kind: "back" }, CAMPAIGN);
    expect(levelUnlocked(s.save, "toybox", 3, CAMPAIGN)).toBe(true);
  });

  it("a cleared level stays pressable and replays", () => {
    let s = reduce(reduce(pick(atPick(), "toybox", 0), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN), { kind: "back" }, CAMPAIGN);
    s = pick(s, "toybox", 0);
    expect(s.screen).toEqual({ kind: "stage", world: "toybox", index: 0 });
  });

  it("a pick of a world the campaign does not have, or a level past its end, is refused naming it", () => {
    expect(() => pick(atPick(), "attic", 0)).toThrow(/attic/);
    expect(() => pick(atPick(), "toybox", 4)).toThrow(/toybox.*4/);
  });

  it("picking an open level starts it with the save's purse as the carry", () => {
    const s = pick(atPick(), "toybox", 0);
    expect(carryFor(s.save)).toEqual({ coins: 0, xp: 0, level: 1 });
  });
});

describe("a level's end", () => {
  const atStage = (): FlowState => pick(atPick(), "toybox", 0);

  it("stageDone shows the card, records the level as cleared, and the purse is the run's terminal purse", () => {
    const s = reduce(atStage(), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "clear", world: "toybox", index: 0, result: result(4, 900) });
    expect(s.save.purse).toEqual(result(4, 900).purse);
    expect(s.save.levels).toEqual(["stage"]);
  });

  it("clearing a level twice records it once", () => {
    let s = reduce(atStage(), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    s = reduce(pick(reduce(s, { kind: "back" }, CAMPAIGN), "toybox", 0), { kind: "stageDone", result: result(4, 800) }, CAMPAIGN);
    expect(s.save.levels).toEqual(["stage"]);
  });

  it("next from the card carries the purse into the next level of the world", () => {
    let s = reduce(atStage(), { kind: "stageDone", result: result(7, 900) }, CAMPAIGN);
    s = reduce(s, { kind: "next" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "stage", world: "toybox", index: 1 });
    expect(carryFor(s.save)).toEqual(result(7, 900).purse);
  });

  it("back from the card returns to the pick and keeps the save", () => {
    let s = reduce(atStage(), { kind: "stageDone", result: result(7, 900) }, CAMPAIGN);
    s = reduce(s, { kind: "back" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
    expect(s.save.purse).toEqual(result(7, 900).purse);
    expect(s.save.best.stage).toBe(900);
  });

  it("best[level] keeps the lower tick count (control: a slower run does not lower it)", () => {
    let s = reduce(atStage(), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    s = reduce(pick(reduce(s, { kind: "back" }, CAMPAIGN), "toybox", 0), { kind: "stageDone", result: result(4, 1200) }, CAMPAIGN);
    expect(s.save.best.stage).toBe(900);
    s = reduce(pick(reduce(s, { kind: "back" }, CAMPAIGN), "toybox", 0), { kind: "stageDone", result: result(4, 600) }, CAMPAIGN);
    expect(s.save.best.stage).toBe(600);
  });

  it("stageDone anywhere but a level is refused", () => {
    expect(() => reduce(start(), { kind: "stageDone", result: result(1, 1) }, CAMPAIGN)).toThrow(/stageDone/);
  });
});

describe("a lost level", () => {
  /** clear levels 0 and 1, then start level 2 */
  function atThirdLevel(): FlowState {
    const s: FlowState = { screen: { kind: "pick" }, save: { ...freshSave(), levels: ["stage", "toybox-2"], purse: { coins: 9, xp: 27, level: 3 } } };
    return pick(s, "toybox", 2);
  }

  it("stageLost shows the TRY AGAIN card and changes nothing in the save (control: cleared levels and purse kept)", () => {
    const before = atThirdLevel();
    const s = reduce(before, { kind: "stageLost" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "lost", world: "toybox", index: 2 });
    expect(s.save).toEqual(before.save);
  });

  it("retry starts the SAME level with the purse it started with (control: never level 0)", () => {
    const before = atThirdLevel();
    const s = reduce(reduce(before, { kind: "stageLost" }, CAMPAIGN), { kind: "retry" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "stage", world: "toybox", index: 2 });
    expect(carryFor(s.save)).toEqual({ coins: 9, xp: 27, level: 3 });
  });

  it("back from TRY AGAIN is the pick", () => {
    const s = reduce(reduce(atThirdLevel(), { kind: "stageLost" }, CAMPAIGN), { kind: "back" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
  });

  it("stageLost anywhere but a level is refused; retry anywhere but TRY AGAIN is a no-op", () => {
    expect(() => reduce(atPick(), { kind: "stageLost" }, CAMPAIGN)).toThrow(/stageLost/);
    const s = atPick();
    expect(reduce(s, { kind: "retry" }, CAMPAIGN)).toEqual(s);
  });
});

describe("a world's end", () => {
  it("next from the last level's card is the world's end, and cleared gains the world once", () => {
    let s = clearWorld(atPick(), "toybox");
    expect(s.screen).toEqual({ kind: "worldClear", world: "toybox" });
    expect(s.save.cleared).toEqual(["toybox"]);
    s = clearWorld(reduce(s, { kind: "next" }, CAMPAIGN), "toybox");
    expect(s.save.cleared).toEqual(["toybox"]);
  });

  it("next from the world's end is the pick, with the next world's first level open", () => {
    const s = reduce(clearWorld(atPick(), "toybox"), { kind: "next" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
    expect(unlocked(s.save, "shelf", CAMPAIGN)).toBe(true);
    expect(levelUnlocked(s.save, "shelf", 0, CAMPAIGN)).toBe(true);
  });

  it("edge: NEXT pressed twice moves once", () => {
    let s = reduce(pick(atPick(), "toybox", 0), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    const once = reduce(s, { kind: "next" }, CAMPAIGN);
    expect(once.screen).toEqual({ kind: "stage", world: "toybox", index: 1 });
    expect(reduce(once, { kind: "next" }, CAMPAIGN)).toEqual(once);
    s = reduce(clearWorld(atPick(), "toybox"), { kind: "next" }, CAMPAIGN);
    expect(reduce(s, { kind: "next" }, CAMPAIGN)).toEqual(s);
  });

  it("edge: a save naming a world or level the campaign no longer has unlocks nothing and throws nowhere", () => {
    const save = { ...freshSave(), cleared: ["attic"], levels: ["attic-1"] };
    expect(levelUnlocked(save, "toybox", 1, CAMPAIGN)).toBe(false);
    expect(levelUnlocked(save, "shelf", 0, CAMPAIGN)).toBe(false);
  });
});
