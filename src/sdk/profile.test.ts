import { describe, it, expect } from "vitest";
import {
  PROFILE_KEY,
  emptyProfile,
  migrateProfile,
  memoryBackend,
  localStorageBackend,
} from "./profile";
import type { ProfileV1 } from "./profile";

/** Every migrate output must be structurally usable by the wallet. */
function expectUsable(p: ProfileV1): void {
  expect(p.v).toBe(1);
  expect(Number.isFinite(p.coins)).toBe(true);
  expect(p.coins).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(p.stars)).toBe(true);
  expect(p.stars).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(p.owned)).toBe(true);
  expect(p.owned.every((id) => typeof id === "string")).toBe(true);
  expect(typeof p.equipped).toBe("object");
  expect(p.equipped).not.toBeNull();
  expect(Array.isArray(p.equipped)).toBe(false);
  expect(typeof p.games).toBe("object");
  expect(p.games).not.toBeNull();
  for (const record of Object.values(p.games)) {
    expect(Number.isFinite(record.wins)).toBe(true);
    expect(Number.isFinite(record.stars)).toBe(true);
    // lastPlayedAt is optional. When present it must be a real instant - a
    // survivor of coercion, never a 0 standing in for "never opened".
    if ("lastPlayedAt" in record) {
      expect(typeof record.lastPlayedAt).toBe("number");
      expect(Number.isFinite(record.lastPlayedAt as number)).toBe(true);
      expect(record.lastPlayedAt as number).toBeGreaterThan(0);
    }
  }
  expect(Number.isFinite(p.updatedAt)).toBe(true);
}

describe("PROFILE_KEY", () => {
  it("is versioned so a future schema cannot collide with v1 data", () => {
    expect(PROFILE_KEY).toBe("ellaz:profile:v1");
  });
});

describe("emptyProfile", () => {
  it("is a usable zeroed profile", () => {
    const p = emptyProfile();
    expectUsable(p);
    expect(p.coins).toBe(0);
    expect(p.stars).toBe(0);
    expect(p.owned).toEqual([]);
    expect(p.equipped).toEqual({});
    expect(p.games).toEqual({});
  });

  it("returns a fresh object each call (no shared mutable state)", () => {
    const a = emptyProfile();
    const b = emptyProfile();
    a.coins = 99;
    a.owned.push("x");
    expect(b.coins).toBe(0);
    expect(b.owned).toEqual([]);
  });
});

