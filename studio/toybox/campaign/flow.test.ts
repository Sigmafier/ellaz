// The campaign flow is a pure reducer over a campaign file and a save: which
// screen is up, which world is open, what purse the next stage starts with.
// Nothing here touches a DOM or a cell, so every transition is a node test with
// a control beside it - a locked world stays locked, a world is cleared once,
// a slower run never lowers a best.

import { carryFor, freshSave, reduce, unlocked } from "./flow";
import type { CampaignFile, FlowState, StageResult } from "./flow";

const CAMPAIGN: CampaignFile = {
  id: "brawl",
  worlds: [
    { id: "toybox", name: "The Toybox", stages: ["stage", "toybox-2", "toybox-3"] },
    { id: "shelf", name: "The Shelf", stages: ["shelf-1", "shelf-2", "shelf-boss"] },
  ],
};

const start = (): FlowState => ({ screen: { kind: "title" }, save: freshSave() });
const result = (coins: number, ticks: number): StageResult => ({ purse: { coins, xp: coins * 3, level: 1 + Math.floor(coins / 4) }, ticks });

/** walk one world to its clear: pick it, then stageDone + next through every stage */
function clearWorld(s: FlowState, world: string, ticks = 1000): FlowState {
  s = reduce(s, { kind: "pick", world }, CAMPAIGN);
  const stages = CAMPAIGN.worlds.find((w) => w.id === world)!.stages.length;
  for (let i = 0; i < stages; i++) {
    s = reduce(s, { kind: "stageDone", result: result(4 * (i + 1), ticks) }, CAMPAIGN);
    s = reduce(s, { kind: "next" }, CAMPAIGN);
  }
  return s;
}

