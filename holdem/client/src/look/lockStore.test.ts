// The one that matters is "an explicit unlock survives a reload".
//
// A lock store written as a LIST of locked keys cannot express "I deliberately
// reopened one of the shipped-settled six": absence means default, and the
// default for those six is locked. So the next visit quietly closes it again,
// the operator reopens it again, and the feature built to stop them doing
// things twice is the thing making them do it twice.

import { beforeEach, describe as group, expect, it, vi } from "vitest";
import { isLocked, loadLocks, SETTLED, setLocked, unlockAll } from "./lockStore";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

group("the six we decided arrive settled", () => {
  it("locks them with nothing stored at all", () => {
    for (const k of SETTLED) expect(isLocked(k), k).toBe(true);
  });

  it("leaves everything else open", () => {
    expect(isLocked("look:cloth")).toBe(false);
    expect(isLocked("sound:chipClack")).toBe(false);
  });

  // The whole reason the store holds booleans rather than a list of keys.
  it("keeps an explicit unlock of a shipped-settled one", () => {
    setLocked("look:table", false);
    expect(isLocked("look:table")).toBe(false);
  });

  it("keeps an explicit lock of an open one", () => {
    setLocked("sound:win", true);
    expect(isLocked("sound:win")).toBe(true);
  });
});

group("it survives whatever is on the disk", () => {
  it("answers defaults for junk", () => {
    for (const junk of ["", "{", "[]", "null", '"nope"', "17"]) {
      store.set("holdem:locks:v1", junk);
      expect(isLocked("look:table"), junk).toBe(true);
      expect(isLocked("look:cloth"), junk).toBe(false);
    }
  });

  it("drops keys and values it does not recognise", () => {
    store.set(
      "holdem:locks:v1",
      JSON.stringify({
        "look:table": false,
        "look:../../etc": true,
        "sound:win": "yes",
        nonsense: true,
      }),
    );
    expect(isLocked("look:table")).toBe(false);
    // A junk VALUE falls back to the default rather than being coerced true.
    expect(isLocked("sound:win")).toBe(false);
  });

  it("never throws when storage refuses", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    });
    expect(() => setLocked("look:table", false)).not.toThrow();
    expect(isLocked("look:table")).toBe(true);
  });

  it("refuses to write a malformed key", () => {
    setLocked("look:../../etc/passwd", true);
    expect(store.get("holdem:locks:v1")).toBeUndefined();
  });
});

group("the screen can ask for all of them", () => {
  it("reports every key it was given", () => {
    const keys = ["look:table", "look:cloth", "sound:win"];
    expect(loadLocks(keys)).toEqual({ "look:table": true, "look:cloth": false, "sound:win": false });
  });

  it("opens all of them, including the shipped-settled ones", () => {
    const keys = [...SETTLED, "look:cloth"];
    unlockAll(keys);
    for (const k of keys) expect(isLocked(k), k).toBe(false);
  });
});
