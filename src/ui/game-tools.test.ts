import { describe, it, expect, beforeEach } from "vitest";
import { hasRestart, onRestartChange, runRestart, setRestart } from "./gameTools";

/**
 * The handoff between a game and a button the build emitted.
 *
 * The one behaviour worth pinning is the EMPTY case: the page row's restart is
 * revealed by a subscriber, so a registry that forgets to announce an empty
 * slot leaves a live-looking button wired to a game that has unmounted. That is
 * the same dead control as a full-screen button on a browser with no API, and
 * it is invisible - the button draws, it just does nothing.
 */
describe("the restart slot", () => {
  beforeEach(() => setRestart(null));

  it("is empty until a game fills it, and empty again after", () => {
    expect(hasRestart()).toBe(false);
    const fn = () => {};
    setRestart(fn);
    expect(hasRestart()).toBe(true);
    setRestart(null);
    expect(hasRestart()).toBe(false);
  });

  it("runs whatever is in it, and is a no-op when empty", () => {
    let ran = 0;
    setRestart(() => ran++);
    runRestart();
    expect(ran).toBe(1);
    setRestart(null);
    expect(() => runRestart()).not.toThrow();
    expect(ran).toBe(1);
  });

  it("announces BOTH directions, so a button can hide itself again", () => {
    const seen: boolean[] = [];
    const off = onRestartChange((a) => seen.push(a));
    setRestart(() => {});
    setRestart(null);
    off();
    setRestart(() => {});
    expect(seen).toEqual([true, false]);
  });

  it("does not announce a no-op set", () => {
    const fn = () => {};
    setRestart(fn);
    const seen: boolean[] = [];
    const off = onRestartChange((a) => seen.push(a));
    setRestart(fn);
    off();
    expect(seen).toEqual([]);
  });
});
