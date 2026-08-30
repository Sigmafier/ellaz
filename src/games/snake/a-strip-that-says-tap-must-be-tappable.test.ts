import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The footer strip under Snake's board, pinned as SOURCE.
 *
 * Measured 2026-08-30 on the bundle published to itch: the strip read
 * "Tap to start", was a white rounded card with bold centred text sitting
 * directly under the board - and two taps on it did nothing. Only a tap on the
 * CANVAS started the game. On a phone that strip is the most button-looking
 * thing on the screen, and it was the one thing that was not a button.
 *
 * The strip says three things and only two are instructions: "Tap to start"
 * (ready) and "Game over - tap to play again" (over) ASK; "Buttons, swipe or
 * arrow keys" (playing) TELLS. So it is a real `<button>` while it asks and a
 * plain line of text while it tells, rather than one shape doing both.
 *
 * Source rather than render: vitest runs `environment: "node"` here and this
 * component boots Phaser inside an effect, so it cannot be mounted in this
 * suite at all - the same reason `game-chrome-pause.test.ts` reads its file.
 */

const GAME = readFileSync(new URL("./SnakeGame.tsx", import.meta.url), "utf8");
const SCENE = readFileSync(new URL("./SnakeScene.ts", import.meta.url), "utf8");

/** The `footer` prop, from `footer={` to its matching brace. */
function footerBlock(): string {
  const start = GAME.indexOf("footer={");
  expect(start, "the footer prop moved - this whole file is reading the wrong text").toBeGreaterThan(
    0,
  );
  let depth = 0;
  let i = start + "footer=".length;
  for (; i < GAME.length; i++) {
    if (GAME[i] === "{") depth++;
    else if (GAME[i] === "}" && --depth === 0) break;
  }
  return GAME.slice(start, i + 1);
}

describe("the strip that asks the player to tap", () => {
  it("is a real button, and its handler is the scene's", () => {
    const footer = footerBlock();
    expect(footer, "the strip must be a <button>, not a <div> that looks like one").toContain(
      "<button",
    );
    // Anchored on the `?.`, for the THIRD time in this file's short life:
    // `restartFromChrome()` contains `startFromChrome()`, so an unanchored
    // check passes when the button calls restart instead of start. That
    // mutation SURVIVED the first mutation run and nothing else caught it.
    expect(
      footer,
      "the button must ask the SCENE to start - the canvas is this game's single owner of input",
    ).toContain("?.startFromChrome()");
    expect(
      footer,
      "and it must be start, not restart - restart on the READY screen throws the board away",
    ).not.toContain("?.restartFromChrome()");
  });

  it("stops being a button once the words stop being an instruction", () => {
    const footer = footerBlock();
    // The playing branch is a plain line; the asking branch is the button. If
    // one shape ever served all three phases again, the button would sit under
    // "Buttons, swipe or arrow keys" - a control that does nothing, which is
    // the defect this file exists for, wearing the opposite face.
    const playingAt = footer.indexOf('status.phase === "playing"');
    const buttonAt = footer.indexOf("<button");
    expect(playingAt, "the playing phase must be branched on").toBeGreaterThan(0);
    expect(
      buttonAt,
      "the button must come AFTER the playing branch, i.e. be the not-playing arm",
    ).toBeGreaterThan(playingAt);
    // `disabled` is reserved for the genuinely impossible (CLAUDE.md). A strip
    // that is merely not an instruction is not a disabled button; it is not a
    // button.
    // Strip comments first. The prose below this strip EXPLAINS why it is not
    // disabled, so a bare substring scan reads its own justification as the
    // violation - which it did, on the first run of this file.
    const code = footer.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(code, "never disable it - render it as text instead").not.toMatch(/\bdisabled[=}]/);
  });

  it("does not fork the start logic - the strip walks the canvas's path", () => {
    // ANCHORED on the newline and indent. `restartFromChrome` CONTAINS
    // `startFromChrome` as a substring, so an unanchored indexOf finds the
    // wrong method and reads its one-line body - which it did, on the first
    // run of this file, and reported a real method as missing its calls.
    const start = SCENE.indexOf("\n  startFromChrome() {");
    expect(start, "the scene must expose startFromChrome").toBeGreaterThan(0);
    const body = SCENE.slice(start, SCENE.indexOf("\n  }", start));
    // The canvas tap unlocks audio and speech, restarts when the run is over,
    // and otherwise starts. Anything less is a second, drifting copy.
    for (const call of ["audio.unlock()", "speech.unlock()", "this.restart()", "this.startPlaying()"]) {
      expect(body, `startFromChrome must ${call} exactly as a canvas tap does`).toContain(call);
    }
    expect(body, "and it must respect the pause cover, like every other entry point").toContain(
      "this.paused",
    );
  });

  it("the chrome's view of the scene names the method it calls", () => {
    // A ref typed as the scene's public surface is the only thing standing
    // between the chrome and a method that does not exist; tsc catches a
    // missing name, nothing catches a name that was never added.
    const iface = GAME.slice(GAME.indexOf("useRef<{"), GAME.indexOf("} | null>(null)"));
    expect(iface).toContain("startFromChrome");
  });
});