describe("migrateProfile — NEVER THROWS battery", () => {
  // Each case is a shape the wallet could genuinely read back out of storage:
  // a wiped key, a truncated write, a hand-edited value, a future app version.
  const cases: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ["invalid JSON string", "{"],
    ["empty string", ""],
    ["random string", "not json at all"],
    ["JSON null string", "null"],
    ["empty object", {}],
    ["empty object as JSON string", "{}"],
    ["array", []],
    ["populated array", [1, 2, 3]],
    ["array as JSON string", "[1,2,3]"],
    ["number", 42],
    ["boolean", true],
    ["coins as string", { v: 1, coins: "500", stars: 2 }],
    ["owned as object", { v: 1, owned: { a: 1 } }],
    ["equipped as array", { v: 1, equipped: ["hat"] }],
    ["games as string", { v: 1, games: "nope" }],
    ["negative coins", { v: 1, coins: -100, stars: -5 }],
    ["NaN coins", { v: 1, coins: NaN }],
    ["Infinity coins", { v: 1, coins: Infinity }],
    ["fractional coins", { v: 1, coins: 3.7 }],
    ["future v2", { v: 2, coins: 10, stars: 4, wardrobe: ["x"] }],
    ["v as string", { v: "1", coins: 5 }],
    ["missing v", { coins: 5, stars: 1 }],
    ["nested junk in games", { v: 1, games: { snake: "bad", math: { wins: "3" } } }],
    ["nested junk in owned", { v: 1, owned: ["ok", 5, null, { a: 1 }] }],
    ["nested junk in equipped", { v: 1, equipped: { wall: "blue", floor: 7 } }],
    // lastPlayedAt is fed the same hand-edited junk as everything else, and it
    // is the field a "keep playing" row sorts on - a bad value here must never
    // corrupt the profile or reach the sort.
    ["lastPlayedAt as string", { v: 1, games: { snake: { wins: 1, stars: 1, lastPlayedAt: "123" } } }],
    ["lastPlayedAt as ISO string", { v: 1, games: { snake: { lastPlayedAt: "2026-08-02T00:00:00Z" } } }],
    ["lastPlayedAt NaN", { v: 1, games: { snake: { lastPlayedAt: NaN } } }],
    ["lastPlayedAt Infinity", { v: 1, games: { snake: { lastPlayedAt: Infinity } } }],
    ["lastPlayedAt -Infinity", { v: 1, games: { snake: { lastPlayedAt: -Infinity } } }],
    ["lastPlayedAt negative", { v: 1, games: { snake: { lastPlayedAt: -5 } } }],
    ["lastPlayedAt zero", { v: 1, games: { snake: { lastPlayedAt: 0 } } }],
    ["lastPlayedAt fractional", { v: 1, games: { snake: { lastPlayedAt: 1700000000000.7 } } }],
    ["lastPlayedAt as object", { v: 1, games: { snake: { lastPlayedAt: { at: 1 } } } }],
    ["lastPlayedAt as array", { v: 1, games: { snake: { lastPlayedAt: [1700000000000] } } }],
    ["lastPlayedAt as null", { v: 1, games: { snake: { lastPlayedAt: null } } }],
    ["lastPlayedAt as boolean", { v: 1, games: { snake: { lastPlayedAt: true } } }],
    ["lastPlayedAt on a truncated record", { v: 1, games: { snake: { lastPlayedAt: 1700000000000 } } }],
  ];

  for (const [label, raw] of cases) {
    it(`returns a usable profile and does not throw for: ${label}`, () => {
      let p: ProfileV1 | undefined;
      expect(() => {
        p = migrateProfile(raw);
      }).not.toThrow();
      expectUsable(p as ProfileV1);
    });
  }

  it("round-trips a valid v1 profile unchanged", () => {
    const valid: ProfileV1 = {
      v: 1,
      coins: 120,
      stars: 7,
      owned: ["rug-red", "lamp-1"],
      equipped: { floor: "rug-red" },
      games: { snake: { wins: 3, stars: 3 } },
      updatedAt: 1700000000000,
    };
    expect(migrateProfile(valid)).toEqual(valid);
    expect(migrateProfile(JSON.stringify(valid))).toEqual(valid);
  });

  it("salvages the fields it recognises from a future shape", () => {
    const p = migrateProfile({ v: 2, coins: 10, stars: 4, wardrobe: ["x"] });
    expect(p.v).toBe(1);
    expect(p.coins).toBe(10);
    expect(p.stars).toBe(4);
  });

  it("clamps hostile numbers instead of propagating them", () => {
    expect(migrateProfile({ v: 1, coins: -100, stars: -5 }).coins).toBe(0);
    expect(migrateProfile({ v: 1, coins: -100, stars: -5 }).stars).toBe(0);
    expect(migrateProfile({ v: 1, coins: NaN }).coins).toBe(0);
    expect(migrateProfile({ v: 1, coins: Infinity }).coins).toBe(0);
    expect(migrateProfile({ v: 1, coins: 3.7 }).coins).toBe(3);
  });

  it("drops non-string entries from owned and de-duplicates", () => {
    const p = migrateProfile({ v: 1, owned: ["ok", 5, null, "ok", { a: 1 }] });
    expect(p.owned).toEqual(["ok"]);
  });

  it("drops non-string values from equipped", () => {
    const p = migrateProfile({ v: 1, equipped: { wall: "blue", floor: 7 } });
    expect(p.equipped).toEqual({ wall: "blue" });
  });

  it("drops malformed per-game records", () => {
    const p = migrateProfile({ v: 1, games: { snake: "bad", math: { wins: 3, stars: 1 } } });
    expect(p.games).toEqual({ math: { wins: 3, stars: 1 } });
  });

  it("keeps a valid lastPlayedAt intact", () => {
    const p = migrateProfile({ v: 1, games: { snake: { wins: 2, stars: 2, lastPlayedAt: 1700000000000 } } });
    expect(p.games.snake).toEqual({ wins: 2, stars: 2, lastPlayedAt: 1700000000000 });
  });

  it("floors a fractional lastPlayedAt rather than dropping a real instant", () => {
    const p = migrateProfile({ v: 1, games: { snake: { lastPlayedAt: 1700000000000.7 } } });
    expect(p.games.snake.lastPlayedAt).toBe(1700000000000);
  });

  it("DROPS an unusable lastPlayedAt instead of coercing it to 0", () => {
    // 0 would read as "opened at the epoch" and sort ahead of nothing forever.
    // Absent is the honest answer: this game was never opened.
    const junk: unknown[] = [
      "123",
      "2026-08-02T00:00:00Z",
      NaN,
      Infinity,
      -Infinity,
      -5,
      0,
      null,
      true,
      { at: 1 },
      [1700000000000],
    ];
    for (const value of junk) {
      const p = migrateProfile({ v: 1, games: { snake: { wins: 1, stars: 1, lastPlayedAt: value } } });
      expect(p.games.snake).toEqual({ wins: 1, stars: 1 });
      expect("lastPlayedAt" in p.games.snake).toBe(false);
    }
  });

  it("a bad lastPlayedAt does not cost the game its wins and stars", () => {
    const p = migrateProfile({ v: 1, games: { snake: { wins: 4, stars: 3, lastPlayedAt: "nope" } } });
    expect(p.games.snake.wins).toBe(4);
    expect(p.games.snake.stars).toBe(3);
  });

  it("keeps a record that carries ONLY a lastPlayedAt (opened, never won)", () => {
    const p = migrateProfile({ v: 1, games: { snake: { lastPlayedAt: 1700000000000 } } });
    expect(p.games.snake).toEqual({ wins: 0, stars: 0, lastPlayedAt: 1700000000000 });
  });

  it("round-trips lastPlayedAt through JSON, which is how it is really stored", () => {
    const raw = { v: 1, coins: 0, stars: 0, owned: [], equipped: {}, games: { snake: { wins: 1, stars: 1, lastPlayedAt: 1700000000000 } }, updatedAt: 1700000000000 };
    expect(migrateProfile(JSON.stringify(raw))).toEqual(raw);
  });

  it("never returns an object aliased to its input", () => {
    const raw = { v: 1, coins: 5, owned: ["a"], equipped: { f: "a" }, games: {} };
    const p = migrateProfile(raw);
    p.owned.push("b");
    expect(raw.owned).toEqual(["a"]);
  });
});

describe("memoryBackend", () => {
  it("reads back what it writes and returns null for absent keys", () => {
    const be = memoryBackend();
    expect(be.read("nope")).toBeNull();
    be.write("k", "v");
    expect(be.read("k")).toBe("v");
  });

  it("can be seeded so a test starts from an existing profile", () => {
    const be = memoryBackend({ [PROFILE_KEY]: '{"v":1,"coins":50}' });
    expect(migrateProfile(be.read(PROFILE_KEY)).coins).toBe(50);
  });

  it("does not share state between instances", () => {
    const a = memoryBackend();
    const b = memoryBackend();
    a.write("k", "v");
    expect(b.read("k")).toBeNull();
  });
});

describe("localStorageBackend", () => {
  // The vitest env is `node` — there is no localStorage here. That is exactly the
  // incognito / storage-disabled case, and it must degrade instead of throwing.
  it("never throws when storage is unavailable", () => {
    const be = localStorageBackend();
    expect(() => be.read(PROFILE_KEY)).not.toThrow();
    expect(() => be.write(PROFILE_KEY, "{}")).not.toThrow();
  });

  it("reports an absent value as null rather than crashing", () => {
    expect(localStorageBackend().read("ellaz:does-not-exist")).toBeNull();
  });
});
