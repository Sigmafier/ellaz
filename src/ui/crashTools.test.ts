import { beforeEach, describe, expect, it, vi } from "vitest";
import { canTellAboutCrash, setCrashHandler, tellAboutCrash } from "./crashTools";

/* The registry between a crashed game and the platform.
   ===========================================================================

   The case worth pinning is the EMPTY one. A standalone bundle registers no
   handler and must never phone home, so `canTellAboutCrash()` is false there
   and the crash card offers no button. If this ever returned true by default,
   every game bundle on itch.io would show a report button that does nothing -
   which is the exact failure `a-control-that-carries-an-imperative-must-be-a-control`
   is about, shipped to somebody else's domain. */

beforeEach(() => {
  // Each test owns the slot; `setCrashHandler` replaces rather than stacks.
  setCrashHandler(() => {})();
});

describe("crashTools", () => {
  it("has no handler by default - which IS the standalone bundle's state", () => {
    expect(canTellAboutCrash()).toBe(false);
    expect(tellAboutCrash({ message: "boom" })).toBe(false);
  });

  it("hands the crash to whoever registered", () => {
    const seen: unknown[] = [];
    setCrashHandler((c) => seen.push(c));
    expect(canTellAboutCrash()).toBe(true);
    expect(tellAboutCrash({ message: "boom", stack: "at x", gameId: "snake" })).toBe(true);
    expect(seen).toEqual([{ message: "boom", stack: "at x", gameId: "snake" }]);
  });

  it("replaces rather than stacks, so a language switch does not double-fire", () => {
    const a = vi.fn();
    const b = vi.fn();
    setCrashHandler(a);
    setCrashHandler(b);
    tellAboutCrash({ message: "boom" });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it("unsubscribes back to the standalone state", () => {
    const off = setCrashHandler(() => {});
    off();
    expect(canTellAboutCrash()).toBe(false);
  });

  it("does not unsubscribe a handler that replaced it", () => {
    const off = setCrashHandler(() => {});
    const later = vi.fn();
    setCrashHandler(later);
    off(); // the stale unsubscribe must be a no-op
    expect(canTellAboutCrash()).toBe(true);
    tellAboutCrash({ message: "boom" });
    expect(later).toHaveBeenCalledOnce();
  });

  it("never throws out of an error path", () => {
    setCrashHandler(() => {
      throw new Error("the reporter itself broke");
    });
    // A throw here would replace a crash card with a blank screen, which is the
    // thing the card exists to prevent.
    expect(() => tellAboutCrash({ message: "boom" })).not.toThrow();
    expect(tellAboutCrash({ message: "boom" })).toBe(false);
  });
});
