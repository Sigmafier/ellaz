// The save is device-local and versioned: a round-trip returns what was stored,
// a wrong version reads as fresh (never migrated), and a storage that throws -
// a private window, a full quota, a blocked origin - reads as fresh and never
// throws out (the ellaz try/catch law for localStorage).

import { freshSave } from "./flow";
import { load, SAVE_VERSION, store } from "./save";
import type { Storage } from "./save";

function memory(): Storage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
}

describe("the save", () => {
  it("round-trips through a storage", () => {
    const s = memory();
    const save = { ...freshSave(), cleared: ["toybox"], levels: ["stage", "toybox-2"], purse: { coins: 9, xp: 30, level: 2 }, best: { stage: 900 } };
    store("brawl", save, s);
    expect(load("brawl", s)).toEqual(save);
    expect(JSON.parse(s.map.get("toybox:campaign:brawl")!).version).toBe(SAVE_VERSION);
  });

  it("reads as fresh when nothing is stored", () => {
    expect(load("brawl", memory())).toEqual(freshSave());
  });

  it("reads as fresh on a wrong version, never migrated (control: the right version reads through)", () => {
    const s = memory();
    const save = { ...freshSave(), cleared: ["toybox"] };
    store("brawl", save, s);
    s.map.set("toybox:campaign:brawl", JSON.stringify({ ...save, version: SAVE_VERSION + 1 }));
    expect(load("brawl", s)).toEqual(freshSave());
    s.map.set("toybox:campaign:brawl", JSON.stringify({ ...save, version: SAVE_VERSION }));
    expect(load("brawl", s)).toEqual(save);
  });

  it("reads as fresh on bytes that are not JSON, and on JSON that is not a save", () => {
    const s = memory();
    s.map.set("toybox:campaign:brawl", "{not json");
    expect(load("brawl", s)).toEqual(freshSave());
    s.map.set("toybox:campaign:brawl", JSON.stringify({ version: SAVE_VERSION, cleared: "toybox" }));
    expect(load("brawl", s)).toEqual(freshSave());
    // a version-1 record (no levels) is not a save of this shape, and is discarded rather than migrated
    s.map.set("toybox:campaign:brawl", JSON.stringify({ version: SAVE_VERSION, cleared: [], purse: { coins: 1, xp: 1, level: 1 }, best: {} }));
    expect(load("brawl", s)).toEqual(freshSave());
  });

  it("a throwing storage reads as fresh and a throwing store is swallowed - nothing escapes", () => {
    const broken: Storage = { getItem: () => { throw new Error("quota"); }, setItem: () => { throw new Error("quota"); } };
    expect(load("brawl", broken)).toEqual(freshSave());
    expect(() => store("brawl", freshSave(), broken)).not.toThrow();
  });
});
