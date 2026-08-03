import { describe, it, expect } from "vitest";
import type { SaveStore } from "./types";
import { SCORE_KEY_PREFIX, createScorePort } from "./scoreboard";

// The stateful half of the score contract. score.ts stays pure; this is where a
// personal best is persisted. The SaveStore is injected (last parameter, the rng
// convention) so it is testable in the node vitest env, where there is no
// localStorage at all.
function memoryStore(seed: Record<string, unknown> = {}): SaveStore & { raw: Record<string, unknown> } {
  const raw: Record<string, unknown> = { ...seed };
  return {
    raw,
    get<T>(key: string, fallback: T): T {
      return (key in raw ? raw[key] : fallback) as T;
    },
    set<T>(key: string, value: T): void {
      raw[key] = value;
    },
    remove(key: string): void {
      delete raw[key];
    },
  };
}

describe("createScorePort — the first score", () => {
  it("is always a personal best", () => {
    const p = createScorePort(memoryStore());
    const r = p.report({ value: 120, unit: "points" });
    expect(r.isPersonalBest).toBe(true);
    expect(r.best).toBe(120);
    expect(r.rejected).toBe(false);
  });

  it("persists under a namespaced key, so a game's own `best` is untouched", () => {
    // Six games already store their own ad-hoc `best`. Wave B must not clobber
    // them, so the port writes somewhere else entirely.
    const store = memoryStore({ best: 999 });
    createScorePort(store).report({ value: 5, unit: "points" });
    expect(store.raw.best).toBe(999);
    expect(store.raw[`${SCORE_KEY_PREFIX}default`]).toBe(5);
  });
});

describe("createScorePort — beating a record", () => {
  it("reports a higher points score as a best and stores it", () => {
    const store = memoryStore();
    const p = createScorePort(store);
    p.report({ value: 10, unit: "points" });
    const r = p.report({ value: 25, unit: "points" });
    expect(r.isPersonalBest).toBe(true);
    expect(r.best).toBe(25);
  });

  it("does not count a tie, and leaves the stored best alone", () => {
    const store = memoryStore();
    const p = createScorePort(store);
    p.report({ value: 10, unit: "points" });
    const r = p.report({ value: 10, unit: "points" });
    expect(r.isPersonalBest).toBe(false);
    expect(r.best).toBe(10);
  });

  it("ranks a FASTER time as better, not a bigger number", () => {
    const store = memoryStore();
    const p = createScorePort(store);
    p.report({ value: 9000, unit: "ms" });
    const slower = p.report({ value: 12000, unit: "ms" });
    expect(slower.isPersonalBest).toBe(false);
    expect(slower.best).toBe(9000);
    const faster = p.report({ value: 4200, unit: "ms" });
    expect(faster.isPersonalBest).toBe(true);
    expect(faster.best).toBe(4200);
  });

  it("ranks fewer moves as better", () => {
    const p = createScorePort(memoryStore());
    p.report({ value: 30, unit: "moves" });
    expect(p.report({ value: 12, unit: "moves" }).isPersonalBest).toBe(true);
    expect(p.best()).toBe(12);
  });
});

describe("createScorePort — boards are independent", () => {
  it("keeps a separate best per board", () => {
    const p = createScorePort(memoryStore());
    p.report({ value: 100, unit: "points", board: "easy" });
    p.report({ value: 10, unit: "points", board: "hard" });
    expect(p.best("easy")).toBe(100);
    expect(p.best("hard")).toBe(10);
    // A weak score on `hard` is still that board's best.
    expect(p.report({ value: 20, unit: "points", board: "hard" }).isPersonalBest).toBe(true);
    expect(p.best("easy")).toBe(100);
  });

  it("reports an unseen board as having no best yet", () => {
    expect(createScorePort(memoryStore()).best("never-played")).toBeUndefined();
  });
});

describe("createScorePort — junk never becomes a record", () => {
  it("rejects an unrankable value and stores nothing", () => {
    const store = memoryStore();
    const r = createScorePort(store).report({ value: NaN, unit: "points" });
    expect(r.rejected).toBe(true);
    expect(r.isPersonalBest).toBe(false);
    expect(store.raw[`${SCORE_KEY_PREFIX}default`]).toBeUndefined();
  });

  it("does not let a rejected report wipe an existing best", () => {
    const store = memoryStore();
    const p = createScorePort(store);
    p.report({ value: 50, unit: "points" });
    const r = p.report({ value: Infinity, unit: "points" });
    expect(r.rejected).toBe(true);
    expect(r.best).toBe(50);
    expect(p.best()).toBe(50);
  });

  it("treats a CORRUPT stored best as absent so a real score can still land", () => {
    const store = memoryStore({ [`${SCORE_KEY_PREFIX}default`]: "not a number" });
    const r = createScorePort(store).report({ value: 7, unit: "points" });
    expect(r.isPersonalBest).toBe(true);
    expect(r.best).toBe(7);
  });

  it("survives a storage backend that throws on every call", () => {
    // Incognito, disabled storage, quota exceeded. A score must never break a win.
    const hostile: SaveStore = {
      get() {
        throw new Error("nope");
      },
      set() {
        throw new Error("nope");
      },
      remove() {
        throw new Error("nope");
      },
    };
    const p = createScorePort(hostile);
    expect(() => p.report({ value: 3, unit: "points" })).not.toThrow();
    expect(() => p.best()).not.toThrow();
    expect(p.report({ value: 3, unit: "points" }).isPersonalBest).toBe(true);
  });
});
