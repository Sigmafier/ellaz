import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  attachSelectionDismissal,
  dismissSelection,
  type SelectionLike,
} from "./selectionDismiss";

/**
 * A game board never holds selected text.
 *
 * Two halves, and neither one alone is the fix.
 *
 * CSS stops a selection from STARTING inside a game. That used to cover the
 * BOARD alone, so the chrome above it did not: measured on the built artifact
 * at 390px, a drag across sudoku's header selected `"Level\nHard\n5/6"` while
 * the identical drag across the board selected nothing.
 *
 * CSS can do nothing about a selection made on the ~900 words of prose beneath
 * the frame, which then sits highlighted across the board with its drag handles
 * on the tiles - measured in the same run, surviving a pointer down on the
 * board. That one is cleared in JS.
 *
 * Both measurements are `scripts/repro/repro-board-text-selection.mjs`, which
 * needs a browser and so cannot run here. What runs here is the stylesheet and
 * the wiring, pinned off the SHIPPED files rather than off a copy - the whole
 * property of `.ellaz-game-stage` is that it is ONE rule covering every game,
 * and a rule nothing reads is not that.
 */

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const CSS = read("../ui/global.css");
const HOST = read("./GameHost.tsx");

/**
 * The declarations of the first top-level rule whose selector list contains
 * `selector`, as a `prop -> value` map. Deliberately small: this stylesheet has
 * no nesting and this reader is not a CSS parser.
 */
export function declarationsFor(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const raw of stripped.split("}")) {
    const open = raw.indexOf("{");
    if (open === -1) continue;
    const parts = raw
      .slice(0, open)
      .split(",")
      .map((s) => s.trim());
    if (!parts.includes(selector)) continue;
    for (const decl of raw.slice(open + 1).split(";")) {
      const at = decl.indexOf(":");
      if (at === -1) continue;
      out.set(decl.slice(0, at).trim(), decl.slice(at + 1).trim());
    }
    return out;
  }
  return out;
}

/** A Selection stand-in that records whether it was cleared. */
function fakeSelection(over: Partial<SelectionLike> = {}): SelectionLike & { cleared: number } {
  return {
    isCollapsed: false,
    rangeCount: 1,
    cleared: 0,
    removeAllRanges() {
      this.cleared++;
    },
    ...over,
  } as SelectionLike & { cleared: number };
}

describe("the stylesheet makes a game unselectable", () => {
  it("reads a real stylesheet", () => {
    expect(CSS.length).toBeGreaterThan(500);
    expect(declarationsFor(CSS, "button").get("cursor")).toBe("pointer");
  });

  it("puts user-select:none on the stage, PREFIXED as well as plain", () => {
    const d = declarationsFor(CSS, ".ellaz-game-stage");
    expect(d.get("user-select"), "no user-select on .ellaz-game-stage").toBe("none");
    // iOS Safari before 17 reads only the prefixed property, and those tablets
    // are a large share of who plays here. Without this line the fix is real on
    // a desktop and absent on the devices that reported it.
    expect(d.get("-webkit-user-select"), "unprefixed only - iOS<17 still selects").toBe("none");
  });

  it("kills the long-press callout, which is a game gesture here", () => {
    // Minesweeper flags a mine with a long press. Without this, the flag lands
    // under a "Copy / Look Up" bubble.
    expect(declarationsFor(CSS, ".ellaz-game-stage").get("-webkit-touch-callout")).toBe("none");
  });

  it("leaves the play surface owning the gesture, not the selection", () => {
    // The two concerns were tangled in one rule and only ever covered the
    // board. `touch-action` stays where the board is; selection moved up to the
    // stage, which also holds the chrome the digits are in.
    expect(declarationsFor(CSS, ".ellaz-play-surface").get("touch-action")).toBe("none");
  });

  // NEGATIVE CONTROLS - a reader that always returns nothing would pass every
  // assertion above by vacuum.
  it("reports a missing declaration as missing", () => {
    expect(declarationsFor(".ellaz-game-stage{user-select:none}", ".ellaz-game-stage").get("-webkit-user-select")).toBeUndefined();
    expect(declarationsFor("", ".ellaz-game-stage").size).toBe(0);
  });

  it("finds a selector inside a comma-separated list", () => {
    const d = declarationsFor(".a,\n.ellaz-game-stage { user-select: none; }", ".ellaz-game-stage");
    expect(d.get("user-select")).toBe("none");
  });
});

