import { describe, it, expect } from "vitest";
import type { SaveStore } from "./types";
import {
  SESSION_KEY,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_BYTES,
  createSessionPort,
  type SessionSpec,
} from "./session";

// Same injected store the scoreboard tests use: the node vitest env has no
// localStorage, and the policy this file is about is entirely independent of
// where the bytes land.
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

interface Board {
  level: string;
  cells: number[];
}

const SPEC: SessionSpec<Board> = {
  version: 3,
  validate: (value): value is Board => {
    const b = value as Partial<Board> | null;
    return (
      typeof b === "object" &&
      b !== null &&
      typeof b.level === "string" &&
      Array.isArray(b.cells) &&
      b.cells.length === 4
    );
  },
};

const BOARD: Board = { level: "hard", cells: [1, 2, 3, 4] };

describe("createSessionPort — the round trip", () => {
  it("gives back exactly what was saved", () => {
    const port = createSessionPort(memoryStore());
    port.save(SPEC, BOARD);
    expect(port.load(SPEC)).toEqual(BOARD);
  });

  it("writes under the game's own namespaced key, not over a record or a save", () => {
    // The store handed here is ALREADY namespaced to one game, so the only
    // neighbours a session can collide with are that game's own keys.
    const store = memoryStore({ best: 999, "score:hard": 12750 });
    createSessionPort(store).save(SPEC, BOARD);
    expect(store.raw.best).toBe(999);
    expect(store.raw["score:hard"]).toBe(12750);
    expect(store.raw[SESSION_KEY]).toBeDefined();
  });

  it("answers undefined when nothing was ever saved", () => {
    expect(createSessionPort(memoryStore()).load(SPEC)).toBeUndefined();
  });

  it("forgets on clear", () => {
    const port = createSessionPort(memoryStore());
    port.save(SPEC, BOARD);
    port.clear();
    expect(port.load(SPEC)).toBeUndefined();
  });

  it("overwrites rather than accumulating — one key per game, always", () => {
    const store = memoryStore();
    const port = createSessionPort(store);
    port.save(SPEC, BOARD);
    port.save(SPEC, { level: "hard", cells: [9, 9, 9, 9] });
    expect(Object.keys(store.raw)).toEqual([SESSION_KEY]);
    expect(port.load(SPEC)).toEqual({ level: "hard", cells: [9, 9, 9, 9] });
  });
});

describe("createSessionPort — every way a stored position is refused", () => {
  // Each of these is a snapshot that PARSED. The interesting failures are not
  // corrupt bytes, they are plausible objects a game can no longer explain.

  it("refuses a snapshot written under a different version", () => {
    const store = memoryStore();
    createSessionPort(store).save({ ...SPEC, version: 2 }, BOARD);
    expect(createSessionPort(store).load(SPEC)).toBeUndefined();
  });

  it("refuses a snapshot older than the max age", () => {
    const store = memoryStore();
    let clock = 1_000_000;
    const port = createSessionPort(store, { now: () => clock });
    port.save(SPEC, BOARD);
    clock += SESSION_MAX_AGE_MS + 1;
    expect(port.load(SPEC)).toBeUndefined();
  });

  it("keeps a snapshot right up to the max age", () => {
    // The positive control for the rule above. Without it, an off-by-a-factor
    // in the age arithmetic would expire everything instantly and the refusal
    // test would still be green.
    const store = memoryStore();
    let clock = 1_000_000;
    const port = createSessionPort(store, { now: () => clock });
    port.save(SPEC, BOARD);
    clock += SESSION_MAX_AGE_MS;
    expect(port.load(SPEC)).toEqual(BOARD);
  });

  it("keeps a snapshot stamped in the future rather than treating it as ancient", () => {
    // A device clock that moves backwards makes `age` negative. Answering
    // "expired" there would be right by accident and wrong in reasoning; the
    // snapshot is newer than now, not older than a month.
    const store = memoryStore();
    let clock = 1_000_000;
    const port = createSessionPort(store, { now: () => clock });
    port.save(SPEC, BOARD);
    clock -= 60_000;
    expect(port.load(SPEC)).toEqual(BOARD);
  });

  it("refuses a snapshot the game's own validator rejects", () => {
    // Truncation and hand-editing, which no version number can see: the right
    // version, a recent stamp, and a board of the wrong size.
    const store = memoryStore();
    createSessionPort(store).save(SPEC, { level: "hard", cells: [1, 2] } as Board);
    expect(createSessionPort(store).load(SPEC)).toBeUndefined();
  });

  it("refuses rather than throwing when the validator itself throws", () => {
    const store = memoryStore();
    createSessionPort(store).save(SPEC, BOARD);
    const hostile: SessionSpec<Board> = {
      version: SPEC.version,
      validate: (_value): _value is Board => {
        throw new Error("assumed a field that was not there");
      },
    };
    expect(() => createSessionPort(store).load(hostile)).not.toThrow();
    expect(createSessionPort(store).load(hostile)).toBeUndefined();
  });

  it.each([
    ["a bare number", 42],
    ["a string", "hello"],
    ["null", null],
    ["an array", [1, 2, 3]],
    ["an envelope with no version", { at: Date.now(), s: BOARD }],
    ["an envelope with no stamp", { v: 3, s: BOARD }],
    ["an envelope with no payload", { v: 3, at: Date.now() }],
    ["a version that is not a number", { v: "3", at: Date.now(), s: BOARD }],
  ])("refuses %s sitting where an envelope belongs", (_label, planted) => {
    const store = memoryStore({ [SESSION_KEY]: planted });
    expect(createSessionPort(store).load(SPEC)).toBeUndefined();
  });
});

