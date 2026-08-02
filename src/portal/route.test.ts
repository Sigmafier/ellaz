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

  it("reads a game route with its id", () => {
    expect(parseHash("#/game/memory")).toEqual({ kind: "game", id: "memory" });
  });

  it("falls back to home for garbage", () => {
    for (const hash of [
      "#garbage",
      "#/garbage",
      "#/world/extra",
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