describe("the title and the pick", () => {
  it("opens on the title; start goes to the pick", () => {
    const s = reduce(start(), { kind: "start" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
  });

  it("the first world is open on a fresh save and the second is locked behind it", () => {
    const save = freshSave();
    expect(unlocked(save, "toybox", CAMPAIGN)).toBe(true);
    expect(unlocked(save, "shelf", CAMPAIGN)).toBe(false);
  });

  it("picking a locked world is a no-op (control: once the toybox is cleared, the shelf opens)", () => {
    let s = reduce(start(), { kind: "start" }, CAMPAIGN);
    expect(reduce(s, { kind: "pick", world: "shelf" }, CAMPAIGN)).toEqual(s);
    s = clearWorld(s, "toybox");
    s = reduce(s, { kind: "next" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
    expect(reduce(s, { kind: "pick", world: "shelf" }, CAMPAIGN).screen).toEqual({ kind: "stage", world: "shelf", index: 0 });
  });

  it("picking an open world starts its first stage with the save's purse as the carry", () => {
    const s = reduce(reduce(start(), { kind: "start" }, CAMPAIGN), { kind: "pick", world: "toybox" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "stage", world: "toybox", index: 0 });
    expect(carryFor(s.save)).toEqual({ coins: 0, xp: 0, level: 1 });
  });

  it("a pick of a world the campaign does not have is refused naming it", () => {
    const s = reduce(start(), { kind: "start" }, CAMPAIGN);
    expect(() => reduce(s, { kind: "pick", world: "attic" }, CAMPAIGN)).toThrow(/attic/);
  });
});

describe("a stage's end", () => {
  const atStage = (): FlowState => reduce(reduce(start(), { kind: "start" }, CAMPAIGN), { kind: "pick", world: "toybox" }, CAMPAIGN);

  it("stageDone shows the card with the result, and the purse is now the run's terminal purse", () => {
    const s = reduce(atStage(), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "clear", world: "toybox", index: 0, result: result(4, 900) });
    expect(s.save.purse).toEqual(result(4, 900).purse);
  });

  it("next from the card carries the purse into the next stage of the world", () => {
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

  it("best[stage] keeps the lower tick count (control: a slower run does not lower it)", () => {
    let s = reduce(atStage(), { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    expect(s.save.best.stage).toBe(900);
    s = reduce(reduce(s, { kind: "back" }, CAMPAIGN), { kind: "pick", world: "toybox" }, CAMPAIGN);
    s = reduce(s, { kind: "stageDone", result: result(4, 1200) }, CAMPAIGN);
    expect(s.save.best.stage).toBe(900);
    s = reduce(reduce(s, { kind: "back" }, CAMPAIGN), { kind: "pick", world: "toybox" }, CAMPAIGN);
    s = reduce(s, { kind: "stageDone", result: result(4, 600) }, CAMPAIGN);
    expect(s.save.best.stage).toBe(600);
  });

  it("stageDone anywhere but a stage is refused", () => {
    expect(() => reduce(start(), { kind: "stageDone", result: result(1, 1) }, CAMPAIGN)).toThrow(/stageDone/);
  });
});

describe("a world's end", () => {
  it("next from the last stage's card is WORLD CLEAR, and cleared gains the world once (control: clearing it twice keeps one entry)", () => {
    let s = reduce(start(), { kind: "start" }, CAMPAIGN);
    s = clearWorld(s, "toybox");
    expect(s.screen).toEqual({ kind: "worldClear", world: "toybox" });
    expect(s.save.cleared).toEqual(["toybox"]);
    s = reduce(s, { kind: "next" }, CAMPAIGN);
    s = clearWorld(s, "toybox");
    expect(s.save.cleared).toEqual(["toybox"]);
  });

  it("next from WORLD CLEAR is the pick, with the next world open", () => {
    let s = clearWorld(reduce(start(), { kind: "start" }, CAMPAIGN), "toybox");
    s = reduce(s, { kind: "next" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
    expect(unlocked(s.save, "shelf", CAMPAIGN)).toBe(true);
  });

  it("edge: NEXT pressed twice moves once - the second is a no-op on the stage screen, and on the pick after a world clear", () => {
    let s = reduce(reduce(start(), { kind: "start" }, CAMPAIGN), { kind: "pick", world: "toybox" }, CAMPAIGN);
    s = reduce(s, { kind: "stageDone", result: result(4, 900) }, CAMPAIGN);
    const once = reduce(s, { kind: "next" }, CAMPAIGN);
    expect(once.screen).toEqual({ kind: "stage", world: "toybox", index: 1 });
    expect(reduce(once, { kind: "next" }, CAMPAIGN)).toEqual(once);
    let w = clearWorld(reduce(start(), { kind: "start" }, CAMPAIGN), "toybox");
    w = reduce(w, { kind: "next" }, CAMPAIGN);
    expect(w.screen).toEqual({ kind: "pick" });
    expect(reduce(w, { kind: "next" }, CAMPAIGN)).toEqual(w);
  });

  it("edge: a save naming a world the campaign no longer has changes nothing - it unlocks no world and throws nowhere", () => {
    const save = { ...freshSave(), cleared: ["attic"] };
    expect(unlocked(save, "toybox", CAMPAIGN)).toBe(true);
    expect(unlocked(save, "shelf", CAMPAIGN)).toBe(false);
    const s = reduce({ screen: { kind: "pick" }, save }, { kind: "pick", world: "shelf" }, CAMPAIGN);
    expect(s.screen).toEqual({ kind: "pick" });
    expect(s.save.cleared).toEqual(["attic"]);
  });

  it("clearing the last world clears the campaign: every world in cleared, the pick still open", () => {
    let s = clearWorld(reduce(start(), { kind: "start" }, CAMPAIGN), "toybox");
    s = reduce(s, { kind: "next" }, CAMPAIGN);
    s = clearWorld(s, "shelf");
    expect(s.save.cleared).toEqual(["toybox", "shelf"]);
    expect(reduce(s, { kind: "next" }, CAMPAIGN).screen).toEqual({ kind: "pick" });
  });
});