describe("createSessionPort — a snapshot must never cost a child their coins", () => {
  it("refuses to write a snapshot over the byte cap", () => {
    const store = memoryStore();
    const huge = { level: "hard", cells: [1, 2, 3, 4], blob: "x".repeat(SESSION_MAX_BYTES) };
    createSessionPort(store).save(SPEC, huge as unknown as Board);
    expect(store.raw[SESSION_KEY]).toBeUndefined();
  });

  it("leaves the previous snapshot alone when an oversized one is refused", () => {
    // Snapshots only grow within a run, so what is already stored is the last
    // position that fit. Resuming a few moves back beats resuming nothing.
    const store = memoryStore();
    const port = createSessionPort(store);
    port.save(SPEC, BOARD);
    port.save(SPEC, { level: "hard", cells: [1, 2, 3, 4], blob: "x".repeat(SESSION_MAX_BYTES) } as unknown as Board);
    expect(port.load(SPEC)).toEqual(BOARD);
  });

  it("writes a snapshot just under the cap", () => {
    // The positive control: without it, a cap accidentally set near zero would
    // pass every refusal test above.
    const store = memoryStore();
    const port = createSessionPort(store);
    const big = { level: "hard", cells: [1, 2, 3, 4], blob: "x".repeat(SESSION_MAX_BYTES - 200) };
    port.save(SPEC, big as unknown as Board);
    expect(store.raw[SESSION_KEY]).toBeDefined();
  });

  it("survives a snapshot that cannot be serialized at all", () => {
    const store = memoryStore();
    const cyclic: Record<string, unknown> = { level: "hard" };
    cyclic.self = cyclic;
    expect(() => createSessionPort(store).save(SPEC, cyclic as unknown as Board)).not.toThrow();
    expect(store.raw[SESSION_KEY]).toBeUndefined();
  });

  it("survives a storage that refuses every write", () => {
    // Safari private mode, a device storage policy, an exhausted quota. The
    // save store swallows these, and a session must degrade to "no snapshot"
    // exactly the way a first-ever visit does.
    // `createSaveStore` swallows the QuotaExceededError itself, so what a port
    // actually faces is a store whose writes silently do nothing.
    const dead: SaveStore = {
      get: <T,>(_k: string, fallback: T) => fallback,
      set: () => {},
      remove: () => {},
    };
    const port = createSessionPort(dead);
    expect(() => port.save(SPEC, BOARD)).not.toThrow();
    expect(() => port.clear()).not.toThrow();
    expect(port.load(SPEC)).toBeUndefined();
  });
});
