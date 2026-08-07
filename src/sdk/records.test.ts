import { describe, it, expect } from "vitest";
import {
  MAX_RECORDS,
  RECORDS_UNDO_KEY,
  adoptRecords,
  canUndoRecords,
  isRecordKey,
  parseRecordKey,
  readRecords,
  recordKey,
  undoRecords,
  type RecordStore,
} from "./records";

/** An in-memory store, since the node test env has no localStorage. */
function fakeStore(seed: Record<string, string> = {}): RecordStore & { all: Map<string, string> } {
  const all = new Map(Object.entries(seed));
  return {
    all,
    keys: () => [...all.keys()],
    get: (key) => all.get(key) ?? null,
    set: (key, value) => {
      all.set(key, value);
      return true;
    },
  };
}

describe("which storage keys are records", () => {
  it("accepts a per-game board key", () => {
    expect(isRecordKey("ellaz:snake:score:default")).toBe(true);
    expect(isRecordKey("ellaz:n2048:score:hard")).toBe(true);
    expect(isRecordKey("ellaz:finddiff:score:level-3")).toBe(true);
  });

  it("REFUSES the keys that would hijack a device", () => {
    // This is the whole security property. A restored document is data from a
    // stranger, and the two keys below are the player's identity and their
    // entire balance. Neither contains ":score:", which is what keeps them out.
    expect(isRecordKey("ellaz:profile:v1")).toBe(false);
    expect(isRecordKey("ellaz:cloud:v1")).toBe(false);
    expect(isRecordKey("ellaz:profile:undo:v1")).toBe(false);
    expect(isRecordKey(RECORDS_UNDO_KEY)).toBe(false);
  });

  it("refuses anything outside our namespace, or shaped to escape it", () => {
    for (const key of [
      "score:default",
      "other:snake:score:default",
      "ellaz:snake:score:default:extra",
      "ellaz::score:default",
      "ellaz:snake:score:",
      "ellaz:sn ake:score:default",
      "",
    ]) {
      expect(isRecordKey(key), key).toBe(false);
    }
  });
});

describe("reading a key back apart", () => {
  it("names the game and the board", () => {
    expect(parseRecordKey("ellaz:snake:score:hard")).toEqual({ game: "snake", board: "hard" });
    expect(parseRecordKey("ellaz:2048:score:default")).toEqual({ game: "2048", board: "default" });
  });

  it("refuses everything isRecordKey refuses", () => {
    // Same guard, one entry point: a parser that accepted a key the validator
    // rejects would be a second, weaker gate on the same strings.
    for (const key of ["ellaz:profile:v1", "ellaz:cloud:v1", "ellaz:a:score:b:c", "", "snake"]) {
      expect(parseRecordKey(key)).toBeNull();
    }
  });
});

describe("reading what this device has", () => {
  it("collects every board across every game, and nothing else", () => {
    const store = fakeStore({
      "ellaz:snake:score:default": "4200",
      "ellaz:memory:score:easy": "14",
      "ellaz:profile:v1": '{"v":1,"coins":9}',
      "ellaz:coloring:drawing": '"data:image/png;base64,AAAA"',
    });
    expect(readRecords(store)).toEqual({
      "ellaz:snake:score:default": 4200,
      "ellaz:memory:score:easy": 14,
    });
  });

  it("drops a record that is not a usable number", () => {
    const store = fakeStore({
      "ellaz:a:score:default": "null",
      "ellaz:b:score:default": '"4200"',
      "ellaz:c:score:default": "not json",
      "ellaz:d:score:default": "7",
    });
    expect(readRecords(store)).toEqual({ "ellaz:d:score:default": 7 });
  });

  it("never throws on a store that does", () => {
    const hostile: RecordStore = {
      keys: () => {
        throw new Error("no");
      },
      get: () => null,
      set: () => false,
    };
    expect(() => readRecords(hostile)).not.toThrow();
    expect(readRecords(hostile)).toEqual({});
  });
});