describe("GameHost wires the stage", () => {
  it("reads the real component", () => {
    expect(HOST).toMatch(/createHostControls/);
  });

  it("puts the class on the MOUNT element, not on the header", () => {
    // Scoped to the element carrying `ref={mountRef}`: the class on any other
    // div here would cover the host's own bar and none of the game.
    const at = HOST.indexOf("ref={mountRef}");
    expect(at, "GameHost no longer has a mountRef element").toBeGreaterThan(-1);
    const el = HOST.slice(at, HOST.indexOf("/>", at));
    expect(el).toMatch(/className="[^"]*\bellaz-game-stage\b/);
    // The scroll behaviour was already there and is a separate concern.
    expect(el).toMatch(/className="[^"]*\bellaz-scroll\b/);
  });

  it("attaches the dismissal and detaches it again", () => {
    expect(HOST).toMatch(/attachSelectionDismissal\(el, window\)/);
    expect(HOST).toMatch(/detachSelectionDismissal\(\)/);
  });
});

describe("dismissSelection", () => {
  it("clears a real highlight", () => {
    const sel = fakeSelection();
    expect(dismissSelection(sel)).toBe(true);
    expect(sel.cleared).toBe(1);
  });

  it("leaves a bare caret alone", () => {
    // This runs on every pointerdown on the board. Clearing a collapsed
    // selection takes the caret out of whatever holds it, so an unguarded
    // version fights any text field in the app for focus on every tap.
    const sel = fakeSelection({ isCollapsed: true });
    expect(dismissSelection(sel)).toBe(false);
    expect(sel.cleared).toBe(0);
  });

  it("does not touch a selection that holds no ranges", () => {
    // Two assertions, because a `false` return is not enough on its own: a
    // version with no guard at all also returns false here, by calling
    // removeAllRanges and having the throw swallowed below. The COUNT is what
    // separates "declined" from "tried and failed".
    //
    // And `isCollapsed` throws, because some engines do with no ranges - which
    // is why the count is read first. A getter is the only way to pin that order.
    let cleared = 0;
    const sel: SelectionLike = {
      rangeCount: 0,
      get isCollapsed(): boolean {
        throw new Error("read isCollapsed with rangeCount 0");
      },
      removeAllRanges() {
        cleared++;
        throw new Error("cleared an empty selection");
      },
    };
    expect(dismissSelection(sel)).toBe(false);
    expect(cleared, "reached removeAllRanges with no ranges").toBe(0);
  });

  it("treats a null selection as a normal answer", () => {
    // `getSelection()` is null in a detached document and absent in old engines.
    expect(dismissSelection(null)).toBe(false);
    expect(dismissSelection(undefined)).toBe(false);
  });

  it("swallows a selection that refuses to clear", () => {
    const sel: SelectionLike = {
      isCollapsed: false,
      rangeCount: 1,
      removeAllRanges() {
        throw new Error("nope");
      },
    };
    // Tidying up a highlight must never reach a child as a broken game.
    expect(dismissSelection(sel)).toBe(false);
  });
});

describe("attachSelectionDismissal", () => {
  /** An EventTarget stand-in that records the options it was handed. */
  function fakeEl() {
    const calls: Array<{ type: string; fn: EventListener; opts: unknown }> = [];
    const removed: Array<{ type: string; fn: EventListener; opts: unknown }> = [];
    return {
      calls,
      removed,
      addEventListener(type: string, fn: EventListener, opts: unknown) {
        calls.push({ type, fn, opts });
      },
      removeEventListener(type: string, fn: EventListener, opts: unknown) {
        removed.push({ type, fn, opts });
      },
      fire() {
        for (const c of calls) c.fn(new Event(c.type));
      },
    } as unknown as EventTarget & {
      calls: Array<{ type: string; fn: EventListener; opts: unknown }>;
      removed: Array<{ type: string; fn: EventListener; opts: unknown }>;
      fire: () => void;
    };
  }

  it("clears on pointerdown, in capture, passively", () => {
    const el = fakeEl();
    const sel = fakeSelection();
    attachSelectionDismissal(el, { getSelection: () => sel });

    expect(el.calls).toHaveLength(1);
    expect(el.calls[0].type).toBe("pointerdown");
    // CAPTURE so the highlight is gone before the game's own handler draws the
    // frame that handler produces; PASSIVE because this never calls
    // preventDefault and every tap in the catalogue flows through it.
    expect(el.calls[0].opts).toMatchObject({ capture: true, passive: true });

    el.fire();
    expect(sel.cleared).toBe(1);
  });

  it("detaches the same listener it attached", () => {
    const el = fakeEl();
    const detach = attachSelectionDismissal(el, { getSelection: () => null });
    detach();
    expect(el.removed).toHaveLength(1);
    expect(el.removed[0].fn).toBe(el.calls[0].fn);
    // The options must match on removal or the listener stays attached for the
    // life of the tab - a leak per game opened, and it is silent.
    expect(el.removed[0].opts).toMatchObject({ capture: true });
  });

  it("survives a window with no getSelection", () => {
    const el = fakeEl();
    attachSelectionDismissal(el, {});
    expect(() => el.fire()).not.toThrow();
  });
});
