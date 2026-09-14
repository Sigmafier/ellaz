// Picking weapons, pinned by behaviour. Operator ruling 2026-09-14: pick one of
// three at the start, new weapons as level-up cards, four slots.
import { describe, expect, it } from "vitest";
import { UPGRADE_CAP, UPGRADE_IDS, newRun, rngFor } from "./logic";
import { POOL, SLOTS_MAX, STARTERS, asStarter } from "./arsenal";
import { applyCard, offerCards } from "./cards";

describe("the start", () => {
  it("a run starts with exactly the weapon it was given", () => {
    for (const id of STARTERS) {
      const s = newRun("normal", undefined, id);
      expect(s.slots.map((k) => k.id)).toEqual([id]);
    }
    // And the bolt when nobody said, which is what the game has always had.
    expect(newRun("normal").slots.map((k) => k.id)).toEqual(["bolt"]);
  });

  it("three starters, five weapons, four slots - so one never makes a given run", () => {
    expect(STARTERS).toHaveLength(3);
    expect(POOL).toHaveLength(5);
    expect(new Set(POOL).size).toBe(5);
    expect(SLOTS_MAX).toBe(4);
    for (const id of STARTERS) expect(POOL).toContain(id);
  });

  it("a stored starter is validated, never trusted", () => {
    expect(asStarter("arc")).toBe("arc");
    expect(asStarter("blades")).toBe("bolt"); // a weapon, but not a starter
    expect(asStarter("laser")).toBe("bolt");
    expect(asStarter(undefined)).toBe("bolt");
    expect(asStarter(7)).toBe("bolt");
  });
});

describe("level-up cards", () => {
  it("while a slot is free, the first card is a weapon the run does not carry", () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = newRun("normal", undefined, "arc");
      const cards = offerCards(s, rngFor(seed));
      expect(cards).toHaveLength(3);
      expect(cards[0].kind).toBe("weapon");
      expect(cards[0].id).not.toBe("arc");
      expect(cards.slice(1).every((c) => c.kind === "upgrade")).toBe(true);
    }
  });

  it("every unheld weapon can be offered - the draw is not stuck on one", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 200; seed++) {
      const s = newRun("normal");
      seen.add(offerCards(s, rngFor(seed))[0].id);
    }
    expect([...seen].sort()).toEqual(["arc", "blades", "burst", "drone"]);
  });

  it("THE CONTROL: with four slots full, the cards are upgrades only", () => {
    const s = newRun("normal");
    s.slots = [
      { id: "bolt", cd: 0 },
      { id: "arc", cd: 0 },
      { id: "blades", cd: 0 },
      { id: "drone", cd: 0 },
    ];
    const cards = offerCards(s, rngFor(4));
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.kind === "upgrade")).toBe(true);
  });

  it("taking a weapon card adds a slot and lets the run carry on", () => {
    const s = newRun("normal");
    s.choosing = true;
    applyCard(s, { kind: "weapon", id: "blades" });
    expect(s.slots.map((k) => k.id)).toEqual(["bolt", "blades"]);
    expect(s.choosing).toBe(false);
    // Never twice, and never a fifth.
    applyCard(s, { kind: "weapon", id: "blades" });
    applyCard(s, { kind: "weapon", id: "drone" });
    applyCard(s, { kind: "weapon", id: "arc" });
    applyCard(s, { kind: "weapon", id: "burst" });
    expect(s.slots).toHaveLength(SLOTS_MAX);
    expect(new Set(s.slots.map((k) => k.id)).size).toBe(SLOTS_MAX);
  });

  it("taking an upgrade card still upgrades", () => {
    const s = newRun("normal");
    applyCard(s, { kind: "upgrade", id: "rapid" });
    expect(s.up.rapid).toBe(1);
  });

  it("with slots full and every upgrade maxed there is nothing to offer, rather than a stall", () => {
    const s = newRun("normal");
    s.slots = POOL.slice(0, 4).map((id) => ({ id, cd: 0 }));
    for (const id of UPGRADE_IDS) s.up[id] = UPGRADE_CAP[id];
    expect(offerCards(s, rngFor(9))).toHaveLength(0);
  });
});
