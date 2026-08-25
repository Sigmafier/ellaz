import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { applyWhenSafe } from "./swUpdate";

/**
 * WHEN a new build is allowed to replace the one a child is playing.
 *
 * This is defect #1 of 2026-08-25, reported as "games are being loaded then
 * after few seconds they load back again". `registerType: "autoUpdate"` installs
 * an unconditional `window.location.reload()` on the service worker's `activate`
 * - so a deploy landing mid-play threw the player out of the game, on a page
 * they had not touched.
 *
 * TWO HALVES, and only one of them is in this file. That the reload is no longer
 * unconditional is a property of vite-plugin-pwa's non-auto branch and is
 * asserted against the BUILT ARTIFACT (the `activated` handler is gone; the two
 * surviving `location.reload` calls are the `controlling` one, armed only after
 * `updateSW()` is called, and a dead `isExternal` branch). Nothing here can see
 * that. What IS testable, and is the piece that decides a child's experience, is
 * the gate we hand it.
 *
 * The DOM is stubbed rather than jsdom'd: `applyWhenSafe` touches exactly three
 * methods, the suite runs in the `node` environment for speed, and a stub makes
 * the dependency surface explicit instead of implying the whole DOM matters.
 */

type Listener = () => void;

let stageMounted = false;
let listeners: Map<string, Set<Listener>>;
let realDocument: unknown;

function fireVisibilityChange(): void {
  for (const fn of listeners.get("visibilitychange") ?? []) fn();
}

beforeEach(() => {
  stageMounted = false;
  listeners = new Map();
  realDocument = (globalThis as Record<string, unknown>).document;
  (globalThis as Record<string, unknown>).document = {
    querySelector: (sel: string) =>
      sel === ".ellaz-game-stage" && stageMounted ? {} : null,
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
  };
});

afterEach(() => {
  (globalThis as Record<string, unknown>).document = realDocument;
});

describe("a new build waits for the game to be over", () => {
  it("applies at once when no game is mounted", () => {
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });
    expect(applied).toBe(1);
  });

  it("does NOT apply while a game is mounted - the whole point", () => {
    stageMounted = true;
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });
    expect(applied).toBe(0);
  });

  it("applies once the game is gone and the tab changes visibility", () => {
    stageMounted = true;
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });
    expect(applied).toBe(0);

    stageMounted = false;
    fireVisibilityChange();
    expect(applied).toBe(1);
  });

  it("still refuses when the tab hides with the game STILL mounted", () => {
    stageMounted = true;
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });

    fireVisibilityChange(); // backgrounded mid-game: a pause, not an exit
    expect(applied).toBe(0);

    // and it is still armed for later, rather than having spent itself
    stageMounted = false;
    fireVisibilityChange();
    expect(applied).toBe(1);
  });

  it("applies exactly once however many times it is asked", () => {
    stageMounted = true;
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });

    stageMounted = false;
    fireVisibilityChange();
    fireVisibilityChange();
    fireVisibilityChange();
    expect(applied).toBe(1);
  });

  it("still applies only once if the listener cannot be removed", () => {
    // The latch and the removal are BELT AND BRACES, and a test that leaves the
    // removal intact cannot tell which one is working - both mutations survive.
    // Take the removal away and the latch is the only thing left standing.
    const doc = (globalThis as Record<string, unknown>).document as Record<string, unknown>;
    doc.removeEventListener = () => {};

    stageMounted = true;
    let applied = 0;
    applyWhenSafe(async () => {
      applied += 1;
    });

    stageMounted = false;
    fireVisibilityChange();
    fireVisibilityChange();
    expect(applied).toBe(1);
  });

  it("lets go of the document once it has applied", () => {
    applyWhenSafe(async () => {});
    // it applied immediately, so nothing of ours may still be subscribed
    expect(listeners.get("visibilitychange")?.size ?? 0).toBe(0);
  });
});

describe("the selector it keys on", () => {
  /**
   * CONTROL. The gate is one `querySelector`, so a renamed class does not fail
   * anything - it silently stops gating and the reload comes back, which is the
   * defect wearing a green suite. Read the class off the component that mounts
   * it rather than trusting the string in two places.
   */
  it("is the class GameHost actually mounts", () => {
    const host = readFileSync("src/portal/GameHost.tsx", "utf8");
    const gate = readFileSync("src/portal/swUpdate.ts", "utf8");

    const used = /querySelector\(\s*"\.([a-z-]+)"\s*\)/.exec(gate);
    expect(used, "swUpdate still gates on a class").not.toBeNull();
    // and the prose above it must not disagree with the call, since a reader
    // fixing one and not the other is exactly how this drifts
    expect(
      gate.includes(`\`.${used![1]}\``) || gate.includes(`.${used![1]} `),
      "the comment names the same class the code queries",
    ).toBe(true);

    const cls = used![1];
    expect(
      new RegExp(`className="[^"]*\\b${cls}\\b`).test(host),
      `GameHost renders .${cls}`,
    ).toBe(true);
  });
});
