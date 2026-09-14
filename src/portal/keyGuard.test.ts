import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { guardGameKeys, holdsKey } from "./keyGuard";

/* A fake element: `closest` answers yes for any selector list naming one of `is`. */
const el = (...is: string[]) => ({
  closest: (sel: string) => (sel.split(",").some((s) => is.includes(s.trim().split(/[[:\s]/)[0])) ? {} : null),
});
const GAME_ON_SCREEN = { top: 120, bottom: 620, height: 500 };
const H = 639;

describe("a key a game could use never scrolls the page while the game is on screen", () => {
  it("holds every key that scrolls, from the page and from a game button", () => {
    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "PageUp", "PageDown", "Home", "End"])
      expect(holdsKey(key, el("body"), GAME_ON_SCREEN, H), key).toBe(true);
    // After clicking the difficulty toggle, focus is on a button - and that is when
    // a snake player reaches for the arrows (measured: ArrowDown scrolled 40px).
    expect(holdsKey("ArrowDown", el("button"), GAME_ON_SCREEN, H)).toBe(true);
  });

  it("leaves every other key alone - a game still gets letters, digits, Enter", () => {
    for (const key of ["a", "w", "5", "Enter", "Backspace", "Tab", "Escape"])
      expect(holdsKey(key, el("body"), GAME_ON_SCREEN, H), key).toBe(false);
  });

  it("never swallows typing, and lets Space press a focused control", () => {
    expect(holdsKey(" ", el("input"), GAME_ON_SCREEN, H)).toBe(false);
    expect(holdsKey("ArrowLeft", el("textarea"), GAME_ON_SCREEN, H)).toBe(false);
    expect(holdsKey("ArrowDown", el("select"), GAME_ON_SCREEN, H)).toBe(false);
    expect(holdsKey("PageDown", el("dialog"), GAME_ON_SCREEN, H)).toBe(false);
    expect(holdsKey(" ", el("button"), GAME_ON_SCREEN, H)).toBe(false);
    expect(holdsKey(" ", el("a"), GAME_ON_SCREEN, H)).toBe(false);
  });

  it("gives a reader who scrolled down to the article their keyboard back", () => {
    expect(holdsKey("PageUp", el("body"), { top: -700, bottom: -200, height: 500 }, H)).toBe(false);
    // A sliver still showing is not "the game is on screen" either.
    expect(holdsKey("ArrowDown", el("body"), { top: -420, bottom: 80, height: 500 }, H)).toBe(false);
    // Half of it is.
    expect(holdsKey("ArrowDown", el("body"), { top: -250, bottom: 250, height: 500 }, H)).toBe(true);
    // A frame taller than the window counts against the window, not its own height.
    expect(holdsKey("ArrowDown", el("body"), { top: 0, bottom: 1400, height: 1400 }, H)).toBe(true);
  });

  it("survives a key whose target is not an element", () => {
    expect(holdsKey("ArrowDown", null, GAME_ON_SCREEN, H)).toBe(true);
  });

  it("holds a key only after every other listener on the window has seen it", () => {
    // Phaser drops an event already defaultPrevented, so a guard that runs first
    // silences snake. Simulated with the DOM's own ordering: a capture pass, then the
    // bubble listeners in registration order.
    const bubble: ((e: KeyboardEvent) => void)[] = [];
    const capture: ((e: KeyboardEvent) => void)[] = [];
    const win = {
      innerHeight: H,
      addEventListener: (_t: string, fn: (e: KeyboardEvent) => void, opt?: boolean | AddEventListenerOptions) =>
        (opt === true ? capture : bubble).push(fn),
      removeEventListener: (_t: string, fn: (e: KeyboardEvent) => void, opt?: boolean) => {
        const list = opt === true ? capture : bubble;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      },
    } as unknown as Window;
    const frame = { getBoundingClientRect: () => GAME_ON_SCREEN } as unknown as HTMLElement;
    guardGameKeys(frame, win);
    let sawPrevented: boolean | null = null;
    bubble.push((e) => (sawPrevented = e.defaultPrevented)); // a game, registered AFTER the guard
    const e = { key: "ArrowRight", target: el("body"), defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false,
      preventDefault() { e.defaultPrevented = true; } } as unknown as { -readonly [K in keyof KeyboardEvent]: KeyboardEvent[K] };
    for (const fn of [...capture]) fn(e);
    for (const fn of [...bubble]) fn(e);
    expect(sawPrevented).toBe(false); // the game saw a clean event
    expect(e.defaultPrevented).toBe(true); // and the page still did not scroll
  });

  it("is armed on every game page, and nowhere else", () => {
    const src = readFileSync(join(__dirname, "PageApp.tsx"), "utf8");
    expect(src).toMatch(/if \(ctx\.kind === "game"\) guardGameKeys\(frame\)/);
  });
});
