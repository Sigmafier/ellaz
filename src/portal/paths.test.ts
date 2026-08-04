// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { GAMES } from "./games";
import { gameHref, homeHref, worldHref } from "./paths";
import { readPageContext } from "./pageContext";
import { redirectLegacyHash } from "./legacyHash";
import { gamePath, homePath, worldPath } from "../build/routes";

/**
 * The app's link generator and the page emitter's route table are two
 * implementations of the same URLs, deliberately - `src/build/**` reads
 * `src/content`, so the app may never import it. This file is what stops the
 * copy drifting: if the two ever disagree about a single game, a card on the
 * home grid links to a page that was never written.
 */
describe("the app links to the pages the emitter actually writes", () => {
  it.each(GAMES.map((m) => m.id))("%s resolves to the same URL on both sides", (id) => {
    expect(gameHref(id, "he")).toBe(gamePath(id, "he"));
    expect(gameHref(id, "en")).toBe(gamePath(id, "en"));
  });

  it("agrees about the home and the room too", () => {
    for (const locale of ["he", "en"] as const) {
      expect(homeHref(locale)).toBe(homePath(locale));
      expect(worldHref(locale)).toBe(worldPath(locale));
    }
  });

  it("uses the game id, not the directory name", () => {
    // src/games/n2048/ has meta.id "2048".
    expect(gameHref("2048", "he")).toBe("/games/2048/");
  });
});

describe("what page am I on", () => {
  beforeEach(() => {
    document.documentElement.lang = "he";
    document.body.removeAttribute("data-page");
    document.body.removeAttribute("data-game");
    document.body.innerHTML = "";
  });

  it("is the app shell whenever #root is there", () => {
    document.body.innerHTML = '<div id="root"></div>';
    expect(readPageContext().kind).toBe("app");
  });

  it("reads the game and the language off the document", () => {
    document.documentElement.lang = "en";
    document.body.dataset.page = "game";
    document.body.dataset.game = "2048";
    document.body.innerHTML = '<div id="game-frame"></div><span id="wallet-slot"></span>';

    const ctx = readPageContext();
    expect(ctx.kind).toBe("game");
    expect(ctx.gameId).toBe("2048");
    expect(ctx.locale).toBe("en");
    expect(ctx.frame).toBeTruthy();
    expect(ctx.walletSlot).toBeTruthy();
  });

  it("recognises the room", () => {
    document.body.dataset.page = "world";
    document.body.innerHTML = '<div id="game-frame"></div>';
    expect(readPageContext().kind).toBe("world");
  });

  it("falls back to the app rather than mounting nothing", () => {
    // A half-deployed or hand-edited document with neither marker must still
    // boot something. Rendering nothing at all is the worse failure: it looks
    // exactly like a page that loaded fine.
    document.body.innerHTML = "<p>prose only</p>";
    expect(readPageContext().kind).toBe("app");
  });

  it("ignores a language it does not speak", () => {
    document.documentElement.lang = "fr";
    document.body.dataset.page = "game";
    document.body.dataset.game = "snake";
    document.body.innerHTML = '<div id="game-frame"></div>';
    expect(readPageContext().locale).toBeUndefined();
  });
});

describe("old hash links keep working", () => {
  const spy = () => {
    const calls: string[] = [];
    return { calls, hash: "", replace: (u: string) => calls.push(u) };
  };

  it("sends #/game/<id> to the real page", () => {
    const loc = { ...spy(), hash: "#/game/snake" };
    expect(redirectLegacyHash(loc)).toBe(true);
    expect(loc.calls).toEqual(["/games/snake/"]);
  });

  it("sends #/world to the room", () => {
    const loc = { ...spy(), hash: "#/world" };
    expect(redirectLegacyHash(loc)).toBe(true);
    expect(loc.calls).toEqual(["/world/"]);
  });

  it("leaves the dev lab alone", () => {
    // The Juice Lab has no page of its own, on purpose: it is scaffolding with
    // a kill date. Redirecting #/lab would send it to the home grid.
    const loc = { ...spy(), hash: "#/lab" };
    expect(redirectLegacyHash(loc)).toBe(false);
    expect(loc.calls).toEqual([]);
  });

  it("does nothing at all with no hash, or with the home hash", () => {
    for (const hash of ["", "#", "#/"]) {
      const loc = { ...spy(), hash };
      expect(redirectLegacyHash(loc)).toBe(false);
      expect(loc.calls).toEqual([]);
    }
  });

  it("does not bounce on an unrecognised fragment", () => {
    // parseHash reads anything unknown as "home". Redirecting that would send a
    // visitor from / to / forever, which is worse than the stale link.
    const loc = { ...spy(), hash: "#/nonsense" };
    expect(redirectLegacyHash(loc)).toBe(false);
  });

  it("carries the requested language through", () => {
    const loc = { ...spy(), hash: "#/game/sudoku" };
    redirectLegacyHash(loc, "en");
    expect(loc.calls).toEqual(["/en/games/sudoku/"]);
  });
});
