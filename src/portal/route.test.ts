import { describe, it, expect } from "vitest";
import { parseHash, hashFor, type Route } from "./route";

// The router is the one piece of the portal that a browser can hand arbitrary
// input to (a shared link, a hand-typed fragment, a stale bookmark), so every
// branch here is about what happens when the hash is NOT what we wrote.

describe("parseHash", () => {
  it("reads the home route from every empty-ish hash", () => {
    for (const hash of ["", "#", "#/", "/"]) {
      expect(parseHash(hash)).toEqual({ kind: "home" });
    }
  });

  it("reads the world route", () => {
    expect(parseHash("#/world")).toEqual({ kind: "world" });
  });

  it("reads the juice-lab route", () => {
    expect(parseHash("#/lab")).toEqual({ kind: "lab" });
  });

  it("reads a game route with its id", () => {
    expect(parseHash("#/game/memory")).toEqual({ kind: "game", id: "memory" });
  });

  it("falls back to home for garbage", () => {
    for (const hash of [
      "#garbage",
      "#/garbage",
      "#/world/extra",
      "#/lab/extra",
      "#/labs",
      "#/games/memory",
      "#//",
      "#/game",
      "#/game/", // a game route with no id is not a game route
      "#!@$%^",
    ]) {
      expect(parseHash(hash)).toEqual({ kind: "home" });
    }
  });

  it("does not throw on a malformed percent-escape, it keeps the raw id", () => {
    // decodeURIComponent throws on this; the router must not.
    expect(parseHash("#/game/%E0%A4%A")).toEqual({ kind: "game", id: "%E0%A4%A" });
  });

  it("accepts an un-encoded id containing slashes", () => {
    expect(parseHash("#/game/deep/nested/id")).toEqual({ kind: "game", id: "deep/nested/id" });
  });
});

describe("hashFor", () => {
  it("always produces a hash fragment", () => {
    expect(hashFor({ kind: "home" }).startsWith("#")).toBe(true);
    expect(hashFor({ kind: "world" }).startsWith("#")).toBe(true);
    expect(hashFor({ kind: "game", id: "memory" }).startsWith("#/game/")).toBe(true);
  });
});

describe("round trip", () => {
  const routes: Route[] = [
    { kind: "home" },
    { kind: "world" },
    { kind: "lab" },
    { kind: "game", id: "memory" },
    { kind: "game", id: "n2048" },
    // ids the encoder has to defend: separators, unicode, spaces, and the
    // fragment character itself.
    { kind: "game", id: "deep/nested/id" },
    { kind: "game", id: "זיכרון" },
    { kind: "game", id: "two words" },
    { kind: "game", id: "a#b?c&d" },
    { kind: "game", id: "100%" },
  ];

  for (const route of routes) {
    it(`survives ${route.kind}:${"id" in route ? route.id : "-"}`, () => {
      expect(parseHash(hashFor(route))).toEqual(route);
    });
  }
});

describe("the boards route", () => {
  it("parses and round-trips", () => {
    expect(parseHash("#/boards")).toEqual({ kind: "boards" });
    expect(parseHash("#boards")).toEqual({ kind: "boards" });
    expect(hashFor({ kind: "boards" })).toBe("#/boards");
    expect(parseHash(hashFor({ kind: "boards" }))).toEqual({ kind: "boards" });
  });

  it("does not swallow near-misses into the boards screen", () => {
    // A stale link or a typo lands on home, like every other unrecognised
    // fragment — never on a screen the player did not ask for.
    for (const near of ["#/board", "#/boards/", "#/boardsx", "#/BOARDS"]) {
      expect(parseHash(near), near).toEqual({ kind: "home" });
    }
  });
});
