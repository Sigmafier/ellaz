// `resultLineFor` in full: the pure half unit-tested directly, then the exact
// bytes a win-screen share produces once its output is handed to
// `buildGameInvite` - a personal best, a run that scored but did not beat one,
// a game with no score at all, and the whole thing in Hebrew.
//
// Labels are passed in literally, matching the real dictionary entries
// (`src/i18n/dict/en.ts` / `he.ts`) rather than importing `makeT` - the same
// split `resultLineFor` itself holds: this file has no opinion about i18n
// plumbing, it is pinning the STRINGS a reader would actually see.
import { describe, it, expect } from "vitest";
import { buildGameInvite, type GameInvite } from "@sdk/share";
import { resultLineFor } from "./shareResult";

const EN_LABELS = { best: "New best:", scored: "Score:" };
const HE_LABELS = { best: "שיא חדש:", scored: "ניקוד:" };

describe("resultLineFor - the pure half", () => {
  it("a new personal best", () => {
    expect(resultLineFor({ value: 14, unit: "moves" }, true, EN_LABELS)).toBe("New best: 14");
  });

  it("scored, but not a new best", () => {
    expect(resultLineFor({ value: 22, unit: "moves" }, false, EN_LABELS)).toBe("Score: 22");
  });

  it("a game with no score at all reports nothing", () => {
    expect(resultLineFor(undefined, false, EN_LABELS)).toBeUndefined();
  });

  it("an unrankable value reports nothing - never a NaN or an em dash in a share", () => {
    expect(resultLineFor({ value: NaN, unit: "points" }, true, EN_LABELS)).toBeUndefined();
    expect(resultLineFor({ value: Infinity, unit: "points" }, true, EN_LABELS)).toBeUndefined();
  });

  it("a millisecond run formats as seconds, the same as everywhere else on the site", () => {
    expect(resultLineFor({ value: 12_800, unit: "ms" }, true, EN_LABELS)).toBe("New best: 12.8s");
  });

  it("Hebrew labels produce Hebrew text - the digits stay Latin, as everywhere else in the app", () => {
    expect(resultLineFor({ value: 14, unit: "moves" }, true, HE_LABELS)).toBe("שיא חדש: 14");
    expect(resultLineFor({ value: 22, unit: "moves" }, false, HE_LABELS)).toBe("ניקוד: 22");
  });
});

describe("the win-screen share, exact bytes", () => {
  const mazeGame = (resultLine: string | undefined): GameInvite => ({
    gameId: "maze",
    title: "Maze",
    emoji: "🐭",
    resultLine,
  });

  it("a win with a personal best", () => {
    const resultLine = resultLineFor({ value: 14, unit: "moves" }, true, EN_LABELS);
    const payload = buildGameInvite(
      mazeGame(resultLine),
      { note: "Free in your browser. No ads, no account.", invite: "Come and play on Ellaz" },
      "https://ellaz.fun/games/maze/",
    );
    expect(payload).toBeDefined();
    expect(payload!.text).toBe(
      "🐭 Maze - New best: 14\n" +
        "Free in your browser. No ads, no account.\n" +
        "Come and play on Ellaz https://ellaz.fun/games/maze/",
    );
  });

  it("a win without a personal best", () => {
    const resultLine = resultLineFor({ value: 22, unit: "moves" }, false, EN_LABELS);
    const payload = buildGameInvite(
      mazeGame(resultLine),
      { note: "Free in your browser. No ads, no account.", invite: "Come and play on Ellaz" },
      "https://ellaz.fun/games/maze/",
    );
    expect(payload!.text).toBe(
      "🐭 Maze - Score: 22\n" +
        "Free in your browser. No ads, no account.\n" +
        "Come and play on Ellaz https://ellaz.fun/games/maze/",
    );
  });

  it("a game with no score at all - the plain invite, no dash, no dangling label", () => {
    const resultLine = resultLineFor(undefined, false, EN_LABELS);
    const coloring: GameInvite = { gameId: "coloring", title: "Coloring", emoji: "🎨", resultLine };
    const payload = buildGameInvite(
      coloring,
      { note: "Free in your browser. No ads, no account.", invite: "Come and play on Ellaz" },
      "https://ellaz.fun/games/coloring/",
    );
    expect(payload!.text).toBe(
      "🎨 Coloring\n" +
        "Free in your browser. No ads, no account.\n" +
        "Come and play on Ellaz https://ellaz.fun/games/coloring/",
    );
  });

  it("Hebrew, end to end", () => {
    const resultLine = resultLineFor({ value: 14, unit: "moves" }, true, HE_LABELS);
    const mazeHe: GameInvite = { gameId: "maze", title: "מבוך", emoji: "🐭", resultLine };
    const payload = buildGameInvite(
      mazeHe,
      { note: "חינם בדפדפן. בלי פרסומות ובלי הרשמה.", invite: "בואו לשחק גם אתם באלז" },
      "https://ellaz.fun/he/games/maze/",
    );
    expect(payload!.text).toBe(
      "🐭 מבוך - שיא חדש: 14\n" +
        "חינם בדפדפן. בלי פרסומות ובלי הרשמה.\n" +
        "בואו לשחק גם אתם באלז https://ellaz.fun/he/games/maze/",
    );
  });
});
