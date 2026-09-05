/**
 * The aim helper is the thing that makes this game playable with a finger, and
 * a player asked to be able to turn it OFF.
 *
 * Reported 2026-09-04, issue #28: "Add toggle to the helper thay shows where
 * ball will land." The helper already existed - `BubbleShooterGame.tsx` drew
 * the dashed path and the landing ring on every frame that was not mid-flight,
 * with no condition anybody could change. So this is not a new feature, it is
 * an off switch on an old one, and the interesting decisions are all about what
 * must NOT change when it is off.
 *
 * WHAT THIS FILE HOLDS, and each cell is a thing that was wrong or could be:
 *
 *   1. the guide is drawn behind a flag, not unconditionally;
 *   2. the flag DEFAULTS ON - the renderer's own comment calls the landing ring
 *      "the single thing that makes the game playable with a finger on a 390px
 *      screen", so off is a choice a player makes, never one they inherit;
 *   3. the choice survives leaving the game, through the same `ctx.storage`
 *      namespace the remembered level uses;
 *   4. it is written from the HANDLER and not from a `setState` updater - React
 *      may run an updater twice, and a preference written twice is only lucky
 *      rather than correct (`game-difficulty-and-juice-convention.md`);
 *   5. the switch is a real control: `aria-pressed`, and never `disabled`,
 *      because "you have not earned this" is not what off means here;
 *   6. exactly ONE thing is gated. The launcher still tilts toward the aim with
 *      the helper off, or turning it off stops being a challenge and starts
 *      being a game you cannot aim at all;
 *   7. every shipped locale has the word for it.
 *
 * These are SOURCE assertions. Vitest runs the node environment over
 * `src/**\/*.test.ts` with no DOM, so `BubbleShooterGame.tsx` cannot be
 * rendered and read back - they can refuse a shape and never prove a pixel.
 * The pixel half is an eyeball at 360x726, before and after.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SHIPPED_LOCALES } from "@i18n/index";

const GAME = readFileSync(new URL("./BubbleShooterGame.tsx", import.meta.url), "utf8");

describe("the aim helper has an off switch", () => {
  it("draws the guide behind a flag rather than unconditionally", () => {
    // The old line was `if (!flying && !state.dead) {`. Whatever else it grows,
    // the frame's own flag has to be part of the condition.
    const guard = /if \(!flying && !state\.dead && f\.helper\) \{/.exec(GAME);
    expect(guard, "the guide block must be gated on f.helper").not.toBeNull();
    expect(GAME).not.toContain("if (!flying && !state.dead) {");
  });

  it("carries the flag on the frame the draw call is handed", () => {
    expect(GAME).toMatch(/interface Frame \{[^}]*helper: boolean;/s);
    expect(GAME).toMatch(/helper: helperRef\.current,/);
  });

  it("defaults ON - a new player gets the helper", () => {
    expect(GAME).toMatch(/ctx\.storage\.get<boolean>\(HELPER_KEY, true\)/);
  });

  it("remembers the choice under the game's own namespace", () => {
    expect(GAME).toMatch(/const HELPER_KEY = "aimHelper";/);
    expect(GAME).toMatch(/ctx\.storage\.set\(HELPER_KEY, next\)/);
  });

  it("writes from the handler, never from a setState updater", () => {
    // `setHelper((on) => ...)` would be the updater form. React may run it
    // twice; a storage write inside it is a coin flip that usually lands right.
    // The positive half matters as much: without it this cell passes on a build
    // that has no toggle at all, which is exactly how it read before the fix.
    expect(GAME).toMatch(/setHelper\(next\)/);
    expect(GAME).not.toMatch(/setHelper\(\s*\(/);
  });

  it("stays out of the control row, so it cannot push Shoot off the screen", () => {
    // The whole reason it moved. It shipped as its own line above the aim
    // buttons and cost the footer a 44px row; at 360x726, scroll pinned to 0,
    // that put Shoot's bottom at 721 in a 726 viewport - five pixels from
    // unreachable, and past it on any phone showing an address bar. Measured on
    // the built page, both arms; the corner placement reads 677.
    const footer = GAME.slice(GAME.indexOf("footer={"), GAME.indexOf("{/* Two boxes,"));
    expect(footer).not.toContain("aria-pressed");
    expect(footer).not.toContain("toggleHelper");
    // ...and it IS somewhere: inside the board wrapper, which is the only other
    // place it can be. Without this the cell above passes on a build that lost
    // the switch entirely.
    expect(GAME).toMatch(/position: "absolute",[\s\S]{0,400}aria-pressed=\{helper\}|aria-pressed=\{helper\}[\s\S]{0,600}position: "absolute"/);
  });

  it("is placed with a LOGICAL inset, so it flips in Hebrew", () => {
    // `right: 10` would pin it to the right in an RTL app, where the launcher's
    // own furniture and the reading order both go the other way.
    expect(GAME).toMatch(/insetInlineEnd: 10,/);
    const btn = /<button\b[\s\S]*?aria-pressed=\{helper\}[\s\S]*?\/>|<button\b[\s\S]*?aria-pressed=\{helper\}[\s\S]*?<\/button>/.exec(GAME);
    expect(btn).not.toBeNull();
    expect(btn![0]).not.toMatch(/\bright: \d/);
  });

  it("names itself, because it is an icon with no words", () => {
    expect(GAME).toMatch(/aria-label=\{WORDS\[ctx\.locale\]\.helper\}/);
  });

  it("carries an edge that is visible on the BOARD in both themes", () => {
    // The fill alone cannot do it: --surface on --surface-2 measures 1.08 in
    // market and 1.14 in night, and --line is 1.18 / 1.06. --text-dim is
    // 5.85 / 7.00, so the border is what makes this read as a control.
    // `contrast.test.ts` holds those numbers; this holds that the component
    // still declares the pair they were measured for.
    expect(GAME).toMatch(/border: "2px solid var\(--text-dim\)"/);
    expect(GAME).toMatch(/background: helper \? "var\(--brand-strong\)" : "transparent"/);
    expect(GAME).toMatch(/color: helper \? "var\(--on-brand\)" : "var\(--text-dim\)"/);
  });

  it("is a real control, and never a disabled one", () => {
    expect(GAME).toMatch(/aria-pressed=\{helper\}/);
    const btn = /<button[^>]*aria-pressed=\{helper\}[\s\S]*?>/.exec(GAME);
    expect(btn, "the toggle must be a button carrying aria-pressed").not.toBeNull();
    expect(btn![0]).not.toContain("disabled");
  });

  it("gates exactly one thing, so the launcher still tilts with it off", () => {
    // Two `f.helper` reads would mean something else went dark with it. The
    // launcher block sits after the guide and must not name the flag at all.
    const reads = GAME.match(/f\.helper/g) ?? [];
    expect(reads).toHaveLength(1);
    const launcher = GAME.slice(GAME.indexOf("// The launcher:"));
    expect(launcher).not.toContain("helper");
  });

  it("has the word in every shipped locale", () => {
    // The type is `Record<Locale, {...}>`, so `tsc` already refuses a missing
    // arm - this holds the count so a locale added to SHIPPED_LOCALES without
    // its word here reds in `npm test` too, and not only in the build.
    const words = GAME.slice(GAME.indexOf("const WORDS"), GAME.indexOf("const BUBBLES"));
    const arms = words.match(/^\s{4}helper: "/gm) ?? [];
    expect(arms).toHaveLength(SHIPPED_LOCALES.length);
  });
});