describe("adopting records from a restored device", () => {
  it("brings the other device's records across", () => {
    const store = fakeStore({ "ellaz:snake:score:default": "100" });
    const applied = adoptRecords({ "ellaz:snake:score:default": 4200 }, store);
    expect(applied).toBe(1);
    expect(readRecords(store)["ellaz:snake:score:default"]).toBe(4200);
  });

  it("UNIONS rather than replaces — a record is never taken away", () => {
    // ctx.score has no clear(), and this must not become one by the back door.
    // A board this device holds and the incoming one does not simply stays.
    const store = fakeStore({ "ellaz:frog:score:easy": "9" });
    adoptRecords({ "ellaz:snake:score:default": 4200 }, store);
    expect(readRecords(store)).toEqual({
      "ellaz:frog:score:easy": 9,
      "ellaz:snake:score:default": 4200,
    });
  });

  it("cannot be used to write a key that is not a record", () => {
    const store = fakeStore({ "ellaz:profile:v1": '{"v":1,"coins":9}' });
    const applied = adoptRecords(
      {
        "ellaz:profile:v1": 999999,
        "ellaz:cloud:v1": 1,
        "ellaz:snake:score:default": 42,
      },
      store,
    );
    expect(applied).toBe(1);
    expect(store.get("ellaz:profile:v1")).toBe('{"v":1,"coins":9}');
    expect(store.get("ellaz:cloud:v1")).toBeNull();
  });

  it("refuses values that are not finite numbers", () => {
    const store = fakeStore();
    adoptRecords(
      {
        "ellaz:a:score:default": "4200",
        "ellaz:b:score:default": null,
        "ellaz:c:score:default": Number.NaN,
        "ellaz:d:score:default": { v: 1 },
        "ellaz:e:score:default": 8,
      },
      store,
    );
    expect(readRecords(store)).toEqual({ "ellaz:e:score:default": 8 });
  });

  it("is bounded, so a crafted document cannot fill the disk", () => {
    const store = fakeStore();
    const huge: Record<string, number> = {};
    for (let i = 0; i < MAX_RECORDS + 50; i++) huge[`ellaz:g${i}:score:default`] = i + 1;
    expect(adoptRecords(huge, store)).toBe(MAX_RECORDS);
  });

  it("shrugs off anything that is not an object at all", () => {
    const store = fakeStore();
    for (const junk of [null, undefined, 42, "records", [1, 2, 3]]) {
      expect(adoptRecords(junk, store)).toBe(0);
    }
  });
});

describe("undoing an adoption", () => {
  it("has nothing to undo until one happens", () => {
    const store = fakeStore();
    expect(canUndoRecords(store)).toBe(false);
    expect(undoRecords(store)).toBe(false);
  });

  it("puts the overwritten records back", () => {
    const store = fakeStore({ "ellaz:snake:score:default": "100" });
    adoptRecords({ "ellaz:snake:score:default": 4200 }, store);
    expect(canUndoRecords(store)).toBe(true);
    expect(undoRecords(store)).toBe(true);
    expect(readRecords(store)["ellaz:snake:score:default"]).toBe(100);
  });

  it("leaves records the adoption ADDED, for the same reason adopting unions", () => {
    const store = fakeStore({ "ellaz:snake:score:default": "100" });
    adoptRecords({ "ellaz:snake:score:default": 4200, "ellaz:frog:score:easy": 7 }, store);
    undoRecords(store);
    expect(readRecords(store)).toEqual({
      "ellaz:snake:score:default": 100,
      "ellaz:frog:score:easy": 7,
    });
  });

  it("is spent once", () => {
    const store = fakeStore({ "ellaz:snake:score:default": "100" });
    adoptRecords({ "ellaz:snake:score:default": 4200 }, store);
    expect(undoRecords(store)).toBe(true);
    expect(canUndoRecords(store)).toBe(false);
    expect(undoRecords(store)).toBe(false);
  });

  it("survives a corrupt snapshot rather than throwing", () => {
    const store = fakeStore({ [RECORDS_UNDO_KEY]: "{oh no" });
    expect(canUndoRecords(store)).toBe(true);
    expect(() => undoRecords(store)).not.toThrow();
  });
});

describe("building a record key", () => {
  it("round-trips through the parser for every game and board in the catalog shape", () => {
    for (const [game, board] of [
      ["snake", "default"],
      ["sudoku", "kids4"],
      ["n2048", "hard"],
      ["find-diff", "level_2"],
    ] as const) {
      const key = recordKey(game, board);
      expect(key, `${game}/${board}`).not.toBeNull();
      expect(parseRecordKey(key as string)).toEqual({ game, board });
    }
  });

  it("refuses parts that would build a key the validator rejects", () => {
    // A colon in either part is the dangerous one: it would let a caller reach
    // `ellaz:profile:v1` or `ellaz:cloud:v1` by splitting the segments
    // differently. Returning null means the lookup misses loudly instead of
    // reading somewhere it should not.
    expect(recordKey("snake:x", "hard")).toBeNull();
    expect(recordKey("snake", "hard:y")).toBeNull();
    expect(recordKey("", "hard")).toBeNull();
    expect(recordKey("snake", "")).toBeNull();
  });
});
